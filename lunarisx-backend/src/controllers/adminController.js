const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const FeatureFlag = require('../models/FeatureFlag');
const Key = require('../models/Key');
const { ROLES, hasAtLeastRole } = require('../config/rbac');
const { recordAudit } = require('../utils/audit');

/* ---------------------------------------------------------------- */
/* USER MANAGEMENT                                                    */
/* ---------------------------------------------------------------- */

/** GET /api/admin/users?search=&role=&page=&limit= */
async function listUsers(req, res, next) {
  try {
    const { search = '', role, page = 1, limit = 25 } = req.query;
    const query = {};
    if (search) query.username = { $regex: search, $options: 'i' };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(query);
    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/users/:id/role — body: { role } — admin cannot promote above their own rank */
async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    // Only a super admin may grant/revoke the super admin role itself.
    if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Only a super administrator can assign that role.' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    // An admin cannot edit someone of equal or higher rank than themselves.
    if (hasAtLeastRole(target.role, req.user.role) && target._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Cannot modify a user with equal or higher privileges.' });
    }

    const previousRole = target.role;
    target.role = role;
    await target.save();

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'user.role.updated',
      target: target._id.toString(),
      metadata: { previousRole, newRole: role },
      ip: req.ip,
    });

    res.json(target);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/users/:id/ban — body: { isBanned, reason } */
async function setUserBan(req, res, next) {
  try {
    const { isBanned, reason } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    if (hasAtLeastRole(target.role, req.user.role)) {
      return res.status(403).json({ error: 'Cannot ban a user with equal or higher privileges.' });
    }

    target.isBanned = Boolean(isBanned);
    target.banReason = isBanned ? reason || 'No reason provided.' : null;
    await target.save();

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: isBanned ? 'user.banned' : 'user.unbanned',
      target: target._id.toString(),
      metadata: { reason },
      ip: req.ip,
    });

    res.json(target);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/users/:id/premium — body: { isPremium, expiresAt } */
async function setUserPremium(req, res, next) {
  try {
    const { isPremium, expiresAt } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    target.isPremium = Boolean(isPremium);
    target.premiumExpiresAt = expiresAt ? new Date(expiresAt) : null;
    await target.save();

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: isPremium ? 'user.premium.granted' : 'user.premium.revoked',
      target: target._id.toString(),
      metadata: { expiresAt },
      ip: req.ip,
    });

    res.json(target);
  } catch (err) {
    next(err);
  }
}

/* ---------------------------------------------------------------- */
/* FEATURE FLAGS                                                       */
/* ---------------------------------------------------------------- */

/** GET /api/admin/feature-flags */
async function listFeatureFlags(req, res, next) {
  try {
    const flags = await FeatureFlag.find().sort({ key: 1 });
    res.json(flags);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/feature-flags/:key — body: { enabled, description } — upserts */
async function setFeatureFlag(req, res, next) {
  try {
    const { key } = req.params;
    const { enabled, description } = req.body;

    const flag = await FeatureFlag.findOneAndUpdate(
      { key },
      { enabled: Boolean(enabled), description, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'feature_flag.updated',
      target: key,
      metadata: { enabled },
      ip: req.ip,
    });

    res.json(flag);
  } catch (err) {
    next(err);
  }
}

/* ---------------------------------------------------------------- */
/* AUDIT LOGS                                                          */
/* ---------------------------------------------------------------- */

/** GET /api/admin/logs?page=&limit=&action= */
async function listAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const query = {};
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

/* ---------------------------------------------------------------- */
/* ANALYTICS (basic — extend with a real time-series store later)     */
/* ---------------------------------------------------------------- */

/** GET /api/admin/analytics/overview */
async function analyticsOverview(req, res, next) {
  try {
    const [totalUsers, premiumUsers, bannedUsers, activeKeys] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPremium: true }),
      User.countDocuments({ isBanned: true }),
      Key.countDocuments({ isRedeemed: false, revoked: false, expiresAt: { $gt: new Date() } }),
    ]);

    res.json({ totalUsers, premiumUsers, bannedUsers, activeKeys });
  } catch (err) {
    next(err);
  }
}

/* ---------------------------------------------------------------- */
/* LOADER MANAGEMENT — TODO                                            */
/* ---------------------------------------------------------------- */
// The Loader page's game/executor lists are currently static on the
// frontend. To make them admin-manageable, add Game and Executor
// models (name, icon, status, supported flag) and CRUD endpoints
// here following the same pattern as ScriptUpdate above, then have
// the frontend loader fetch from GET /api/loader/games and
// GET /api/loader/executors instead of the hardcoded list.

module.exports = {
  listUsers,
  updateUserRole,
  setUserBan,
  setUserPremium,
  listFeatureFlags,
  setFeatureFlag,
  listAuditLogs,
  analyticsOverview,
};
