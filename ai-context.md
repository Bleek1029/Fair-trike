# Fairtrike — AI Context

A full-stack tricycle ride-hailing / transit app for **Olongapo City, Philippines**.
Two role-specific portals over one PostgreSQL database + one Express/Socket.io backend.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Leaflet (map) + react-router-dom + Socket.io-client + Capacitor (Android native shell) |
| Backend | Node.js (ESM) + Express + Socket.io + pg (PostgreSQL client) |
| Database | PostgreSQL (`appdev` on localhost:5432). Self-hosted only — no managed DB documented. |
| Maps/Routing | Leaflet + OpenStreetMap tiles · server-side OSRM driving proxy (`/api/places/route`) · Photon + Nominatim geocoding (server-side, Olongapo-biased) |
| Real-time | Socket.io (`ride:<id>` per-ride rooms + `drivers` room) |
| Auth | JWT (jsonwebtoken), bcryptjs passwords, express-rate-limit on `/api/auth` |
| Uploads | Multer (profile pictures + driver documents, stored in `backend/uploads/`) |
| Mobile | Capacitor 8 + Gradle (JDK 21+ required), pwa.webmanifest for PWA shell |
| Hosting | Dev: Vite `:5173` proxies `/api`, `/uploads`, `/socket.io` → backend `app :5000` + `admin :5001`. Prod: `node scripts/start.mjs` runs `server.js` (API + built SPA on 5000) and `admin-server.js` (admin on 5001). Vercel serverless supported (`backend/vercel.json` rewrites `/api` → `/api`); app exported as default on Vercel. |

**Fare engine (server-authoritative):** base ₱30 flag-down + ₱3/km, 20% statutory discount for PWD / student / senior tiers. Tiers: `regular`, `pwd`, `discounted`. Client fare estimates in the UI are only previews; actual fare is computed server-side at booking.

---

## 2. Directory Structure

