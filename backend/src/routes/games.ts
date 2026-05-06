import { Hono } from "hono";
import { z } from "zod";
import { store } from "../lib/store.js";
import { buildDeck, canPlay, genRoomCode, type Card, type GameRow } from "../lib/game.js";
import { HAND_SIZE, drawCards, loadGame, nextTurn, persist, suitSym } from "../lib/engine.js";

export const games = new Hono();

games.get("/", (c) => {
  const all = store.getAll().map((g) => ({
    id: g.id,
    code: g.code,
    status: g.status,
    players: g.players,
    host_id: g.host_id,
    updated_at: g.updated_at,
  }));
  return c.json(all);
});

games.get("/:id", async (c) => {
  const g = store.get(c.req.param("id"));
  if (!g) return c.json({ error: "Game not found" }, 404);
  return c.json(g);
});

const playerSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(24),
  avatar: z.string().min(1).max(8),
});

async function parseJson<T extends z.ZodTypeAny>(c: any, schema: T): Promise<z.infer<T>> {
  const raw = await c.req.json().catch(() => ({}));
  return schema.parse(raw);
}

function newGame(code: string, hostId: string, host: z.infer<typeof playerSchema>): GameRow {
  return {
    id: store.newId(),
    code,
    host_id: hostId,
    status: "lobby",
    players: [host],
    spectators: [],
    hands: {},
    deck: [],
    discard: [],
    current_suit: null,
    current_turn: null,
    direction: 1,
    draw_count: 0,
    pending_draw_rank: null,
    last_action: null,
    winner_id: null,
    last_turn_at: null,
    updated_at: new Date().toISOString(),
  };
}

games.post("/create", async (c) => {
  const { player } = await parseJson(c, z.object({ player: playerSchema }));
  let code = genRoomCode();
  for (let i = 0; i < 5 && store.findByCode(code); i++) code = genRoomCode();
  const g = newGame(code, player.id, player);
  await persist(g);
  return c.json({ id: g.id, code });
});

games.post("/join", async (c) => {
  const { code, player } = await parseJson(
    c,
    z.object({ code: z.string().min(3).max(8), player: playerSchema }),
  );
  const g = store.findByCode(code.trim());
  if (!g) return c.json({ error: "Room not found" }, 404);
  if (g.players.some((p) => p.id === player.id)) return c.json({ id: g.id, role: "player" });
  if (g.status === "lobby") {
    if (g.players.length >= 6) return c.json({ error: "Room is full" }, 400);
    g.players.push(player);
    await persist(g);
    return c.json({ id: g.id, role: "player" });
  }
  if (!g.spectators.some((p) => p.id === player.id)) g.spectators.push(player);
  await persist(g);
  return c.json({ id: g.id, role: "spectator" });
});

games.post("/start", async (c) => {
  const { gameId, playerId } = await parseJson(
    c,
    z.object({ gameId: z.string().min(1), playerId: z.string().min(1) }),
  );
  const g = await loadGame(gameId);
  if (g.host_id !== playerId) return c.json({ error: "Only host can start" }, 403);
  if (g.status !== "lobby") return c.json({ error: "Already started" }, 400);
  if (g.players.length < 2) return c.json({ error: "Need at least 2 players" }, 400);
  const deck = buildDeck();
  const filteredDeck = g.players.length === 2 ? deck.filter((c2) => c2.rank !== "Q") : deck;
  const hands: Record<string, Card[]> = {};
  for (const p of g.players) hands[p.id] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of g.players) hands[p.id].push(filteredDeck.shift()!);
  }
  let first = filteredDeck.shift()!;
  while (["8", "+1", "J", "Q", "K"].includes(first.rank)) {
    filteredDeck.push(first);
    first = filteredDeck.shift()!;
  }
  g.deck = filteredDeck;
  g.hands = hands;
  g.discard = [first];
  g.current_suit = first.suit;
  g.current_turn = g.players[0].id;
  g.direction = 1;
  g.draw_count = 0;
  g.pending_draw_rank = null;
  g.status = "playing";
  g.last_turn_at = new Date().toISOString();
  g.last_action = { type: "start", text: "Game started" };
  await persist(g);
  return c.json({ ok: true });
});

games.post("/play", async (c) => {
  const { gameId, playerId, cardId, chosenSuit } = await parseJson(
    c,
    z.object({
      gameId: z.string().min(1),
      playerId: z.string().min(1),
      cardId: z.string().min(1),
      chosenSuit: z.enum(["hearts", "diamonds", "clubs", "spades"]).optional(),
    }),
  );
  const g = await loadGame(gameId);
  if (g.status !== "playing") return c.json({ error: "Not in play" }, 400);
  if (g.current_turn !== playerId) return c.json({ error: "Not your turn" }, 400);
  const hand = g.hands[playerId] ?? [];
  const cardIdx = hand.findIndex((cd) => cd.id === cardId);
  if (cardIdx === -1) return c.json({ error: "Card not in hand" }, 400);
  const card = hand[cardIdx];
  const top = g.discard[g.discard.length - 1];
  if (!g.current_suit) return c.json({ error: "Bad state" }, 400);
  if (!canPlay(card, top, g.current_suit)) return c.json({ error: "Illegal move" }, 400);
  if (card.rank === "8" && !chosenSuit) return c.json({ error: "Choose a suit" }, 400);

  hand.splice(cardIdx, 1);
  g.hands[playerId] = hand;
  g.discard.push(card);
  g.current_suit = card.rank === "8" ? chosenSuit! : (card.suit === "wild" ? g.current_suit : card.suit);

  let skip = 0;
  let actionText = `Played ${card.rank}${suitSym(card.suit)}`;

  let swapTarget: string | undefined;

  if (card.rank === "+1") {
    const nextId = nextTurn(g, 0);
    if (nextId) drawCards(g, nextId, 1);
    actionText += " — +1 to next!";
  } else if (card.rank === "K") {
    const nextId = nextTurn(g, 0);
    if (nextId && nextId !== playerId) {
      const mine = g.hands[playerId] ?? [];
      const theirs = g.hands[nextId] ?? [];
      g.hands[playerId] = theirs;
      g.hands[nextId] = mine;
      swapTarget = nextId;
      actionText += " — Switcheroo! 🔄";
    }
  } else if (card.rank === "J") {
    skip = 1;
    actionText += " — skip!";
  } else if (card.rank === "Q") {
    g.direction *= -1;
    actionText += " — reverse!";
  } else if (card.rank === "8") {
    actionText = `Played ★ wild — chose ${chosenSuit}`;
  }

  if ((g.hands[playerId]?.length ?? 0) === 0) {
    g.status = "finished";
    g.winner_id = playerId;
    g.last_action = { type: "win", by: playerId, card_rank: card.rank, text: actionText };
    await persist(g);
    return c.json({ ok: true, won: true });
  }

  g.current_turn = nextTurn(g, skip);
  g.last_turn_at = new Date().toISOString();
  g.last_action = { type: "play", by: playerId, card_rank: card.rank, swap_target: swapTarget, text: actionText };
  await persist(g);
  return c.json({ ok: true });
});

