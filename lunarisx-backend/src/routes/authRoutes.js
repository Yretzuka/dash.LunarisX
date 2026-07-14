const express = require('express');
const passport = require('passport');
const { issueSessionAndRedirect, logout, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

// ---- Discord ----
router.get(
  '/discord',
  authLimiter,
  passport.authenticate('discord', { session: false })
);

router.get(
  '/discord/callback',
  authLimiter,
  passport.authenticate('discord', { session: false, failureRedirect: '/login?error=discord' }),
  (req, res) => issueSessionAndRedirect(req, res, req.user)
);

// ---- Google ----
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { session: false })
);

router.get(
  '/google/callback',
  authLimiter,
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google' }),
  (req, res) => issueSessionAndRedirect(req, res, req.user)
);

// ---- Session ----
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
