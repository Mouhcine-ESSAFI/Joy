# JoyPlatform — Claude Code Context

## Project Structure

Monorepo with 3 deployable services + shared packages:

```
Joy/
├── backend/          NestJS API (port 4000) — PostgreSQL, TypeORM, Shopify webhooks, VAPID push
├── apps/admin/       Next.js admin dashboard (port 4010)
├── apps/booking/     Next.js booking PWA with push notifications (port 4020)
├── frontend/         Older Next.js frontend — being replaced by apps/
├── packages/shared/  Shared types, hooks, utils
├── Dockerfile.admin     build context: repo root (needs packages/shared/)
├── Dockerfile.booking   build context: repo root
└── docker-compose.yml
```

## Deployment: Coolify (3 separate services, same monorepo)

### Backend
- Build context: `backend/`
- Dockerfile: `backend/Dockerfile`
- Port: `4000`
- Env vars (all Runtime only):
  `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`,
  `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`,
  `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Admin
- Build context: `.` (repo root)
- Dockerfile: `Dockerfile.admin`
- Port: `4010`
- Build args (**Available at Buildtime ✅**): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BOOKING_HOST`, `NEXT_PUBLIC_ADMIN_HOST`
- Runtime env: `NODE_ENV=production`, `PORT=4010`, `HOSTNAME=0.0.0.0`, `API_URL`

### Booking
- Build context: `.` (repo root)
- Dockerfile: `Dockerfile.booking`
- Port: `4020`
- Build args (**Available at Buildtime ✅**): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BOOKING_HOST`, `NEXT_PUBLIC_ADMIN_HOST`, `NEXT_PUBLIC_VAPID_KEY`
- Runtime env: `NODE_ENV=production`, `PORT=4020`, `HOSTNAME=0.0.0.0`, `API_URL`

## Known Issues & Fixes Applied

### `nest: not found` during build
Coolify passes `NODE_ENV=production` as a build arg → `npm ci` skips devDependencies → `@nestjs/cli` not found.
**Fix:** All 3 Dockerfiles have `ENV NODE_ENV=development` in the builder stage. Runner stage keeps `production`.

### Push notifications not working after deploy
`NEXT_PUBLIC_VAPID_KEY` is baked into the JS bundle at build time. If missing as a build arg, subscriptions silently fail → 0 subscriptions in DB.
**Fix:** Set `NEXT_PUBLIC_VAPID_KEY` in Coolify booking service with **"Available at Buildtime"** checked.
After redeployment, open the production app, log in, and allow notifications to register a subscription.
If browser already denied: lock icon → Notifications → Reset to default → refresh.

### Port mismatches (fixed)
- `Dockerfile.admin`: was EXPOSE 9011 → fixed to 4010
- `Dockerfile.booking`: was EXPOSE 9010 → fixed to 4020
- `backend/Dockerfile`: was EXPOSE 3100 → fixed to 4000
- `backend/Dockerfile`: added `apk add --no-cache wget` in runner for healthcheck

## Git
`.gitignore` created at repo root. Cleaned from 10,222 → 457 tracked files.
Excluded: `.next/`, `dist/`, `node_modules/`, `.env.local`, `.DS_Store`, `backend/cookies.txt`, `backend/shopify-backups/`, `backend/test-db.js`.
