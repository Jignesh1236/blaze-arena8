import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildDeck,
  canPlay,
  genRoomCode,
  shuffle,
  type Card,
  type GameRow,
  type Player,
  type Suit,
} from "@/lib/game";

const HAND_SIZE = 7;

const playerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(24),
  avatar: z.string().min(1).max(8),
});

async function loadGame(id: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin.from("games").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Game not found");
  return data as unknown as GameRow;
}

function nextTurn(g: GameRow, skip = 0): string {
  const idx = g.players.findIndex((p) => p.id === g.current_turn);
  const n = g.players.length;
  const step = g.direction * (1 + skip);
  return g.players[(idx + step + n * 10) % n].id;
}

function reshuffleIfNeeded(g: GameRow) {
  if (g.deck.length > 0) return;
  if (g.discard.length <= 1) return;
  const top = g.discard[g.discard.length - 1];
  const rest = g.discard.slice(0, -1);
  g.deck = shuffle(rest);
  g.discard = [top];
}

function drawCards(g: GameRow, userId: string, n: number) {
  const hand = g.hands[userId] ?? [];
  for (let i = 0; i < n; i++) {
    reshuffleIfNeeded(g);
    const c = g.deck.shift();
    if (!c) break;
    hand.push(c);
  }
  g.hands[userId] = hand;
}

