# Blazing 8s — Backend (Hono + Node)

REST API for the Blazing 8s card game. Runs on any VPS via Docker.

## Stack
- **Runtime**: Node.js 20
- **Framework**: [Hono](https://hono.dev) (fast, tiny, runs on every JS runtime)
- **Database**: Supabase (Postgres + Realtime, used directly by frontend for live updates)
- **Validation**: Zod

## Endpoints (all JSON, base path `/api/games`)
| Method | Path | Body |
|---|---|---|
| POST | `/create` | `{ player }` → `{ id, code }` |
| POST | `/join` | `{ code, player }` → `{ id, role }` |
| POST | `/start` | `{ gameId, playerId }` |
| POST | `/play` | `{ gameId, playerId, cardId, chosenSuit? }` |
| POST | `/draw` | `{ gameId, playerId }` |
| POST | `/leave` | `{ gameId, playerId }` |
| POST | `/rematch` | `{ gameId, playerId }` |

`GET /health` → liveness probe.

---

## 1. Local development

```bash
cd backend
cp .env.example .env
# fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
# → http://localhost:8080
```

Get the **service role key** from Lovable Cloud → Backend → Project Settings → API.
**Never expose it to the frontend.** It bypasses RLS.

---

## 2. Deploy on a VPS (Docker)

Works with **Coolify**, **Dokploy**, **Caprover**, **Portainer**, or plain `docker compose`.

### Option A — Plain Docker on a VPS

```bash
# On your VPS:
git clone <your-backend-repo> blazing8s-backend
cd blazing8s-backend
cp .env.example .env
nano .env   # fill in real values

docker build -t blazing8s-backend .
docker run -d --name blazing8s \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  blazing8s-backend
```

Put **Caddy** or **Nginx** in front for HTTPS:

```caddyfile
api.yourdomain.com {
  reverse_proxy localhost:8080
}
```

### Option B — Coolify / Dokploy (recommended)

1. New Resource → **Application** → connect your GitHub repo (`backend/` folder).
2. Build pack: **Dockerfile**.
3. Add environment variables from `.env.example`.
4. Set **Port**: `8080`.
5. Attach a domain → it provisions HTTPS automatically.

### Option C — `docker-compose.yml`

```yaml
services:
  api:
    build: .
    restart: unless-stopped
    ports: ["8080:8080"]
    env_file: .env
```

```bash
docker compose up -d
```

---

## 3. Required environment variables

| Var | Required | Notes |
|---|---|---|
| `PORT` | no | Default `8080` |
| `CORS_ORIGINS` | yes | Comma-separated. Your Cloudflare Pages URL + custom domain. e.g. `https://blazing8s.pages.dev,https://blazing8s.com` |
| `SUPABASE_URL` | yes | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **SECRET** — service role, server-only |

---

## 4. Connecting the frontend

In your frontend's `.env`:
```
VITE_API_URL=https://api.yourdomain.com
```

That's it — the frontend hits `${VITE_API_URL}/api/games/*`.

---

## 5. Database

Schema lives in the Supabase project (shared with the original Lovable app). If you're starting fresh, copy the SQL from `../supabase/migrations/` and run it on your Supabase project. The backend uses the service role key, so RLS does not block writes.
