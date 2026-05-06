import { store } from "./store.js";
import { buildDeck, canPlay, shuffle, suitSym, type Card, type GameRow, type Suit } from "./game.js";

export const HAND_SIZE = 7;

export async function loadGame(id: string): Promise<GameRow> {
  const g = store.get(id);
  if (!g) throw new Error("Game not found");
  return g;
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
  store.put(g);
}

export { buildDeck, canPlay, suitSym, type Card, type GameRow, type Suit };