```
fairtrike-modern/
├── package.json                 # root scripts: setup / start / dev / stop / start:admin / android
├── README.md
├── .gitignore
├── scripts/
│   ├── setup.mjs                # installs deps in backend/ + frontend/, builds frontend
│   ├── start.mjs                # builds frontend (unless --dev), spawns backend/start.mjs
│   ├── stop.mjs                 # frees :5000 and :5001 ports
│   └── android.mjs              # builds web bundle, syncs Capacitor android, assembles APK
├── frontend/                    # React + Vite SPA (PWA + Capacitor)
│   ├── vite.config.js           # dev: proxies /api, /uploads, /socket.io → localhost:5000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx             # entry: BrowserRouter → AuthProvider → App
│       ├── App.jsx              # route table + role guards (PassengerOnly / DriverOnly / AdminOnly)
│       ├── config.js            # FARE constants, MAP DEFAULT center, API_BASE, IS_NATIVE_APP
│       ├── api.js / api/http.js # typed fetch client + JWT handling + ApiError class
│       ├── auth/AuthContext.jsx # global auth state, token store (localStorage/sessionStorage)
│       ├── context/             # BackgroundTaskContext.js (non-critical)
│       ├── css/                 # main.css + mobile-map.css
│       ├── lib/                 # ports.js (app/admin routing), roles.js, socket.js (client), native.js
│       │                        # places.js (geocode/route client), format.js, utils.js, navigation.js, Helpers.js
│       ├── components/          # Chrome.jsx (Header), BottomNav.jsx, Footer.jsx, RideOptionCard.jsx,
│       │                        # FareEstimator.jsx, AuthSplit.jsx, InstallPrompt.jsx, SignOutModal.jsx, etc.
│       ├── pages/               # Landing, Login, Register, DriverLogin, DriverRegister, DriverInfo
│       │                        # Dashboard (commuter), MapApp (ride booking), HistoryPage, AccountPage,
│       │                        # DriverApp (duty console), DriverEarnings, DriverHistory, DriverAccount,
│       │                        # AdminDashboard
│       └── app/                 # DriverMap.jsx (driver-side map)
├── backend/                     # Node/Express + PostgreSQL
│   ├── config.js                # env-derived config (port, adminPort, JWT, db, uploads, cors, orsApiKey)
│   ├── db.js                    # pg Pool + ensureDatabase() (auto-creates "appdev", idempotent schema)
│   ├── server.js                # Express app: middleware, routes, static SPA dist, error handler
│   ├── admin-server.js          # dedicated admin SPA on :5001, proxies /api → main backend
│   ├── socket.js                # Socket.io server: rooms, driver:location, ride lifecycle events
│   ├── routes/
│   │   ├── admin.js             # /api/admin/stats, /admin/drivers, /admin/documents, /admin/users, /admin/rides
│   │   ├── auth.js              # register, register-driver, login, login-driver, login-admin, reset-password
│   │   ├── users.js             # GET/PUT /api/users/me, profile picture upload/delete
│   │   ├── drivers.js           # GET/PUT /api/drivers/me, document upload (license/or_cr/nbi_clearance/toda_clearance)
│   │   ├── rides.js             # booking lifecycle: create/accept/complete/cancel/history/earnings/available
│   │   ├── places.js            # /api/places/search, /reverse, /route (Photon, Nominatim, OSRM)
│   │   ├── geo.js               # /api/geo/ip (public-IP → approximate coords)
│   │   └── routing.js           # /api/route/directions (openrouteservice proxy, optional ORS key)
│   ├── lib/
│   │   ├── fares.js             # server-side fare engine (base ₱30, perKm ₱3, discounts, min floors)
│   │   ├── http.js              # ok / created response helpers
│   │   ├── AppError.js          # typed AppError + factory helpers (badRequest, unauthorized, …)
│   │   ├── asyncHandler.js      # async route wrapper → error middleware
│   │   ├── validation.js        # email regex, password 6+ chars, assertCoordPair, requireFields
│   │   ├── spa.js               # sendIndex() injects window.__FAIRTRIKE__ runtime config
│   │   └── (no folder file)     # 
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, requireRole(pool, …), signToken, publicUser, publicDriver
│   │   └── error.js             # notFoundHandler + centralized errorHandler
│   ├── sql/schema.sql           # PostgreSQL schema (users, drivers, rides, driver_documents)
│   ├── uploads/                 # runtime-uploaded files (profile pictures, driver docs)
│   ├── .env / .env.example
│   ├── start.mjs                # spawns server.js + admin-server.js (--dev = --watch)
│   ├── admin-server.js          # (also at root backend/; entry: npm run start:admin)
│   ├── vercel.json              # serverless rewrites /api → /api
│   └── tests/                   # (Node test files)
└── node_modules/
```

---

## 3. Core Components & Routing

### Role routing (client-side, enforced server-side)
- `/` → Landing (guest)
- `/login` / `/register` / `/login-driver` / `/register-driver` / `/driver-info` → guest-only
- `/app` → PassengerOnly → `MapApp` (ride booking map)
- `/dashboard` → PassengerOnly → `Dashboard` (recent trips)
- `/history` / `/account` → commuter surfaces
- `/driver` → DriverOnly → `DriverApp` (duty console)
- `/driver/earnings` / `/driver/history` / `/driver/account` → driver surfaces
- `/admin` → AdminOnly → `AdminDashboard`

### Frontend state
- `AuthContext.jsx` — user + token, persisted in `localStorage` (`fairtrike_token`/`fairtrike_user`) when "Remember device" is on, otherwise `sessionStorage`. Token invalid → clear both stores.
- `api.js` — typed endpoint functions that attach `Authorization: Bearer <token>` via `http.js` (`rawRequest` with 15s timeout, `ApiError`).
- `ports.js` — `APP_ORIGIN` / `ADMIN_ORIGIN` from `window.__FAIRTRIKE__` injected by `backend/lib/spa.js`; degrades to same-origin when no config (e.g. Vercel → single-port behaviour).
- `socket.js` (client) — `connectSocket(token)`, `joinRide`, `joinDrivers`, `sendDriverLocation`, `onDriverLocation`, `onRideEvent`, `onRideRequested`.

