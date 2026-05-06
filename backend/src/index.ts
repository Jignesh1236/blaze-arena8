import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { games } from "./routes/games.js";

const app = new Hono();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (allowedOrigins.includes("*")) return origin || "*";
      if (origin && allowedOrigins.includes(origin)) return origin;
      return allowedOrigins[0] ?? "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "blazing8s-backend" }));
app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/games", games);

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🔥 Blazing 8s backend running on http://localhost:${info.port}`);
});
