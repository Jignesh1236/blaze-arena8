import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { Server as SocketIOServer } from "socket.io";
import { games } from "./routes/games.js";
import { gameEmitter } from "./lib/emitter.js";
import { store } from "./lib/store.js";
import { forceSkipTurn } from "./lib/engine.js";
import type { GameRow } from "./lib/game.js";

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
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🔥 Blazing 8s backend running on http://localhost:${info.port}`);
});

const io = new SocketIOServer(server as any, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ─── Voice Room Tracking ─────────────────────────────────────────────────────
// gameId → Map<playerId, socketId>
const voiceRooms = new Map<string, Map<string, string>>();
// socketId → { gameId, playerId } — for auto-cleanup on disconnect
const socketVoiceIndex = new Map<string, { gameId: string; playerId: string }>();

function voiceLeave(socketId: string) {
  const entry = socketVoiceIndex.get(socketId);
  if (!entry) return;
  const { gameId, playerId } = entry;
  socketVoiceIndex.delete(socketId);

  const room = voiceRooms.get(gameId);
  if (!room) return;
  room.delete(playerId);
  if (room.size === 0) voiceRooms.delete(gameId);

  // Notify all game participants that this peer left voice
  io.to(`game:${gameId}`).emit("voice:peer-left", { playerId });
  console.log(`[voice] ${playerId} left voice in game ${gameId} (room size: ${room.size})`);
}
// ─────────────────────────────────────────────────────────────────────────────

function getPublicGames() {
  return store.getAll().map((g) => ({
    id: g.id,
    code: g.code,
    status: g.status,
    players: g.players,
    host_id: g.host_id,
    updated_at: g.updated_at,
  }));
}

function broadcastLobby() {
  io.to("lobby").emit("lobby:update", getPublicGames());
}

io.on("connection", (socket) => {
  // ── Game room joins ───────────────────────────────────────────────────────
  socket.on("join", (gameId: string) => {
    socket.join(`game:${gameId}`);
  });

  socket.on("leave", (gameId: string) => {
    socket.leave(`game:${gameId}`);
  });

  socket.on("join:lobby", () => {
    socket.join("lobby");
    socket.emit("lobby:update", getPublicGames());
  });

  socket.on("leave:lobby", () => {
    socket.leave("lobby");
  });

  // ── Cursor tracking ───────────────────────────────────────────────────────
  socket.on("player:move", (data: { gameId: string; playerId: string; x: number; y: number }) => {
    socket.to(`game:${data.gameId}`).emit("player:moved", data);
  });

  // ── Voice Chat ────────────────────────────────────────────────────────────
  socket.on("voice:join", ({ gameId, playerId }: { gameId: string; playerId: string }) => {
    if (!gameId || !playerId) return;

    // If already in a voice room, leave it first
    voiceLeave(socket.id);

    // Get current peers BEFORE adding the new joiner
    const room = voiceRooms.get(gameId) ?? new Map<string, string>();

    // Build peer list for the joiner (everyone already in the room)
    const existingPeers = Array.from(room.entries()).map(([pid, sid]) => ({
      playerId: pid,
      socketId: sid,
    }));

    // Add this socket to the room
    room.set(playerId, socket.id);
    voiceRooms.set(gameId, room);
    socketVoiceIndex.set(socket.id, { gameId, playerId });

    socket.join(`voice:${gameId}`);

    // 1. Tell the joiner who's already in the room (they'll create WebRTC offers)
    socket.emit("voice:room-peers", existingPeers);
    console.log(`[voice] ${playerId} joined game ${gameId} — existing peers: ${existingPeers.map(p => p.playerId).join(", ") || "none"}`);

    // 2. Tell everyone already in the room about the new joiner (they wait for offers)
    socket.to(`game:${gameId}`).emit("voice:peer-joined", {
      playerId,
      socketId: socket.id,
    });
  });

  socket.on("voice:leave", ({ gameId, playerId }: { gameId: string; playerId: string }) => {
    voiceLeave(socket.id);
  });

  // WebRTC signaling relay — just forward to the target socket
  socket.on(
    "voice:signal",
    ({
      toSocketId,
      fromPlayerId,
      signal,
    }: {
      toSocketId: string;
      fromPlayerId: string;
      signal: unknown;
    }) => {
      io.to(toSocketId).emit("voice:signal", {
        fromPlayerId,
        fromSocketId: socket.id,
        signal,
      });
    },
  );

  // Speaking state broadcast — relay to all game participants
  socket.on(
    "voice:speaking",
    ({ gameId, playerId, speaking }: { gameId: string; playerId: string; speaking: boolean }) => {
      socket.to(`game:${gameId}`).emit("voice:speaking", { playerId, speaking });
    },
  );

  // ── Chat ──────────────────────────────────────────────────────────────────
  socket.on(
    "chat:send",
    (data: { gameId: string; name: string; avatar: string; text: string }) => {
      io.to(`game:${data.gameId}`).emit("chat:message", {
        id: Math.random().toString(36).slice(2, 9),
        ...data,
        at: new Date().toISOString(),
      });
    },
  );

  socket.on(
    "global:send",
    (data: { name: string; avatar: string; text: string }) => {
      io.to("lobby").emit("global:msg", {
        id: Math.random().toString(36).slice(2, 9),
        ...data,
        at: new Date().toISOString(),
      });
    },
  );

  // ── Cleanup on disconnect ─────────────────────────────────────────────────
  socket.on("disconnect", () => {
    voiceLeave(socket.id);
  });
});

gameEmitter.on("game:update", (g: GameRow) => {
  io.to(`game:${g.id}`).emit("game:update", g);
  broadcastLobby();
});

// Inactivity check every 10 seconds
setInterval(async () => {
  const allGames = store.getAll();
  const now = Date.now();
  const THIRTY_MINS = 30 * 60 * 1000;

  for (const g of allGames) {
    const lastUpdate = new Date(g.updated_at).getTime();
    if (now - lastUpdate > THIRTY_MINS) {
      console.log(`[cleanup] deleting room ${g.id} due to 30m inactivity`);
      store.delete(g.id);
      continue;
    }

    if (g.status === "playing" && g.last_turn_at) {
      const lastTurn = new Date(g.last_turn_at).getTime();
      if (now - lastTurn > 60000) {
        await forceSkipTurn(g.id);
      }
    }
  }
}, 10000);
