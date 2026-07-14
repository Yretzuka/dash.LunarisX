const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Records an audit trail entry. Never throws — a logging failure
 * should never block the request that triggered it, but it is
 * surfaced via the app logger so it isn't silently lost.
 */
async function recordAudit({ actor = null, actorLabel = 'system', action, target = null, metadata = {}, ip = null }) {
  try {
    await AuditLog.create({ actor, actorLabel, action, target, metadata, ip });
  } catch (err) {
    logger.error('Failed to write audit log', { action, error: err.message });
  }
}

module.exports = { recordAudit };
