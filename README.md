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
npm start        # runs EVERYTHING on http://localhost:5000
```

The backend serves both the **API and the built React app** on the same port, so
there's just one process and one URL. `npm start` also auto-builds the frontend
the first time (or with `--rebuild`), and `npm run dev` starts Vite HMR mode instead.

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
```

Or for UI development with live reload, run Vite separately:

```bash
cd frontend && npm run dev # http://localhost:5173 (proxies /api to :5000)
```

## 4. Production build

```bash
npm start -- --rebuild     # rebuild frontend/dist, then serve everything
```

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

## Notes

- Passwords are hashed with bcrypt (12 rounds) — never stored in plain text.
- Auth uses signed JWTs stored in `localStorage` under `fairtrike_token`.
- The routing proxy calls openrouteservice only if `ORS_API_KEY` is set; otherwise the
  map falls back to the public OSRM server, matching the original PHP behaviour.