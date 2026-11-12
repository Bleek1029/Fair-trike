# Fairtrike on Render — Deployment Guide

## Option 1: Single Web Service (Easiest) — $14/mo
**What you get:** One URL, backend + frontend + admin all on same port.

| Component | Plan | Cost |
|-----------|------|------|
| Web Service | Starter (512 MB RAM) | $7/mo |
| PostgreSQL | Starter (1 GB RAM, 25 GB) | $7/mo |
| **Total** | | **$14/mo** |

**Deploy:**
1. Push to GitHub
2. In Render: New → Blueprint → select your repo → uses `render.yaml`
3. After deploy, set `CORS_ORIGINS` to your URL (e.g., `https://fairtrike.onrender.com`)
4. Set `ORS_API_KEY` if you have one

**URLs:**
- App: `https://fairtrike.onrender.com`
- Admin: `https://fairtrike.onrender.com/admin`
- API: `https://fairtrike.onrender.com/api`

---

## Option 2: Split (Cheaper) — $7/mo + FREE
**What you get:** Frontend on free static hosting, backend on paid web service.

| Component | Platform | Plan | Cost |
|-----------|----------|------|------|
| Backend + DB | Render | Starter Web + Starter PG | $14/mo |
| Frontend | Cloudflare Pages / Netlify / Vercel | Free | $0/mo |
| **Total** | | | **$14/mo** (same, but frontend is free forever) |

**Actually cheaper: Use Render Free Web Service + External Free DB**

| Component | Platform | Plan | Cost |
|-----------|----------|------|------|
| Backend | Render | Free Web Service (spins down) | $0/mo |
| PostgreSQL | Neon / Supabase / Railway | Free tier | $0/mo |
| Frontend | Cloudflare Pages | Free | $0/mo |
| **Total** | | | **$0/mo** ⚠️ Cold starts on free web service |

**To use free backend on Render:**
1. Create Web Service → Free plan
2. Connect external DB (Neon/Supabase) → set `DATABASE_URL` in env vars
3. Note: Free tier spins down after 15 min inactivity → 30-60s cold start

---

## Quick Setup Checklist

### 1. Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fairtrike-modern
git push -u origin main
```

### 2. Deploy via Blueprint
1. Go to [Render Dashboard](https://dashboard.render.com)
2. New → Blueprint
3. Connect GitHub repo
4. Render reads `render.yaml` → creates web service + database
5. Click "Apply"

### 3. Post-Deploy Configuration
In Render dashboard → your web service → Environment:

| Variable | Value |
|----------|-------|
| `CORS_ORIGINS` | `https://your-app.onrender.com` (your actual URL) |
| `ORS_API_KEY` | Your OpenRouteService key (optional) |
| `ADMIN_SPA_ORIGIN` | (leave blank for production) |

### 4. Custom Domain (Optional)
- Settings → Custom Domains → Add your domain
- Update `CORS_ORIGINS` to your custom domain

---

## Local Testing (Production Mode)

```bash
# Build frontend
cd frontend && npm run build

# Test single-port mode locally
cd ../backend
SINGLE_PORT=true PORT=5000 npm start
# Open http://localhost:5000
# Admin at http://localhost:5000/admin
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Node version (needs 20+), ensure `npm ci` works |
| DB connection fails | Verify `DATABASE_URL` is set from the managed DB |
| CORS errors | Set `CORS_ORIGINS` to your exact frontend URL |
| Admin not loading | Ensure `SINGLE_PORT=true` is set in env vars |
| Socket.io not working | Render free tier doesn't support WebSockets well; upgrade to Starter |

---

## Cost Optimization Tips

1. **Start free**: Use Render Free Web + Neon Free Postgres + Cloudflare Pages
2. **Upgrade when needed**: Move to Starter ($7) when traffic grows
3. **Use Cloudflare**: Free CDN + DDoS protection in front of Render
4. **Monitor usage**: Render shows bandwidth/CPU in dashboard

---

## File Changes Made for Render

| File | Change |
|------|--------|
| `backend/config.js` | Added `DATABASE_URL` parsing + `SINGLE_PORT` flag |
| `backend/server.js` | Single-port mode: serves admin at `/admin` on same port |
| `backend/start.mjs` | Only spawns one server when `SINGLE_PORT=true` |
| `backend/package.json` | Added `build` script |
| `render.yaml` | Blueprint for single web service + managed PG |