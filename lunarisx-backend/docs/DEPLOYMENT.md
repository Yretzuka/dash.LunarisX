# Deployment Guide

## Before you deploy

- [ ] Set `NODE_ENV=production`
- [ ] Replace every placeholder secret in `.env` with real, strong,
      unique random values (`openssl rand -hex 64`)
- [ ] Point `MONGODB_URI` at your production database (Atlas recommended
      for managed backups/failover)
- [ ] Update `APP_URL` and `CLIENT_URL` to your real domain
- [ ] Update `DISCORD_CALLBACK_URL` / `GOOGLE_CALLBACK_URL` to your real
      domain, and add those exact URLs to the Discord/Google OAuth app
      configs (both the old localhost ones and the new production ones
      can coexist there while you test)
- [ ] Put the app behind HTTPS — cookies are marked `secure` in
      production, so they will not be set at all over plain HTTP
- [ ] Confirm `app.set('trust proxy', 1)` matches your actual proxy setup
      (this affects `req.ip` used in rate limiting and audit logs)

## Running the process

Use a process manager so the app restarts on crash/reboot. Example with
PM2:

```bash
npm install -g pm2
pm2 start server.js --name lunarisx-backend
pm2 save
pm2 startup
```

## Reverse proxy (Nginx example)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database

- Enable MongoDB authentication in production — don't run an
  unauthenticated instance reachable from the internet.
- Set up regular backups (`mongodump` on a schedule, or your managed
  provider's built-in backups).
- The models already have the indexes that matter (`discordId`,
  `googleId`, `role`, `AuditLog.createdAt`) — no manual index setup
  needed beyond what Mongoose creates on first connection.

## Logging

`src/utils/logger.js` (Winston) writes to `logs/error.log` and
`logs/combined.log` in the working directory, plus stdout. In most
hosting setups you'll want to either:

- mount `logs/` to persistent storage, or
- ship stdout to your platform's log aggregator and disable the file
  transports if disk persistence isn't available (e.g. some PaaS/container
  platforms have ephemeral filesystems)

## Zero-downtime updates

With PM2:

```bash
git pull
npm install
pm2 reload lunarisx-backend
```

## Rolling back a bad deploy

Because all state lives in MongoDB (not in the process), rolling back is
just deploying the previous code revision and restarting — no data
migration is required unless the previous revision predates a schema
change you've since made.

## What is NOT handled by this backend yet

- No built-in CDN/asset pipeline for `public/` — for high traffic, put a
  CDN in front of static assets.
- No horizontal-scaling session store — JWT cookies are stateless so this
  isn't required for auth, but if you add server-side session data later,
  you'll need a shared store (e.g. Redis) across instances.
- No automated database migrations tool — schema changes to existing
  collections should be scripted and reviewed by hand for now.
