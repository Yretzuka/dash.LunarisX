# Installation Guide

## Prerequisites

- Node.js 18+ and npm
- A MongoDB instance (local install, Docker, or MongoDB Atlas)
- A Discord application (for Discord login) — https://discord.com/developers/applications
- A Google Cloud OAuth client (for Google login) — https://console.cloud.google.com/apis/credentials

## 1. Install dependencies

```bash
cd lunarisx-backend
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in:

- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET`, `COOKIE_SECRET`, `CSRF_SECRET` — generate each with:
  ```bash
  openssl rand -hex 64
  ```
  Do not reuse one value for multiple secrets.
- `DISCORD_CLIENT_SECRET` — from your Discord application's OAuth2 page
  (the Client ID is already filled in from the project spec)
- `GOOGLE_CLIENT_SECRET` — from your Google Cloud OAuth client
  (the Client ID is already filled in from the project spec)

`SUPER_ADMIN_DISCORD_IDS` is already set to the two IDs from the project
spec. Add or remove IDs there (comma-separated) if that list changes —
no code edit required.

See `docs/ENV_SETUP.md` for a line-by-line explanation of every variable.

## 3. Configure your OAuth apps

**Discord** (developer portal → your app → OAuth2 → General):
- Add redirect URL: `http://localhost:3000/api/auth/discord/callback`
- Scopes used: `identify`, `email`

**Google** (Cloud Console → APIs & Services → Credentials → your OAuth client):
- Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
- Scopes used: `profile`, `email`

Update `DISCORD_CALLBACK_URL` / `GOOGLE_CALLBACK_URL` in `.env` to match
if you're running on a different host/port.

## 4. Start MongoDB

If running locally with Docker:

```bash
docker run -d --name lunarisx-mongo -p 27017:27017 mongo:7
```

Or point `MONGODB_URI` at a MongoDB Atlas cluster instead.

## 5. Run the server

```bash
npm run dev     # nodemon, auto-restarts on file changes
# or
npm start       # plain node
```

The dashboard is served at `http://localhost:3000`. The login screen will
show; clicking "Continue with Discord" or "Continue with Google" starts
the real OAuth flow.

## 6. (Optional) Pre-seed super admins

Not required — logging in with a configured super admin Discord account
promotes it automatically. If you want the account to exist in the
database (visible in `/api/admin/users`) before that first login:

```bash
npm run seed:admins
```

## Verifying it works

- `GET http://localhost:3000/api/health` → `{"ok":true,...}`
- Log in with Discord/Google → you should land on `/dashboard` with a
  session cookie set
- `GET http://localhost:3000/api/auth/me` (with the session cookie) →
  returns your profile JSON
- If your Discord ID is in `SUPER_ADMIN_DISCORD_IDS`, `GET /api/admin/users`
  should now succeed for you