async function persist(g: GameRow) {
  const { error } = await supabaseAdmin
    .from("games")
    .update({
      status: g.status,
      players: g.players as never,
      spectators: (g.spectators ?? []) as never,
      hands: g.hands as never,
      deck: g.deck as never,
      discard: g.discard as never,
      current_suit: g.current_suit,
      current_turn: g.current_turn,
      direction: g.direction,
      draw_count: g.draw_count,
      pending_draw_rank: g.pending_draw_rank ?? null,
      last_action: g.last_action as never,
      winner_id: g.winner_id,
      host_id: g.host_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", g.id);
  if (error) throw new Error(error.message);
}

export const createGame = createServerFn({ method: "POST" })
  .inputValidator((d: { player: Player }) => z.object({ player: playerSchema }).parse(d))
  .handler(async ({ data }) => {
    const player = data.player;
    let code = genRoomCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin.from("games").select("id").eq("code", code).maybeSingle();
      if (!existing) break;
      code = genRoomCode();
    }
    const { data: row, error } = await supabaseAdmin
      .from("games")
      .insert({
        code,
        host_id: player.id,
        status: "lobby",
        players: [player] as never,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id, code };
  });

export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; player: Player }) =>
    z.object({ code: z.string().min(3).max(8), player: playerSchema }).parse(d)
  )
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase().trim();
    const player = data.player;
    const { data: game, error } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error || !game) throw new Error("Room not found");
    const g = game as unknown as GameRow;
    // Already a player? just rejoin.
    if (g.players.some((p) => p.id === player.id)) return { id: g.id, role: "player" as const };
    if (g.status === "lobby") {
      if (g.players.length >= 6) throw new Error("Room is full");
      g.players.push(player);
      await supabaseAdmin
        .from("games")
        .update({ players: g.players as never, updated_at: new Date().toISOString() })
        .eq("id", g.id);
      return { id: g.id, role: "player" as const };
    }
    // Game in progress or finished — join as spectator
    const spectators = g.spectators ?? [];
    if (!spectators.some((p) => p.id === player.id)) spectators.push(player);
    await supabaseAdmin
      .from("games")
      .update({ spectators: spectators as never, updated_at: new Date().toISOString() })
      .eq("id", g.id);
    return { id: g.id, role: "spectator" as const };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((d: { gameId: string; playerId: string }) =>
    z.object({ gameId: z.string().uuid(), playerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const g = await loadGame(data.gameId);
    if (g.host_id !== data.playerId) throw new Error("Only host can start");
    if (g.status !== "lobby") throw new Error("Already started");
    if (g.players.length < 2) throw new Error("Need at least 2 players");
    const deck = buildDeck();
    // 2 players: remove Queens (no reverse in head-to-head)
    const filteredDeck = g.players.length === 2 ? deck.filter((c) => c.rank !== "Q") : deck;
    const hands: Record<string, Card[]> = {};
    for (const p of g.players) hands[p.id] = [];
    for (let i = 0; i < HAND_SIZE; i++) {
      for (const p of g.players) hands[p.id].push(filteredDeck.shift()!);
    }
    let first = filteredDeck.shift()!;
    // Avoid special cards as the first discard
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
    g.last_action = { type: "start", text: "Game started" };
    await persist(g);
    return { ok: true };
  });

export const playCard = createServerFn({ method: "POST" })
  .inputValidator((d: { gameId: string; playerId: string; cardId: string; chosenSuit?: Suit }) =>
    z.object({
      gameId: z.string().uuid(),
      playerId: z.string().uuid(),
      cardId: z.string().min(1),
      chosenSuit: z.enum(["hearts", "diamonds", "clubs", "spades"]).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const g = await loadGame(data.gameId);
    const userId = data.playerId;
    if (g.status !== "playing") throw new Error("Not in play");
    if (g.current_turn !== userId) throw new Error("Not your turn");
    const hand = g.hands[userId] ?? [];
    const cardIdx = hand.findIndex((c) => c.id === data.cardId);
    if (cardIdx === -1) throw new Error("Card not in hand");
    const card = hand[cardIdx];
    const top = g.discard[g.discard.length - 1];
    if (!g.current_suit) throw new Error("Bad state");
    if (!canPlay(card, top, g.current_suit, g.draw_count)) throw new Error("Illegal move");
    if ((card.rank === "8" || card.rank === "K") && !data.chosenSuit) throw new Error("Choose a suit");

    hand.splice(cardIdx, 1);
    g.hands[userId] = hand;
    g.discard.push(card);
    g.current_suit = (card.rank === "8" || card.rank === "K") ? data.chosenSuit! : card.suit;

    let skip = 0;
    let actionText = `Played ${card.rank}${suitSym(card.suit)}`;

    if (card.rank === "+1") {
      // +1: next player draws 1 but still takes their turn
      const nextId = nextTurn(g, 0);
      if (nextId) drawCards(g, nextId, 1);
      actionText += ` — +1 to next!`;
    } else if (card.rank === "K") {
      // Switcheroo: swap hands with the next player
      const nextId = nextTurn(g, 0);
      if (nextId && nextId !== userId) {
        const mine = g.hands[userId] ?? [];
        const theirs = g.hands[nextId] ?? [];
        g.hands[userId] = theirs;
        g.hands[nextId] = mine;
        actionText += ` — Switcheroo! 🔄`;
      }
    } else if (card.rank === "J") {
      // Skip next player. In 2-player, same player goes again.
      skip = 1;
      actionText += " — skip!";
    } else if (card.rank === "Q") {
      // Reverse direction (Q is excluded from deck in 2-player)
      g.direction *= -1;
      actionText += " — reverse!";
    } else if (card.rank === "8") {
      actionText = `Played ★ wild — chose ${data.chosenSuit}`;
    }
    if (card.rank === "K") {
      actionText += ` — chose ${data.chosenSuit}`;
    }

    if ((g.hands[userId]?.length ?? 0) === 0) {
      g.status = "finished";
      g.winner_id = userId;
      g.last_action = { type: "win", by: userId, text: actionText };
      await persist(g);
      return { ok: true, won: true };
    }

    g.current_turn = nextTurn(g, skip);
    g.last_action = { type: "play", by: userId, text: actionText };
    await persist(g);
    return { ok: true };
  });

export const drawCard = createServerFn({ method: "POST" })
  .inputValidator((d: { gameId: string; playerId: string }) =>
    z.object({ gameId: z.string().uuid(), playerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const g = await loadGame(data.gameId);
    const userId = data.playerId;
    if (g.status !== "playing") throw new Error("Not in play");
    if (g.current_turn !== userId) throw new Error("Not your turn");
    drawCards(g, userId, 1);
    g.last_action = { type: "draw", by: userId, text: `Drew 1` };
    g.current_turn = nextTurn(g);
    await persist(g);
    return { ok: true };
  });

export const leaveGame = createServerFn({ method: "POST" })
  .inputValidator((d: { gameId: string; playerId: string }) =>
    z.object({ gameId: z.string().uuid(), playerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const g = await loadGame(data.gameId);
    const userId = data.playerId;
    // If they were a spectator, just remove them.
    const wasSpectator = (g.spectators ?? []).some((p) => p.id === userId);
    if (wasSpectator && !g.players.some((p) => p.id === userId)) {
      const spectators = (g.spectators ?? []).filter((p) => p.id !== userId);
      await supabaseAdmin
        .from("games")
        .update({ spectators: spectators as never, updated_at: new Date().toISOString() })
        .eq("id", g.id);
      return { ok: true };
    }
    g.players = g.players.filter((p) => p.id !== userId);
    delete g.hands[userId];
    if (g.players.length === 0 && (g.spectators?.length ?? 0) === 0) {
      await supabaseAdmin.from("games").delete().eq("id", g.id);
      return { ok: true };
    }
    if (g.players.length === 0) {
      // promote spectators to players, back to lobby
      g.players = [...(g.spectators ?? [])];
      g.spectators = [];
      g.host_id = g.players[0]?.id ?? g.host_id;
      g.status = "lobby";
      g.hands = {};
      g.deck = [];
      g.discard = [];
      g.current_suit = null;
      g.current_turn = null;
      g.draw_count = 0;
      g.pending_draw_rank = null;
      g.winner_id = null;
    }
    if (g.current_turn === userId) g.current_turn = g.players[0].id;
    if (g.host_id === userId) g.host_id = g.players[0].id;
    if (g.status === "playing" && g.players.length === 1) {
      g.status = "finished";
      g.winner_id = g.players[0].id;
    }
    g.last_action = { type: "leave", by: userId, text: "Player left" };
    await persist(g);
    return { ok: true };
  });

export const rematch = createServerFn({ method: "POST" })
  .inputValidator((d: { gameId: string; playerId: string }) =>
    z.object({ gameId: z.string().uuid(), playerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const g = await loadGame(data.gameId);
    if (g.status !== "finished") throw new Error("Game not finished");
    // Merge spectators into players (cap 6)
    const merged = [...g.players];
    for (const s of g.spectators ?? []) {
      if (!merged.some((p) => p.id === s.id) && merged.length < 6) merged.push(s);
    }
    g.players = merged;
    g.spectators = [];
    g.status = "lobby";
    g.hands = {};
    g.deck = [];
    g.discard = [];
    g.current_suit = null;
    g.current_turn = null;
    g.direction = 1;
    g.draw_count = 0;
    g.pending_draw_rank = null;
    g.winner_id = null;
    g.last_action = { type: "rematch", text: "New round!" };
    await persist(g);
    return { ok: true };
  });

function suitSym(s: Suit) {
  return s === "hearts" ? "♥" : s === "diamonds" ? "♦" : s === "clubs" ? "♣" : "♠";
}
