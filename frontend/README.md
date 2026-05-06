# Blazing 8s — Frontend (Vite + React SPA)

Static SPA hosted on **Cloudflare Pages**. Talks to the Hono backend over HTTPS, and to Supabase directly for realtime updates.

## Stack
- Vite + React 18 + TypeScript
- React Router (SPA)
- Tailwind CSS v4
- react-helmet-async for per-route SEO
- Supabase JS for realtime subscriptions

---

## 1. Local development

```bash
cd frontend
cp .env.example .env
# fill VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
# → http://localhost:5173
```

> The backend must be running (locally or on your VPS) and `VITE_API_URL` must point at it.

---

## 2. Environment variables

| Var | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes | Your backend URL, no trailing slash. e.g. `https://api.blazing8s.com` |
| `VITE_SUPABASE_URL` | yes | From Supabase project settings |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | The **anon/public** key — safe in client bundle |
| `VITE_SITE_URL` | no | Public site URL for canonical/OG tags + sitemap. Default `https://blazing8s.com` |

> **Never** put `SUPABASE_SERVICE_ROLE_KEY` here. That belongs on the backend only.

---

## 3. Deploy on Cloudflare Pages

### Option A — Connect a Git repo (recommended)

1. Push this `frontend/` folder to its own GitHub repo (or a subfolder of a monorepo).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick your repo. Set:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory** (if monorepo): `frontend`
4. **Environment variables** → add the four `VITE_*` vars from above. Set them for **Production** and **Preview**.
5. Save & Deploy.

Cloudflare auto-deploys every push to `main`.

### Option B — Direct upload via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist --project-name=blazing8s
```

### SPA routing

`public/_redirects` handles deep-link refreshes (`/game/abc` → `index.html`) — Cloudflare Pages reads it automatically.

### Custom domain

Pages → your project → **Custom domains** → add `blazing8s.com`. Cloudflare provisions HTTPS in ~1 min.

---

## 4. SEO features included

- Per-route `<title>`, `<meta description>`, canonical, OG, Twitter cards (via `Seo` component)
- `robots.txt` and auto-generated `sitemap.xml` (built by `scripts/sitemap.mjs` after `vite build`)
- JSON-LD `VideoGame` structured data in `index.html`
- `noindex` on `/auth` and `/game/:id` (private rooms)
- Pre-rendered landing HTML — `index.html` ships with full meta tags and JSON-LD before JS hydrates, so crawlers and link previews get everything immediately.

If you change the site URL, update `VITE_SITE_URL` and the URLs in `index.html` + `public/robots.txt`.

---

## 5. Connecting backend + frontend

```
[ Cloudflare Pages — frontend ]   ← static SPA
        │  fetch(VITE_API_URL/api/games/*)
        ▼
[ VPS (Coolify/Docker) — backend ]   ← Hono on :8080 behind Caddy/Nginx HTTPS
        │
        ▼
[ Supabase (Lovable Cloud) ]   ← Postgres + Realtime
        ▲
        │ realtime channel (WSS)
[ Cloudflare Pages — frontend ]   (read-only via anon key)
```

Make sure your backend's `CORS_ORIGINS` includes the Cloudflare Pages URL **and** your custom domain.
