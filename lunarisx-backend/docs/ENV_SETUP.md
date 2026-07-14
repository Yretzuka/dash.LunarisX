# Environment Variables Reference

Copy `.env.example` to `.env` before running the app. Every variable
below is read somewhere in `src/` — none are optional unless noted.

| Variable | Used in | Notes |
|---|---|---|
| `NODE_ENV` | `server.js`, `security.js` | `development` or `production`. Controls cookie `secure` flag and log verbosity. |
| `PORT` | `server.js` | Port the Express app listens on. |
| `APP_URL` | (reserved for future use, e.g. building absolute links) | Your backend's own public URL. |
| `CLIENT_URL` | `authController.js`, CORS config | Where OAuth redirects send the browser after login, and the allowed CORS origin. In this project the frontend is served by the same app, so this is usually the same as `APP_URL`. |
| `MONGODB_URI` | `config/db.js` | Full MongoDB connection string. **Required** — the app exits on boot if missing. |
| `JWT_SECRET` | `utils/jwt.js` | Signs the session JWT. Generate with `openssl rand -hex 64`. Rotating this logs everyone out. |
| `JWT_EXPIRES_IN` | `utils/jwt.js` | Session lifetime, e.g. `7d`. |
| `COOKIE_SECRET` | `server.js` (`cookie-parser`) | Used to sign non-JWT cookies. Generate separately from `JWT_SECRET`. |
| `SESSION_COOKIE_NAME` | `authController.js`, `middleware/auth.js` | Name of the cookie holding the JWT. Change only if it collides with something else on your domain. |
| `CSRF_SECRET` | `middleware/security.js` | Secret for the double-submit CSRF cookie. Generate separately. |
| `DISCORD_CLIENT_ID` | `config/passport.js` | From the project spec — public, not a secret. |
| `DISCORD_CLIENT_SECRET` | `config/passport.js` | **You must supply this.** Never commit it. From your Discord application's OAuth2 page. |
| `DISCORD_CALLBACK_URL` | `config/passport.js` | Must exactly match a redirect URL registered in your Discord app. |
| `GOOGLE_CLIENT_ID` | `config/passport.js` | From the project spec — public, not a secret. |
| `GOOGLE_CLIENT_SECRET` | `config/passport.js` | **You must supply this.** Never commit it. From Google Cloud Console. |
| `GOOGLE_CALLBACK_URL` | `config/passport.js` | Must exactly match an authorized redirect URI in your Google OAuth client. |
| `SUPER_ADMIN_DISCORD_IDS` | `config/rbac.js` | Comma-separated Discord user IDs. Anyone logging in with one of these Discord accounts is auto-promoted to `superadmin`. This is the only place that role is granted from — see `docs/README.md` → RBAC section. |
| `RATE_LIMIT_WINDOW_MS` | `middleware/security.js` | Rate limit window for general `/api` traffic, in milliseconds. |
| `RATE_LIMIT_MAX` | `middleware/security.js` | Max requests per window per IP for general `/api` traffic. Auth endpoints use a separate, stricter limiter hardcoded to 20 requests / 15 min — see `authLimiter` in `middleware/security.js` if you need to change that. |

## Generating secrets

```bash
openssl rand -hex 64
```

Run this three times for `JWT_SECRET`, `COOKIE_SECRET`, and
`CSRF_SECRET` — use a different value for each.

## Never do this

- Never commit `.env` (it's in `.gitignore` already — don't remove that line)
- Never put `DISCORD_CLIENT_SECRET` / `GOOGLE_CLIENT_SECRET` anywhere in
  `public/` or in frontend JavaScript — they belong only in the backend
  process's environment
- Never reuse `JWT_SECRET` as `CSRF_SECRET` or vice versa
