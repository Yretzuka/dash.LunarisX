const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../config/rbac');
const validate = require('../middleware/validate');
const admin = require('../controllers/adminController');
const scripts = require('../controllers/scriptController');

const router = express.Router();

// Every route below requires at least an authenticated admin.
router.use(requireAuth, requireRole(ROLES.ADMIN));

/* ---- User management ---- */
router.get('/users', admin.listUsers);
router.patch(
  '/users/:id/role',
  param('id').isMongoId(),
  body('role').isIn(Object.values(ROLES)),
  validate,
  admin.updateUserRole
);
router.patch(
  '/users/:id/ban',
  param('id').isMongoId(),
  body('isBanned').isBoolean(),
  validate,
  admin.setUserBan
);
router.patch(
  '/users/:id/premium',
  param('id').isMongoId(),
  body('isPremium').isBoolean(),
  validate,
  admin.setUserPremium
);

/* ---- Script update management ---- */
router.post(
  '/scripts',
  body('version').isString().trim().notEmpty(),
  body('notes').isArray(),
  validate,
  scripts.createUpdate
);
router.patch('/scripts/:id', param('id').isMongoId(), validate, scripts.updateUpdate);
router.delete('/scripts/:id', param('id').isMongoId(), validate, scripts.deleteUpdate);

/* ---- Feature flags ---- */
router.get('/feature-flags', admin.listFeatureFlags);
router.put(
  '/feature-flags/:key',
  param('key').isString().trim().notEmpty(),
  body('enabled').isBoolean(),
  validate,
  admin.setFeatureFlag
);

/* ---- Audit logs — super admin only ---- */
router.get('/logs', requireRole(ROLES.SUPER_ADMIN), admin.listAuditLogs);

/* ---- Analytics ---- */
router.get('/analytics/overview', admin.analyticsOverview);

module.exports = router;
