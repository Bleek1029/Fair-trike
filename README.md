# Fairtrike (HTML + CSS + React + Node.js + PostgreSQL)

This is the modern rewrite of the original PHP/MySQL Fairtrike app. It preserves all
features (landing page, account creation, login, password reset, dashboard, profile
picture management, and the Leaflet map app with GPS, shortcuts, geocoding, and the
₱30 + ₱10–15/km fare calculator) using a React frontend and a Node.js/Express backend
backed by PostgreSQL.

## Project layout

```
fairtrike-modern/
├─ backend/                 Node.js + Express API
│  ├─ server.js             entrypoint
│  ├─ db.js                 PostgreSQL connection pool
│  ├─ middleware/auth.js    JWT helpers
│  ├─ routes/
│  │  ├─ auth.js            register / login / reset-password
│  │  ├─ users.js           profile read/update, picture upload/remove
│  │  └─ routing.js         openrouteservice proxy (falls back to OSRM on frontend)
│  ├─ sql/schema.sql        PostgreSQL table + trigger
│  ├─ .env.example          copy to .env and adjust
│  └─ uploads/              uploaded profile pictures (auto-created)
└─ frontend/                React (Vite) single-page app
   ├─ vite.config.js        dev server + /api & /uploads proxy to :5000
   ├─ capacitor.config.json native Android shell (webDir: dist)
   ├─ android/              Capacitor Android project (`npm run android`)
   └─ src/
      ├─ main.jsx           entrypoint
      ├─ App.jsx            routes + protected/guest wrappers
      ├─ api.js             fetch helpers (JWT)
      ├─ auth/AuthContext   global auth state
      ├─ pages/             Landing, Login, Register, Dashboard
      ├─ app/MapApp.jsx     Leaflet map, GPS, search, routes, fare, profile
      ├─ data/locations.js  Olongapo landmarks + static coordinates
      └─ css/main.css       all styles
```

## Quick start (one command)

```bash
npm run setup    # first time only — installs deps + builds the frontend
npm start        # app on http://localhost:5000 · admin dashboard on :5001
```

