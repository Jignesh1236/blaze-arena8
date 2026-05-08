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



  socket.on("player:move", (data: { gameId: string; playerId: string; x: number; y: number }) => {
    socket.to(`game:${data.gameId}`).emit("player:moved", data);
  });

  // Voice Chat Events
  socket.on("voice:join", ({ gameId, playerId }) => {
    socket.join(`voice:${gameId}`);
    socket.to(`game:${gameId}`).emit("voice:peer-joined", { playerId, socketId: socket.id });
  });

  socket.on("voice:leave", ({ gameId, playerId }) => {
    socket.leave(`voice:${gameId}`);
    socket.to(`game:${gameId}`).emit("voice:peer-left", { playerId });
  });

  socket.on("voice:signal", ({ toSocketId, fromPlayerId, signal }) => {
    io.to(toSocketId).emit("voice:signal", { fromPlayerId, fromSocketId: socket.id, signal });
  });

  socket.on("voice:speaking", ({ gameId, playerId, speaking }) => {
    socket.to(`game:${gameId}`).emit("voice:speaking", { playerId, speaking });
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

