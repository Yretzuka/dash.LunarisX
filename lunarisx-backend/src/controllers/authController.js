const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { isSuperAdminDiscordId, ROLES } = require('../config/rbac');
const { recordAudit } = require('../utils/audit');

/**
 * Finds or creates a user from a Discord OAuth profile.
 * If the Discord ID is in SUPER_ADMIN_DISCORD_IDS, the account is
 * promoted to superadmin — this is the ONLY place that role is ever
 * granted automatically, and every promotion is written to the audit log.
 */
async function upsertUserFromDiscord(profile) {
  const avatarUrl = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    : null;

  let user = await User.findOne({ discordId: profile.id });
  const wasNew = !user;

  if (!user) {
    user = new User({
      discordId: profile.id,
      username: `${profile.username}${profile.discriminator && profile.discriminator !== '0' ? '#' + profile.discriminator : ''}`,
      email: profile.email || undefined,
      avatarUrl,
    });
  } else {
    user.username = `${profile.username}${profile.discriminator && profile.discriminator !== '0' ? '#' + profile.discriminator : ''}`;
    user.avatarUrl = avatarUrl;
    if (profile.email) user.email = profile.email;
  }

  if (isSuperAdminDiscordId(profile.id) && user.role !== ROLES.SUPER_ADMIN) {
    const previousRole = user.role;
    user.role = ROLES.SUPER_ADMIN;
    await user.save();
    await recordAudit({
      actor: user._id,
      actorLabel: user.username,
      action: 'user.role.auto_promoted_superadmin',
      target: user._id.toString(),
      metadata: { previousRole, discordId: profile.id },
    });
  } else {
    await user.save();
  }

  user.lastLoginAt = new Date();
  await user.save();

  if (wasNew) {
    await recordAudit({
      actor: user._id,
      actorLabel: user.username,
      action: 'user.created',
      target: user._id.toString(),
      metadata: { provider: 'discord' },
    });
  }

  return user;
}

/** Finds or creates a user from a Google OAuth profile. */
async function upsertUserFromGoogle(profile) {
  let user = await User.findOne({ googleId: profile.id });
  const wasNew = !user;

  if (!user) {
    // Link by email if a Discord-created account already exists with it.
    const existingByEmail = profile.emails?.[0]?.value
      ? await User.findOne({ email: profile.emails[0].value.toLowerCase() })
      : null;

    if (existingByEmail) {
      user = existingByEmail;
      user.googleId = profile.id;
    } else {
      user = new User({
        googleId: profile.id,
        username: profile.displayName || profile.emails?.[0]?.value || `user_${profile.id}`,
        email: profile.emails?.[0]?.value?.toLowerCase(),
        avatarUrl: profile.photos?.[0]?.value || null,
      });
    }
  }

  user.lastLoginAt = new Date();
  await user.save();

  if (wasNew) {
    await recordAudit({
      actor: user._id,
      actorLabel: user.username,
      action: 'user.created',
      target: user._id.toString(),
      metadata: { provider: 'google' },
    });
  }

  return user;
}

/** Issues the JWT session cookie for an authenticated user and redirects to the dashboard. */
function issueSessionAndRedirect(req, res, user) {
  const token = signToken(user);
  const cookieName = process.env.SESSION_COOKIE_NAME || 'lunarisx_session';

  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  user.lastLoginIp = req.ip;
  user.save().catch(() => {});

  res.redirect(`${process.env.CLIENT_URL}/dashboard`);
}

function logout(req, res) {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'lunarisx_session';
  res.clearCookie(cookieName);
  res.json({ ok: true });
}

function me(req, res) {
  res.json({
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    avatarUrl: req.user.avatarUrl,
    role: req.user.role,
    isPremium: req.user.isPremium,
  });
}

module.exports = {
  upsertUserFromDiscord,
  upsertUserFromGoogle,
  issueSessionAndRedirect,
  logout,
  me,
};