### Backend API (base on `:5000`)
| Path | Handler | Purpose |
|---|---|---|
| `POST /api/auth/register` | auth.js | Passenger account (role `passenger`) |
| `POST /api/auth/register-driver` | auth.js | Driver account + linked `drivers` row (transactional) |
| `POST /api/auth/login` | auth.js | Passenger sign-in |
| `POST /api/auth/login-driver` | auth.js | Driver sign-in |
| `POST /api/auth/login-admin` | auth.js | Admin sign-in |
| `POST /api/auth/reset-password` | auth.js | Requires current password |
| `GET/PUT /api/users/me` | users.js | Profile read/update; `PUT` accepts optional `profile_picture` (multipart) |
| `GET /api/drivers` | drivers.js | Public driver directory (approved-only by default) |
| `GET/PUT /api/drivers/me` | drivers.js | Own driver profile |
| `POST /api/drivers/me/documents` | drivers.js | Multer upload → `driver_documents` (types `license`/`or_cr`/`nbi_clearance`/`toda_clearance`) |
| `GET /api/drivers/me/location` | drivers.js | Live location REST fallback |
| `POST /api/rides` | rides.js | Create pending ride; computes fare; emits `ride-requested` |
| `GET /api/rides/available` | rides.js | Pending offers for approved drivers |
| `POST /api/rides/:id/accept` | rides.js | Atomic claim → `status='accepted'` |
| `POST /api/rides/:id/complete` | rides.js | → `status='completed'` |
| `POST /api/rides/:id/cancel` | rides.js | → `status='cancelled'` |
| `GET /api/rides/mine` | rides.js | Driver's assigned rides |
| `GET /api/rides/history` | rides.js | Passenger's own trips |
| `GET /api/rides/earnings` | rides.js | Today/week/all-time + 7-day daily breakdown |
| `GET /api/admin/stats` | admin.js | Role/user/driver/ride/doc counts |
| `GET /api/admin/drivers` | admin.js | All driver applications |
| `POST /api/admin/drivers/:userId/status` | admin.js | Approve/reject |
| `GET /api/admin/documents` | admin.js | Document review queue |
| `POST /api/admin/documents/:id/status` | admin.js | Approve/reject doc |
| `GET /api/admin/users` | admin.js | All accounts |
| `GET /api/admin/rides` | admin.js | All rides |
| `GET /api/geo/ip` | geo.js | Public-IP → approximate coords (keyless 3rd-party, fallback Olongapo) |
| `GET /api/places/search?q=` | places.js | Autocomplete (Photon → Nominatim, Olongapo bbox) |
| `GET /api/places/reverse` | places.js | Reverse geocode a GPS fix → label |
| `GET /api/places/route` | places.js | OSRM driving proxy (server-side) |
| `POST /api/route/directions` | routing.js | openrouteservice (needs `ORS_API_KEY`; falls back to OSRM) |
| `GET /api/health` | server.js | Liveness |

### Data flow through the app (summary)
1. **Booking**: user picks pickup + dropoff → autocomplete via `/api/places/search` (Photon/Nominatim) → geocode place → `POST /api/rides` with `{pickup_label, dropoff_label, pickup/lat,lng, distance_m, ride_type}` → server recomputes `fare` from `distance_m` + tier (server is source of truth) → row inserted with `status='pending'` → `ride-requested` Socket.io push to `drivers` room.
2. **Driver accepts**: driver on duty receives `ride-requested` in real time (or polls `/api/rides/available` every 5 s) → `POST /api/rides/:id/accept` (atomic `UPDATE ... WHERE status='pending'`) → `ride-accepted` emitted to `ride:<id>` room.
3. **Live tracking**: driver uses device GPS (`geolocation.watchPosition`) + `sendDriverLocation` over Socket.io → server persists `drivers.last_lat/lng/last_location_at` and broadcasts `location-update` to `ride:<id>` → passenger map follows the driver.
4. **Completion**: driver taps Complete → `POST /api/rides/:id/complete` → `status='completed'`, `completed_at=NOW` → `ride-completed` emitted; also triggers driver dashboard earnings refresh.
5. **Fare**: `computeFare(distanceMeters, rideType)` in `backend/lib/fares.js` (`base ₱30 + perKm ₱3` × `[1, 0.8, 0.8]` for regular/pwd/discounted, floored at `₱30/₱24`). Frontend estimates are client-side previews only.
6. **Earnings report** (driver): `GET /api/rides/earnings` uses `FILTER (WHERE completed_at >= date_trunc('day'/'week', NOW()))` + a 7-day daily `GROUP BY`.
7. **Admin**: `GET /api/admin/stats` aggregates role counts, driver statuses, ride statuses, document statuses; queue approves/rejects `drivers` and `driver_documents`.
8. **Uploads**: Multer writes profile pictures (`user_<id>_<timestamp>.<ext>`) and docs (`doc_<userid>_<type>_<timestamp>.<ext>`) to `backend/uploads/`, stores relative `file_path` in DB, served via `express.static(uploadDir)`.
9. **Auth**: JWT signed with `JWT_SECRET` (expires `JWT_EXPIRES_IN`, default `7d`). All API requests must send `Authorization: Bearer <token>` (`requireAuth`). Role checks (`requireRole`) query `users.role` per-request.

