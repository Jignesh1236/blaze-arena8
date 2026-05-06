import { supabaseAdmin } from "./supabase.js";
import { buildDeck, canPlay, shuffle, suitSym, type Card, type GameRow, type Suit } from "./game.js";

export const HAND_SIZE = 7;

export async function loadGame(id: string): Promise<GameRow> {
  const { data, error } = await supabaseAdmin.from("games").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Game not found");
  return data as unknown as GameRow;
}

export function nextTurn(g: GameRow, skip = 0): string {
  const idx = g.players.findIndex((p) => p.id === g.current_turn);
  const n = g.players.length;
  const step = g.direction * (1 + skip);
  return g.players[(idx + step + n * 10) % n].id;
}

export function reshuffleIfNeeded(g: GameRow) {
  if (g.deck.length > 0) return;
  if (g.discard.length <= 1) return;
  const top = g.discard[g.discard.length - 1];
  const rest = g.discard.slice(0, -1);
  g.deck = shuffle(rest);
  g.discard = [top];
}

export function drawCards(g: GameRow, userId: string, n: number) {
  const hand = g.hands[userId] ?? [];
  for (let i = 0; i < n; i++) {
    reshuffleIfNeeded(g);
    const c = g.deck.shift();
    if (!c) break;
    hand.push(c);
  }
  g.hands[userId] = hand;
}

export async function persist(g: GameRow) {
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

export { buildDeck, canPlay, suitSym, type Card, type GameRow, type Suit };
