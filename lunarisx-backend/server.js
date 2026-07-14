require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const connectDB = require('./src/config/db');
const configurePassport = require('./src/config/passport');
const logger = require('./src/utils/logger');

const {
  helmetMiddleware,
  apiLimiter,
  mongoSanitize,
  xssClean,
  hpp,
  csrfProtection,
  generateCsrfToken,
} = require('./src/middleware/security');

const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const keyRoutes = require('./src/routes/keyRoutes');
const scriptRoutes = require('./src/routes/scriptRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

/* ---------------------------------------------------------------- */
/* CORE MIDDLEWARE                                                     */
/* ---------------------------------------------------------------- */
app.set('trust proxy', 1); // required for correct req.ip / secure cookies behind a reverse proxy
app.use(helmetMiddleware);
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize);
app.use(xssClean);
app.use(hpp);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));
app.use('/api', apiLimiter);

configurePassport();
const passport = require('passport');
app.use(passport.initialize());

/* ---------------------------------------------------------------- */
/* CSRF                                                                 */
/* ---------------------------------------------------------------- */
// CSRF applies to state-changing API routes. OAuth redirects and GETs
// are exempt (a browser navigation cannot carry a custom header anyway).
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});
app.use('/api/admin', csrfProtection);
app.use('/api/keys', csrfProtection);
app.use('/api/auth', csrfProtection);

/* ---------------------------------------------------------------- */
/* ROUTES                                                               */
/* ---------------------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

/* ---------------------------------------------------------------- */
/* STATIC FRONTEND                                                      */
/* ---------------------------------------------------------------- */
// The existing LunarisX dashboard (index.html) is served as-is from
// /public. It is untouched apart from the Premium and Key System
// pages, which now render as "Coming Soon" — see docs/README.md.
app.use(express.static(path.join(__dirname, 'public')));

app.get(['/', '/dashboard', '/login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ---------------------------------------------------------------- */
/* ERROR HANDLING                                                       */
/* ---------------------------------------------------------------- */
app.use(notFound);
app.use(errorHandler);

/* ---------------------------------------------------------------- */
/* BOOT                                                                 */
/* ---------------------------------------------------------------- */
const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`LunarisX backend listening on port ${PORT}`);
  });
}

start();

module.exports = app;
