# Homecare

Scheduling and time-clock app for homecare agencies. Admin web dashboard + caregiver mobile view. Built with Express, React, Prisma, and Better-auth on Neon Postgres.

**Live demo:** <https://caregiving.ateball.com>

- Admin — `admin@villagecaregiving.com` / `admin1234`
- Caregiver — `marcus@example.com` / `caregiver1234`

## Stack

Express + TypeScript on the backend, Vite + React + Tailwind on the frontend. Prisma ORM against Neon Postgres. Better-auth handles sessions (email/password, HttpOnly cookies, DB-stored). SSE for real-time messaging — no WebSocket infrastructure needed. Single Caddy reverse proxy serves the API and static bundle from one origin, so no CORS config.

## Quick start

```sh
cp api/.env.example api/.env
# DATABASE_URL=postgresql://...  (Neon connection string)
# BETTER_AUTH_SECRET=<openssl rand -base64 32>

cd api && npm install && npx prisma migrate dev --name init && npm run seed
cd ../web && npm install
./dev.sh            # api on :3000, web on :5173 (proxies /api)
```

`npm run seed` creates demo accounts and sample shifts. Credentials are printed to stdout.

## Routes

**Admin** (`/admin/*`) — calendar (week view), clients (CRUD), caregivers (CRUD, new caregiver generates temp password), shift detail (clock in/out times, GPS, geofence flag, tasks, signature), timesheets (filter + CSV export), messages.

**Caregiver** (`/caregiver/*`) — today's shifts, upcoming, history, shift detail with clock in/out + task checklist + client signature pad, messages.

**Guards** — `AuthGate` component redirects unauthenticated users to `/login`. Role-based routing sends admins to `/admin/today` and caregivers to `/caregiver/today`.

## Design decisions

**No client login.** The caregiver hands their phone to the client for signature at end of visit. This matches how homecare EVV systems work (AlayaCare, HHAeXchange, AxisCare) — the client population is elderly, often without smartphones. The caregiver's device is the source of truth for the visit record.

**Mobile web, not React Native.** Geolocation, canvas (signature), and camera all work in modern mobile browsers. One codebase serves both admin and caregiver views via role-gated routes. Installable to phone home screen via webmanifest.

**SSE, not WebSockets.** Messaging only needs server-to-client push — client sends via POST, server broadcasts to subscribers via a persistent EventSource stream. One `text/event-stream` endpoint per user, in-memory subscriber map. Right-sized.

**Geofence is a warning, not a hard block.** Clock-in checks GPS against the client's stored coordinates (150m Haversine radius). Outside the radius sets a flag visible to admin — doesn't prevent clock-in. A caregiver parked across the street shouldn't be locked out.

**Public sign-up disabled.** Only admins can create caregiver accounts. Server generates a one-time temp password shown in the admin UI. No SMTP dependency.

## Schema

```
User (Better-auth)   email, name, role (ADMIN | CAREGIVER)
Client               name, address, lat, lng, notes
Shift                caregiverId, clientId, scheduledStart/End, status,
                     clockInAt/Lat/Lng, clockOutAt/Lat/Lng,
                     signaturePng (bytea), signedByName, signedAt,
                     geofenceFlag, caregiverNotes
ShiftTask            shiftId, description, completed, completedAt, orderIdx
MessageThread        id, name (nullable for DMs)
ThreadMember         threadId, userId (composite PK)
Message              threadId, senderId, body, createdAt
Session/Account/Verification (Better-auth managed)
```

Full schema: `api/prisma/schema.prisma`

## Deploy

Oracle Cloud VM, Caddy + pm2. `./deploy/deploy.sh` handles git pull → `npm ci` → `prisma migrate deploy` → build → rsync web bundle → `pm2 reload`. Caddyfile at `deploy/Caddyfile` handles HTTPS via Let's Encrypt and reverse proxies `/api/*` to the Express process.

## What's deliberately not built

- Client/family portal
- Recurring shifts, care‑plan templates
- Password reset (needs SMTP)
- Push notifications, photo uploads
- Read receipts, typing indicators
- Audit log, soft deletes
- Test suite (would start with auth middleware, Haversine math, conflict detection, SSE lifecycle)
