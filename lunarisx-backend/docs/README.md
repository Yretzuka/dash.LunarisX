# LunarisX Dashboard — Backend

Node.js/Express backend for the LunarisX dashboard: Discord + Google OAuth2
login, JWT sessions, role-based access control (RBAC), an admin API, and the
security hardening required to run this in production.

The existing frontend (`public/index.html`) has **not** been redesigned or
downgraded — it's the same dashboard you already had, with two changes:

1. The **Premium** and **Key System** pages now render a "Coming Soon" state
   (per the current project requirements). Every other page — Main, Loader,
   Script Updates, Settings — is untouched.
2. The Discord/Google login buttons now navigate to real OAuth endpoints
   instead of a fake client-side transition, and the dashboard checks for a
   real session on load.

The Key System's backend logic (generate/redeem/status) is fully implemented
and working — only its *page* is hidden. It can be reconnected any time by
restoring the old page markup and pointing it at `/api/keys/*`.

## Architecture

MVC-ish layout on top of Express:

```
server.js              → app bootstrap: middleware order, route mounting
src/config/             → DB connection, Passport strategies, RBAC roles
src/models/              → Mongoose schemas (User, Key, ScriptUpdate, AuditLog, FeatureFlag)
src/controllers/         → business logic, one file per resource
src/routes/               → thin route definitions, wire controllers to middleware
src/middleware/           → auth, RBAC, security stack, validation, error handling
src/utils/                 → JWT helpers, audit log writer, logger, admin seed script
public/                    → the LunarisX frontend (static)
```

See `docs/FOLDER_STRUCTURE.md` for the full file tree with descriptions.

## Authentication

- **Discord OAuth2** and **Google OAuth2** via Passport strategies
  (`src/config/passport.js`).
- On successful login, the user is upserted in MongoDB and a **JWT** is
  issued as an **httpOnly, sameSite=lax, secure-in-production cookie**. The
  token is never exposed to client-side JavaScript — this is deliberate,
  it keeps a stolen-via-XSS scenario from also stealing the session.
- `GET /api/auth/me` is used by the frontend on page load to check for an
  existing session and skip the login screen if one is valid.

## RBAC (Role-Based Access Control)

Roles, lowest to highest: `user → premium → moderator → admin → superadmin`.

The two Discord IDs from the project spec are configured via
`SUPER_ADMIN_DISCORD_IDS` in `.env` (see `.env.example`) — **not**
hardcoded in source. The very first time either of those Discord accounts
logs in, `authController.upsertUserFromDiscord` promotes them to
`superadmin` automatically, and that promotion is written to the audit
log (`user.role.auto_promoted_superadmin`). That is the *only* code path
that grants the role — there is no separate hidden admin entry point.

Everything under `/api/admin/*` requires `admin` or higher
(`src/middleware/rbac.js`). Audit log viewing additionally requires
`superadmin`. An admin can never modify or ban another user of equal or
higher rank than themselves, and only a `superadmin` can grant the
`superadmin` role to someone else.

## Admin capabilities implemented

- **User management** — list/search, change role, ban/unban, grant/revoke premium
- **Script Updates** — create/edit/delete changelog entries (backs the
  public Script Updates page)
- **Feature flags** — generic on/off switches for future use (e.g.
  `key_system_enabled`, `premium_enabled`) so Key System/Premium can be
  turned back on from the admin panel instead of a code change
- **Audit logs** — every sensitive action (role changes, bans, key
  generation, feature flag changes, access-denied attempts) is recorded
  with actor, target, metadata, timestamp, and IP
- **Analytics overview** — basic counts (total users, premium users,
  banned users, active keys)

**Not implemented yet (see code comments for exact TODOs):**
- Loader game/executor management — the Loader page's game and executor
  lists are still static in the frontend. `adminController.js` has a TODO
  block describing the Game/Executor models and endpoints needed to make
  them admin-manageable.
- A real analytics time-series store (current overview is point-in-time
  counts only).
- Account deletion (the Danger Zone button is wired to show a clear "not
  implemented" message rather than silently doing nothing).
- Payment processing for Premium (there's no pricing page right now since
  Premium shows Coming Soon).

## Security checklist

| Requirement | Implementation |
|---|---|
| Helmet | `src/middleware/security.js` — `helmetMiddleware` |
| CSP | Configured inside the same Helmet call, `'self'` by default |
| Rate limiting | `apiLimiter` (all `/api`) + stricter `authLimiter` on auth routes |
| Input validation | `express-validator` chains + `validate` middleware |
| CSRF protection | `csrf-csrf` double-submit cookie, applied to `/api/admin`, `/api/keys`, `/api/auth` |
| XSS protection | `xss-clean` + CSP + httpOnly cookies (JWT never touches `localStorage`) |
| NoSQL injection | `express-mongo-sanitize` |
| HTTP param pollution | `hpp` |
| Secure cookies | `httpOnly`, `sameSite=lax`, `secure` in production |
| Audit logs | `AuditLog` model + `recordAudit()` helper, called from every sensitive controller action |

Read `docs/ENV_SETUP.md` before running this anywhere — several of the
values above (`JWT_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET`) must be strong
random values you generate yourself, not left as the placeholder text.

## Getting started

See `docs/INSTALLATION.md` for local setup and `docs/DEPLOYMENT.md` for
production deployment notes.
