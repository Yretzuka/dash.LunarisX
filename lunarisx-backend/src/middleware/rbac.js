const { hasAtLeastRole } = require('../config/rbac');
const { recordAudit } = require('../utils/audit');

/**
 * Usage: router.get('/admin/users', requireAuth, requireRole(ROLES.ADMIN), handler)
 * Must run AFTER requireAuth so req.user is populated.
 */
function requireRole(minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!hasAtLeastRole(req.user.role, minimumRole)) {
      recordAudit({
        actor: req.user._id,
        actorLabel: req.user.username,
        action: 'access.denied',
        target: req.originalUrl,
        metadata: { requiredRole: minimumRole, actualRole: req.user.role },
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { requireRole };
