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

interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  avatar: string;
  text: string;
  ts: number;
}

const chatRooms = new Map<string, ChatMessage[]>();
const MAX_CHAT = 100;

// Voice chat rooms: gameId -> Map<playerId, socketId>
const voiceRooms = new Map<string, Map<string, string>>();

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
});

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
  socket.on("join", (gameId: string) => {
    socket.join(`game:${gameId}`);
    const history = chatRooms.get(gameId) ?? [];
    socket.emit("chat:history", history);
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

  // Global chat (lobby room, not persisted)
  socket.on("global:send", ({ name, avatar, text }: { name: string; avatar: string; text: string }) => {
    const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, avatar, text: text.trim().slice(0, 200) };
    if (!msg.text) return;
    io.to("lobby").emit("global:msg", msg);
  });

  socket.on("player:move", (data: { gameId: string; playerId: string; x: number; y: number }) => {
    socket.to(`game:${data.gameId}`).emit("player:moved", data);
  });

  socket.on("chat:send", (data: { gameId: string; playerId: string; name: string; avatar: string; text: string }) => {
    const text = (data.text ?? "").trim().slice(0, 200);
    if (!text) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: data.playerId,
      name: data.name,
      avatar: data.avatar,
      text,
      ts: Date.now(),
    };
    const room = chatRooms.get(data.gameId) ?? [];
    room.push(msg);
    if (room.length > MAX_CHAT) room.splice(0, room.length - MAX_CHAT);
    chatRooms.set(data.gameId, room);
    io.to(`game:${data.gameId}`).emit("chat:message", msg);
  });

  // ── Voice chat signaling ──
  socket.on("voice:join", ({ gameId, playerId }: { gameId: string; playerId: string }) => {
    if (!voiceRooms.has(gameId)) voiceRooms.set(gameId, new Map());
    const room = voiceRooms.get(gameId)!;
    room.set(playerId, socket.id);
    // Tell joiner who's already in voice
    const existing = Array.from(room.entries())
      .filter(([pid]) => pid !== playerId)
      .map(([pid, sid]) => ({ playerId: pid, socketId: sid }));
    socket.emit("voice:room-peers", existing);
    // Tell existing peers about the new joiner
    socket.to(`game:${gameId}`).emit("voice:peer-joined", { playerId, socketId: socket.id });
  });

  socket.on("voice:leave", ({ gameId, playerId }: { gameId: string; playerId: string }) => {
    voiceRooms.get(gameId)?.delete(playerId);
    socket.to(`game:${gameId}`).emit("voice:peer-left", { playerId });
  });

  // Route WebRTC signals directly to target socket (include fromSocketId to fix race condition)
  socket.on("voice:signal", ({ toSocketId, fromPlayerId, signal }: { toSocketId: string; fromPlayerId: string; signal: unknown }) => {
    io.to(toSocketId).emit("voice:signal", { fromPlayerId, fromSocketId: socket.id, signal });
  });

  // Broadcast speaking status to room
  socket.on("voice:speaking", ({ gameId, playerId, speaking }: { gameId: string; playerId: string; speaking: boolean }) => {
    socket.to(`game:${gameId}`).emit("voice:speaking", { playerId, speaking });
  });

  // Clean up voice on disconnect
  socket.on("disconnect", () => {
    for (const [gameId, players] of voiceRooms.entries()) {
      for (const [playerId, sid] of players.entries()) {
        if (sid === socket.id) {
          players.delete(playerId);
          io.to(`game:${gameId}`).emit("voice:peer-left", { playerId });
          break;
        }
      }
    }
  });
});

gameEmitter.on("game:update", (g: GameRow) => {
  io.to(`game:${g.id}`).emit("game:update", g);
  broadcastLobby();
});

// Inactivity check every 5 seconds
setInterval(async () => {
  const allGames = store.getAll();
  const now = new Date().getTime();
  for (const g of allGames) {
    if (g.status === "playing" && g.last_turn_at) {
      const lastTurn = new Date(g.last_turn_at).getTime();
      if (now - lastTurn > 60000) {
        await forceSkipTurn(g.id);
      }
    }
  }
}, 5000);
