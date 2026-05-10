import { store } from "./store.js";
import { buildDeck, canPlay, shuffle, suitSym, type Card, type GameRow, type Suit, type Player } from "./game.js";
import { emitGameUpdate } from "./emitter.js";

export const HAND_SIZE = 7;

export async function loadGame(id: string): Promise<GameRow> {
  const g = store.get(id);
  if (!g) throw new Error("Game not found");
  return g;
}

export function nextTurn(g: GameRow, skip = 0): string {
  const players = g.players;
  const idx = players.findIndex((p) => p.id === g.current_turn);
  const n = players.length;
  const step = g.direction * (1 + skip);
  return players[(idx + step + n * 10) % n].id;
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
  emitGameUpdate(g);
  
  // Trigger AI logic if it's an AI's turn
  if (g.status === "playing" && g.current_turn?.startsWith("bot-")) {
    setTimeout(() => handleBotTurn(g.id), 2000); // 2s delay for realism
  }
}

async function handleBotTurn(gameId: string) {
  const g = store.get(gameId);
  if (!g || g.status !== "playing" || !g.current_turn?.startsWith("bot-")) return;

  const botId = g.current_turn;
  const hand = g.hands[botId] ?? [];
  const top = g.discard[g.discard.length - 1];
  const currentSuit = g.current_suit;

  if (!currentSuit) return;

  // Find playable cards
  const playable = hand.filter(c => canPlay(c, top, currentSuit));

  if (playable.length > 0) {
    // Basic AI strategy: play special cards first
    playable.sort((a, b) => {
      const special = ["8", "K", "+1", "Q", "J"];
      const aIdx = special.indexOf(a.rank);
      const bIdx = special.indexOf(b.rank);
      return (bIdx === -1 ? -100 : bIdx) - (aIdx === -1 ? -100 : aIdx);
    });

    const card = playable[0];
    let chosenSuit: Suit | undefined;
    if (card.rank === "8") {
      // AI chooses suit it has the most of
      const counts: Record<string, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
      hand.forEach(c => { if (c.suit !== "wild") counts[c.suit]++; });
      chosenSuit = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0] as Suit;
    }

    // Call the internal play logic (simplified version of the route logic)
    const cardIdx = hand.findIndex(c => c.id === card.id);
    hand.splice(cardIdx, 1);
    g.hands[botId] = hand;
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
      if (nextId && nextId !== botId) {
        const mine = g.hands[botId] ?? [];
        const theirs = g.hands[nextId] ?? [];
        g.hands[botId] = theirs;
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

    if (hand.length === 0) {
      g.status = "finished";
      g.winner_id = botId;
      g.last_action = { type: "win", by: botId, card_rank: card.rank, text: actionText };
    } else {
      g.current_turn = nextTurn(g, skip);
      g.last_turn_at = new Date().toISOString();
      g.last_action = { type: "play", by: botId, card_rank: card.rank, swap_target: swapTarget, text: actionText };
    }
  } else {
    // Draw card
    drawCards(g, botId, 1);
    g.last_action = { type: "draw", by: botId, text: "AI Drew 1" };
    g.current_turn = nextTurn(g);
    g.last_turn_at = new Date().toISOString();
  }

  await persist(g);
}

export async function forceSkipTurn(gameId: string) {
  const g = store.get(gameId);
  if (!g || g.status !== "playing" || !g.current_turn) return;

  const player = g.players.find((p) => p.id === g.current_turn);
  const actionText = `${player?.name || "Player"} was too slow! Turn skipped.`;

  g.current_turn = nextTurn(g);
  g.last_turn_at = new Date().toISOString();
  g.last_action = { type: "skip", text: actionText };
  await persist(g);
}

export async function movePlayerToSpectator(g: GameRow, playerId: string) {
  const player = g.players.find((p) => p.id === playerId);
  if (!player) return;

  // Move player to spectators
  g.players = g.players.filter((p) => p.id !== playerId);
  if (!g.spectators.some((p) => p.id === playerId)) {
    g.spectators.push(player);
  }
  delete g.hands[playerId];

  // Reset active vote if this was the target
  if (g.activeVote?.targetId === playerId) {
    g.activeVote = null;
  }

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
}

export { buildDeck, canPlay, suitSym, type Card, type GameRow, type Suit };
