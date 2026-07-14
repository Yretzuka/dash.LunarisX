# Folder Structure

```
lunarisx-backend/
├── server.js                        # App bootstrap — middleware order, route mounting, DB connect + listen
├── package.json
├── .env.example                     # Copy to .env and fill in — see ENV_SETUP.md
├── .gitignore
│
├── public/
│   └── index.html                   # The LunarisX dashboard frontend (static, served as-is)
│
├── src/
│   ├── config/
│   │   ├── db.js                    # Mongoose connection
│   │   ├── passport.js              # Discord + Google Passport strategies
│   │   └── rbac.js                  # Role list, role ranking, super-admin ID matching
│   │
│   ├── models/
│   │   ├── User.js                  # Discord/Google identity, role, premium, key, ban state
│   │   ├── Key.js                   # Key System keys (backend logic kept working; page is Coming Soon)
│   │   ├── ScriptUpdate.js          # Script Updates / changelog entries
│   │   ├── AuditLog.js              # Every sensitive action, who did it, when, from where
│   │   └── FeatureFlag.js           # Generic on/off switches for future features
│   │
│   ├── controllers/
│   │   ├── authController.js        # OAuth upsert logic, super-admin auto-promotion, session issuing
│   │   ├── adminController.js       # User mgmt, feature flags, audit logs, analytics
│   │   ├── keyController.js         # generate / redeem / status
│   │   └── scriptController.js      # public list + admin CRUD for changelog entries
│   │
│   ├── routes/
│   │   ├── authRoutes.js            # /api/auth/* — OAuth start/callback, /me, /logout
│   │   ├── adminRoutes.js           # /api/admin/* — everything gated behind requireRole(ADMIN)
│   │   ├── keyRoutes.js             # /api/keys/*
│   │   ├── scriptRoutes.js          # /api/scripts/* (public)
│   │   └── userRoutes.js            # /api/users/* (current-user profile)
│   │
│   ├── middleware/
│   │   ├── auth.js                  # requireAuth / attachUserIfPresent — reads the JWT cookie
│   │   ├── rbac.js                  # requireRole(minimumRole) — must run after requireAuth
│   │   ├── security.js              # Helmet/CSP, rate limiters, CSRF, sanitizers — single source of truth
│   │   ├── validate.js              # express-validator result handler
│   │   └── errorHandler.js          # notFound + centralized errorHandler
│   │
│   └── utils/
│       ├── jwt.js                   # sign/verify helpers
│       ├── audit.js                 # recordAudit() — used by every sensitive controller action
│       ├── logger.js                # Winston logger (console + file transports)
│       └── seedAdmins.js            # optional: pre-create super admin placeholder users
│
└── docs/
    ├── README.md                    # Architecture overview, what's implemented, what's TODO
    ├── INSTALLATION.md              # Local setup, step by step
    ├── DEPLOYMENT.md                # Production checklist, Nginx example, logging, rollbacks
    ├── FOLDER_STRUCTURE.md          # This file
    └── ENV_SETUP.md                 # Line-by-line explanation of every .env variable
```

## Request flow, end to end

1. Browser hits `/` → `server.js` serves `public/index.html`.
2. Frontend JS calls `GET /api/auth/me` on load to check for a session.
   No session → login screen stays visible.
3. User clicks "Continue with Discord" → full-page navigation to
   `GET /api/auth/discord` → `passport-discord` redirects to Discord.
4. Discord redirects back to `GET /api/auth/discord/callback` →
   `authController.upsertUserFromDiscord` finds-or-creates the `User`,
   checks it against `SUPER_ADMIN_DISCORD_IDS`, then
   `issueSessionAndRedirect` sets the JWT cookie and redirects to
   `/dashboard`.
5. Dashboard loads → `GET /api/auth/me` now succeeds → frontend shows
   the dashboard shell with the real username.
6. Any `/api/admin/*` call now carries the session cookie automatically
   (browser does this) → `requireAuth` loads `req.user` → `requireRole`
   checks their role → controller runs → `recordAudit()` logs it.
