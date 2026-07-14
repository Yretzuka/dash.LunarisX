const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Requires a valid session. Reads the JWT from the httpOnly cookie
 * (never from a header/localStorage — keeps it out of reach of XSS).
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[process.env.SESSION_COOKIE_NAME || 'lunarisx_session'];
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

/** Populates req.user if a valid session exists, but never blocks the request. */
async function attachUserIfPresent(req, res, next) {
  try {
    const token = req.cookies?.[process.env.SESSION_COOKIE_NAME || 'lunarisx_session'];
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user && !user.isBanned) req.user = user;
    next();
  } catch (err) {
    next();
  }
}

module.exports = { requireAuth, attachUserIfPresent };
