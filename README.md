# Blazing 8s

Wild-West-themed real-time multiplayer Crazy Eights. No login — pick a handle, share a room code, deal cards.

This repo is split into two independently deployable apps:

```
.
├── frontend/   # Vite + React SPA  →  Cloudflare Pages
└── backend/    # Hono + Node API   →  any VPS (Docker)
```

Both talk to a shared **Supabase** project (Postgres + Realtime). The frontend uses Supabase only for live updates over WebSocket; all state mutations go through the backend.

---

## Architecture

```
[ Cloudflare Pages — frontend ]   ← static SPA
        │  fetch(VITE_API_URL/api/games/*)
        ▼
[ VPS (Coolify/Docker) — backend ]   ← Hono on :8080 behind Caddy/Nginx HTTPS
        │
        ▼
[ Supabase ]   ← Postgres + Realtime
        ▲
        │ realtime channel (WSS, anon key)
[ Cloudflare Pages — frontend ]
```

---

## Quick start (local)

You'll need Node 20+ and a Supabase project.

**1. Backend**
```bash
cd backend
cp .env.example .env   # fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + CORS_ORIGINS
npm install
npm run dev            # → http://localhost:8080
```

**2. Frontend** (in another terminal)
```bash
cd frontend
cp .env.example .env   # fill VITE_API_URL=http://localhost:8080 + Supabase anon
npm install
npm run dev            # → http://localhost:5173
```

Open the frontend URL in two browser windows to test multiplayer locally.

---

## Deploying

- **Frontend** → Cloudflare Pages. See [`frontend/README.md`](./frontend/README.md).
- **Backend** → any VPS via Docker (Coolify / Dokploy / plain `docker compose`). See [`backend/README.md`](./backend/README.md).

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vite, React 18, TypeScript, Tailwind v4, React Router, react-helmet-async |
| Backend | Node 20, Hono, Zod |
| Database | Supabase (Postgres + Realtime) |
| Hosting | Cloudflare Pages (frontend) + VPS Docker (backend) |

---

## License

MIT
