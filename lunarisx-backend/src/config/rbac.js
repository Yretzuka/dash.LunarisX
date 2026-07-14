/**
 * RBAC role hierarchy for LunarisX.
 *
 * Roles are ordered from lowest to highest privilege. `ROLE_RANK` lets
 * middleware do a single numeric comparison instead of hardcoding role
 * names everywhere.
 *
 * Super Administrators are identified by Discord ID via the
 * SUPER_ADMIN_DISCORD_IDS env var (comma-separated) and are promoted
 * automatically the moment they log in — see authController.upsertUserFromDiscord.
 * There is no hidden/undocumented backdoor: this file is the single,
 * auditable source of truth for who gets that role, and every promotion
 * is written to the audit log.
 */

const ROLES = Object.freeze({
  USER: 'user',
  PREMIUM: 'premium',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superadmin',
});

const ROLE_RANK = Object.freeze({
  [ROLES.USER]: 0,
  [ROLES.PREMIUM]: 1,
  [ROLES.MODERATOR]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.SUPER_ADMIN]: 4,
});

function getSuperAdminDiscordIds() {
  return (process.env.SUPER_ADMIN_DISCORD_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function isSuperAdminDiscordId(discordId) {
  return getSuperAdminDiscordIds().includes(String(discordId));
}

function hasAtLeastRole(userRole, requiredRole) {
  const userRank = ROLE_RANK[userRole] ?? -1;
  const requiredRank = ROLE_RANK[requiredRole] ?? Infinity;
  return userRank >= requiredRank;
}

module.exports = {
  ROLES,
  ROLE_RANK,
  getSuperAdminDiscordIds,
  isSuperAdminDiscordId,
  hasAtLeastRole,
};