### Database schema summary
| Table | Key columns | Notes |
|---|---|---|
| `users` | `id, fullname, email UNIQUE, password_hash, role (passenger|driver|admin), profile_picture, created_at, updated_at` | `updated_at` auto-set by `set_updated_at()` trigger |
| `drivers` | `id, user_id UNIQUE FK → users.id, license_number UNIQUE, toda_association, trike_number, vehicle_plate, contact_number, status (pending|approved|rejected), last_lat, last_lng, last_location_at, created_at, updated_at` | One driver row per user |
| `rides` | `id, passenger_name, passenger_user_id FK → users.id ON DELETE SET NULL, pickup_label, dropoff_label, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_m, fare NUMERIC(10,2), status (pending|accepted|completed|cancelled), driver_user_id FK → users.id ON DELETE SET NULL, accepted_at, completed_at, created_at, updated_at` | Ride lifecycle shared by both portals |
| `driver_documents` | `id, user_id FK → users.id ON DELETE CASCADE, doc_type (license|or_cr|nbi_clearance|toda_clearance), file_path, status (pending|approved|rejected), created_at` | Document review queue |
| Indexes | `idx_rides_status (status)`, `idx_rides_driver (driver_user_id, status)` | — |
| Triggers | `set_updated_at()` → `updated_at` on `users`, `drivers`, `rides` | Mirrors MySQL `ON UPDATE CURRENT_TIMESTAMP` |

### Data flow (concise)
```
User types location → /api/places/search (Photon→Nominatim, Olongapo bbox)
   → geocoded {lat,lng}
   → POST /api/rides {ride_type}
   → fare computed server-side (lib/fares.js)
   → rides row (status=pending) + ride-requested Socket push to 'drivers' room
   → driver polls /api/rides/available OR receives push
   → POST /api/rides/:id/accept (atomic claim)
   → ride-accepted Socket push to ride:<id> room
   → driver GPS watchPosition → Socket driver:location
   → server persists drivers.last_lat/lng + broadcasts location-update to ride:<id>
   → passenger scan /api/rides/:id/complete → completed_at + ride-completed
   → driver GET /api/rides/earnings → today/week/all-time + 7-day daily
```

### Notes for future sessions
- **DB is PostgreSQL only.** `backend/db.js` auto-creates the `appdev` DB and applies `schema.sql` idempotently on startup (needs a local PostgreSQL instance). No seed/seed data committed; `schema.sql` has an optional sample-user comment (password `123456`).
- **Two-server architecture:** app on `5000`, admin dashboard on `5001`. `ports.js` degrades to single-port if `window.__FAIRTRIKE__` is absent (Vercel/static).
- **Geo is Olongapo-metro biased.** Results outside the bbox are still returned but sorted by `inOlongapo()`.
- **Single source of truth for fare** is `backend/lib/fares.js`; `frontend/src/config.js` `FARE` mirrors it for client previews. Do not trust client-computed fares.
- **Auth** is JWT + `requireAuth`/`requireRole` on every protected route; the SPA client guards by role but can be bypassed.
- The repo root (this repo) is the source of truth; the Obsidian vault beside it (`create a link.md`, `Untitled/`) is empty scaffolding and is not used by the app.
- **Dev run:** `npm start` (from repo root) builds the frontend if needed, then runs `backend/start.mjs` which launches `server.js` (5000) and `admin-server.js` (5001).
- **Milestone:** the app is feature-complete for the described workflow; no further implementation is implied.
