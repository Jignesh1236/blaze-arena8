// Shared game types & logic. Mirror this file with frontend/src/lib/game.ts.
export type Suit = "hearts" | "diamonds" | "clubs" | "spades" | "wild";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "+1";

export interface Card { id: string; suit: Suit; rank: Rank; }

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const PLAYABLE_SUITS: Exclude<Suit, "wild">[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = ["2","3","4","5","6","7","9","10","J","Q"];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ id: `${r}-${s}-${Math.random().toString(36).slice(2,7)}`, suit: s, rank: r });
    }
    deck.push({ id: `+1-${s}-${Math.random().toString(36).slice(2,7)}`, suit: s, rank: "+1" });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `8-wild-${i}-${Math.random().toString(36).slice(2,7)}`, suit: "wild", rank: "8" });
  }
  for (let i = 0; i < 2; i++) {
    deck.push({ id: `K-wild-${i}-${Math.random().toString(36).slice(2,7)}`, suit: "wild", rank: "K" });
  }
  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function canPlay(card: Card, topCard: Card, currentSuit: Suit): boolean {
  if (card.rank === "8" || card.rank === "K") return true;
  return card.suit === currentSuit || card.rank === topCard.rank;
}

export function genRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export interface Player { id: string; name: string; avatar: string }

export interface GameRow {
  id: string;
  code: string;
  host_id: string;
  status: "lobby" | "playing" | "finished";
  players: Player[];
  spectators: Player[];
  hands: Record<string, Card[]>;
  deck: Card[];
  discard: Card[];
  current_suit: Suit | null;
  current_turn: string | null;
  direction: number;
  draw_count: number;
  pending_draw_rank: string | null;
  last_action: { type: string; by?: string; text?: string; swap_target?: string; card_rank?: string } | null;
  winner_id: string | null;
  last_turn_at: string | null;
  updated_at: string;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠", wild: "★",
};
export const SUIT_COLOR: Record<Suit, "red" | "black"> = {
  hearts: "red", diamonds: "red", clubs: "black", spades: "black", wild: "black",
};

export function suitSym(s: Suit) {
  return s === "hearts" ? "♥" : s === "diamonds" ? "♦" : s === "clubs" ? "♣" : s === "spades" ? "♠" : "★";
}