games.post("/draw", async (c) => {
  const { gameId, playerId } = await parseJson(
    c,
    z.object({ gameId: z.string().min(1), playerId: z.string().min(1) }),
  );
  const g = await loadGame(gameId);
  if (g.status !== "playing") return c.json({ error: "Not in play" }, 400);
  if (g.current_turn !== playerId) return c.json({ error: "Not your turn" }, 400);
  drawCards(g, playerId, 1);
  g.last_action = { type: "draw", by: playerId, text: "Drew 1" };
  g.current_turn = nextTurn(g);
  g.last_turn_at = new Date().toISOString();
  await persist(g);
  return c.json({ ok: true });
});

games.post("/leave", async (c) => {
  const { gameId, playerId } = await parseJson(
    c,
    z.object({ gameId: z.string().min(1), playerId: z.string().min(1) }),
  );
  const g = await loadGame(gameId);
  const wasSpectator = g.spectators.some((p) => p.id === playerId);
  if (wasSpectator && !g.players.some((p) => p.id === playerId)) {
    g.spectators = g.spectators.filter((p) => p.id !== playerId);
    await persist(g);
    return c.json({ ok: true });
  }
  g.players = g.players.filter((p) => p.id !== playerId);
  delete g.hands[playerId];
  if (g.players.length === 0 && g.spectators.length === 0) {
    store.delete(g.id);
    return c.json({ ok: true });
  }
  if (g.players.length === 0) {
    g.players = [...g.spectators];
    g.spectators = [];
    g.host_id = g.players[0]?.id ?? g.host_id;
    g.status = "lobby";
    g.hands = {}; g.deck = []; g.discard = [];
    g.current_suit = null; g.current_turn = null;
    g.draw_count = 0; g.pending_draw_rank = null; g.winner_id = null;
  }
  if (g.current_turn === playerId) g.current_turn = g.players[0].id;
  if (g.host_id === playerId) g.host_id = g.players[0].id;
  if (g.status === "playing" && g.players.length === 1) {
    g.status = "finished";
    g.winner_id = g.players[0].id;
  }
  g.last_action = { type: "leave", by: playerId, text: "Player left" };
  await persist(g);
  return c.json({ ok: true });
});

games.post("/rematch", async (c) => {
  const { gameId } = await parseJson(
    c,
    z.object({ gameId: z.string().min(1), playerId: z.string().min(1) }),
  );
  const g = await loadGame(gameId);
  if (g.status !== "finished") return c.json({ error: "Game not finished" }, 400);
  const merged = [...g.players];
  for (const s of g.spectators) {
    if (!merged.some((p) => p.id === s.id) && merged.length < 6) merged.push(s);
  }
  g.players = merged;
  g.spectators = [];
  g.status = "lobby";
  g.hands = {}; g.deck = []; g.discard = [];
  g.current_suit = null; g.current_turn = null;
  g.direction = 1; g.draw_count = 0; g.pending_draw_rank = null; g.winner_id = null;
  g.last_action = { type: "rematch", text: "New round!" };
  await persist(g);
  return c.json({ ok: true });
});

games.post("/spectate", async (c) => {
  const { gameId, playerId } = await parseJson(
    c,
    z.object({ gameId: z.string().min(1), playerId: z.string().min(1) }),
  );
  const g = await loadGame(gameId);
  const player = g.players.find((p) => p.id === playerId);
  if (!player) return c.json({ error: "Not a player" }, 400);

  // Move player to spectators
  g.players = g.players.filter((p) => p.id !== playerId);
  if (!g.spectators.some((p) => p.id === playerId)) {
    g.spectators.push(player);
  }
  delete g.hands[playerId];

  // If game was playing and only 1 player left, they win
  if (g.status === "playing" && g.players.length === 1) {
    g.status = "finished";
    g.winner_id = g.players[0].id;
    g.last_action = { type: "win", by: g.players[0].id, text: `${player.name} became a spectator. ${g.players[0].name} wins!` };
  } else if (g.status === "playing" && g.players.length === 0) {
    // If no players left, go back to lobby
    g.status = "lobby";
    g.current_turn = null;
  } else if (g.current_turn === playerId && g.status === "playing") {
    // If it was their turn, move to next
    g.current_turn = nextTurn(g);
  }

  g.last_action = g.last_action || { type: "spectate", by: playerId, text: `${player.name} is now spectating` };
  await persist(g);
  return c.json({ ok: true });
});