The backend serves both the **API and the built React app** on the same port, so
there's just one URL to remember. `npm start` also launches a **second, separate
admin server on port 5001** (see [Admin dashboard](#admin-dashboard)), auto-builds
the frontend the first time (or with `--rebuild`), and `npm run dev` starts Vite
HMR mode instead.

## Prerequisites

- Node.js (v20+) — verified here with v24
- PostgreSQL server running locally (`psql` CLI optional)

## 1. Set up the PostgreSQL database

```bash
# Start PostgreSQL, then run the schema (adjust user/password as needed)
psql -U postgres -f backend/sql/schema.sql
```

If `psql` is not on your PATH, open your PostgreSQL tool (pgAdmin or the SQL shell)
and run the statements inside `backend/sql/schema.sql` manually.

(Not strictly required — the backend also auto-creates the database + tables on
startup if your `.env` credentials are correct.)

## 2. Configure the backend (first time only)

```bash
cd backend
copy .env.example .env     # then edit .env with your DB credentials + JWT secret
```

## 3. One-command run

```bash
npm start                  # http://localhost:5000 — API + frontend together
                           # admin dashboard on http://localhost:5001
```

Or for UI development with live reload, run Vite separately:

```bash
cd frontend && npm run dev # http://localhost:5173 (proxies /api to :5000)
```

### Port already in use?

If you see `❌ Port 5000 is already in use` (a previous run or a closed terminal
left a server behind), free the ports and start again:

```bash
npm run stop               # stops whatever holds PORT + ADMIN_PORT
npm start
```

## 4. Production build

```bash
npm start -- --rebuild     # rebuild frontend/dist, then serve everything
```

## Command reference

| Command | Where | What it starts |
|---|---|---|
| `npm start` | project root | frontend build check + **both** servers (app `PORT`, admin `ADMIN_PORT`) |
| `npm start` | `backend/` | **both** servers (same as above, no build check) |
| `npm run dev` | either | **both** servers with `--watch` (auto-restart on backend edits) |
| `npm run stop` | either | stops whatever holds `PORT` / `ADMIN_PORT` |
| `npm run start:admin` | either | admin dashboard only — needs the app server running too |
| `npm run start:app` | `backend/` | app server only (API + frontend), no admin dashboard |
| `npm run dev:app` | `backend/` | app server only, with `--watch` |
| `npm run android` | project root or `backend/` | builds + installs the Capacitor Android app (see [Android app](#android-app-capacitor)) |

To run the servers on different ports without editing files, override the env vars:

```bash
PORT=7000 ADMIN_PORT=7001 npm start      # bash
$env:PORT=7000; $env:ADMIN_PORT=7001; npm start   # PowerShell
```

## Admin dashboard

The admin console runs on its **own port (default `5001`)** so it stays separate
from the commuter/driver app on `5000`:

- **URL:** http://localhost:5001/admin (http://localhost:5001 redirects there)
- Started automatically by `npm start` / `npm run dev`
- Or on its own: `npm run start:admin`

It serves only the admin SPA and **proxies `/api` and `/uploads` to the main
backend**, so no extra endpoints are exposed — every admin API call still needs a
valid `admin` JWT (`requireRole('admin')`), and non-admins get `403`.

`/admin` in the browser is just a route in the same React app, so an admin who
signs in on port 5000 also lands on the dashboard (the route guard sends each
role to its own home: commuters `/app`, drivers `/driver`, admins `/admin`).

### Becoming an admin

Admins can't be created through the sign-up pages. Register normally, then
promote the account:

```bash
cd backend
node --env-file=.env make-admin.mjs you@example.com
```

### What you can review

| Tab | Actions |
|-----|---------|
| Drivers | Approve / reject applications, reset to pending. Pending counts show in the tab |
| Documents | Review uploaded TODA documents (license, OR/CR, NBI, TODA clearance), open the file, approve/reject |
| Users | All accounts with role badges (commuter / driver / admin) |
| Rides | Full ride log — passenger → driver, pickup/dropoff, fare, status |

### Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `ADMIN_PORT` | `5001` | Port for the admin dashboard |
| `ADMIN_SPA_ORIGIN` | – | Optional. Proxy the SPA shell from the Vite dev server (e.g. `http://localhost:5173`) so the admin UI hot-reloads in dev instead of serving `frontend/dist` |

`npm run dev` keeps `--watch` on both servers, so backend and admin-server edits
restart automatically.

## Android app (Capacitor)

The same React bundle also ships as a native Android app: Capacitor wraps
`frontend/dist` in a WebView shell (`frontend/android`, app id `com.fairtrike.app`),
so it launches from the launcher instead of a browser tab.

```bash
npm start                        # 1. backend + frontend on :5000 (the app needs it)
npm run android                  # 2. build web bundle → sync → APK → install + launch
npm run android -- --apk         # just produce the APK, don't install
npm run android -- --api http://192.168.0.121:5000    # physical phone on your Wi-Fi
```

| Piece | Purpose |
|---|---|
| `frontend/capacitor.config.json` | app id/name, `webDir: dist` (what gets packaged) |
| `frontend/android/` | native Gradle project — open with `npm --prefix frontend run android:open` |
| `frontend/src/lib/native.js` | native detection + the backend origin a native build talks to |
| `scripts/android.mjs` | the launcher behind `npm run android` |
| `frontend/android/app/build/outputs/apk/debug/app-debug.apk` | the debug APK |

### How the native app reaches the backend

Inside the WebView the bundle is served from Capacitor's own origin
(`https://localhost`), so origin-relative URLs (`/api`, `/uploads/…`) would hit the
asset loader instead of Node. Native builds use an absolute backend origin:

| Situation | Origin | How |
|---|---|---|
| Phone on your Wi-Fi/USB | `http://<your-lan-ip>:5000` | `npm run android -- --api http://192.168.0.121:5000` |
| Hosted backend | `https://your.api` | `VITE_NATIVE_API_ORIGIN=…` at build time |

The backend already listens on every interface (`app.listen(PORT)`), so a
physical phone can reach it over your LAN — verify from the host with
`http://<your-lan-ip>:5000/api/health`. `/uploads` is rewritten the
same way (`avatarUrl()` in `src/lib/utils.js`), and the browser/desktop behaviour
is unchanged: those builds keep the relative paths.

### Requirements and gotchas

- **Gradle needs JDK 21+.** Capacitor 8 compiles its Android module with
  `--release 21`; a JDK 17 `JAVA_HOME` fails with `error: invalid source release: 21`.
  `scripts/android.mjs` picks a usable JDK automatically (your `JAVA_HOME`, then
  Android Studio's bundled JBR) and prints install instructions if none is found.
- **A stale `ANDROID_HOME` is tolerated.** Gradle takes the SDK from
  `frontend/android/local.properties` (git-ignored, machine-specific) and the
  launcher pins the detected SDK for its children; `cap`/`native-run` fall back to
  `%LOCALAPPDATA%\Android\Sdk`, so no PATH edits are needed.
- **First build downloads a lot** (Gradle 8.14.3, AGP 8.13, API 36 platform) — a
  few minutes; later builds are incremental.
- **Location is declared** (`ACCESS_FINE/COARSE_LOCATION`) because the map asks for
  GPS. On a physical phone this uses the real fix; grant the permission when prompted.
- **Cleartext HTTP is allowed in the debug shell** (`usesCleartextTraffic` in the
  manifest + Capacitor's `android.allowMixedContent`) so the app can call
  `http://<your-lan-ip>`. Before shipping, drop both and point
  `VITE_NATIVE_API_ORIGIN` at an `https://` origin.
- **The PWA service worker is skipped natively** (`src/main.jsx`): Capacitor already
  ships the bundle on the device.
- **The device must be authorised** — `adb devices` has to show `device`, not
  `unauthorized`. Install then fails with `adb: device unauthorized`. Fix: accept
  the "Allow USB debugging?" prompt on the phone.
- Use a physical phone over USB — there is no virtual-device workflow in this
  project.

## API reference

| Method | Endpoint                     | Auth | Description                         |
|--------|------------------------------|------|-------------------------------------|
| POST   | `/api/auth/register`         | –    | Create account `{fullname,email,password}` |
| POST   | `/api/auth/login`            | –    | Login → `{ token, user }`           |
| POST   | `/api/auth/reset-password`   | –    | `{ email, new_password }`           |
| GET    | `/api/users/me`              | JWT  | Current user                        |
| PUT    | `/api/users/profile`         | JWT  | Update name + optional picture (multipart) |
| DELETE | `/api/users/profile/picture` | JWT  | Remove profile picture              |
| POST   | `/api/route/directions`      | –    | ORS route proxy (requires `ORS_API_KEY`) |
| POST   | `/api/auth/login-driver`     | –    | Driver-portal login (rejects commuter accounts) |
| GET    | `/api/admin/stats`           | admin | Counts by role / driver status / ride status |
| GET    | `/api/admin/drivers`         | admin | All driver applications (pending first) |
| POST   | `/api/admin/drivers/:userId/status` | admin | `{ status }` → `pending` \| `approved` \| `rejected` |
| GET    | `/api/admin/documents`       | admin | TODA document review queue (`?status=`) |
| POST   | `/api/admin/documents/:id/status` | admin | Approve/reject an uploaded document |
| GET    | `/api/admin/users`           | admin | All accounts |
| GET    | `/api/admin/rides`           | admin | Full ride log with passenger + driver names |

## Notes

- Passwords are hashed with bcrypt (12 rounds) — never stored in plain text.
- Auth uses signed JWTs stored under `fairtrike_token`. The sign-in "Remember device"
  checkbox picks the backing store: checked → `localStorage` (survives browser
  restarts), unchecked → `sessionStorage` (signed out when the browser closes).
- The routing proxy calls openrouteservice only if `ORS_API_KEY` is set; otherwise the
  map falls back to the public OSRM server, matching the original PHP behaviour.