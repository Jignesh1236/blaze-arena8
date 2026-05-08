import type { Player, Suit, GameRow } from "./game";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
if (!API) console.warn("VITE_API_URL is not set — backend calls will fail.");

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export type PublicGame = {
  id: string; code: string; status: string;
  players: { id: string; name: string; avatar: string }[];
  host_id: string; updated_at: string;
};

export const api = {
  getAllGames: () => get<PublicGame[]>("/api/games"),
  getGame: (gameId: string) =>
    get<GameRow>(`/api/games/${gameId}`),
  createGame: (player: Player) =>
    post<{ id: string; code: string }>("/api/games/create", { player }),
  joinGame: (code: string, player: Player) =>
    post<{ id: string; role: "player" | "spectator" }>("/api/games/join", { code, player }),
  startGame: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/start", { gameId, playerId }),
  playCard: (gameId: string, playerId: string, cardId: string, chosenSuit?: Suit) =>
    post<{ ok: true; won?: boolean }>("/api/games/play", { gameId, playerId, cardId, chosenSuit }),
  drawCard: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/draw", { gameId, playerId }),
  leaveGame: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/leave", { gameId, playerId }),
  rematch: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/rematch", { gameId, playerId }),
  becomeSpectator: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/spectate", { gameId, playerId }),
  addAi: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/add-ai", { gameId, playerId }),
  voteToSpectate: (gameId: string, playerId: string, targetId: string) =>
    post<{ ok: true }>("/api/games/vote-spectate", { gameId, playerId, targetId }),
  castVote: (gameId: string, playerId: string, vote: "yes" | "no") =>
    post<{ ok: true }>("/api/games/cast-vote", { gameId, playerId, vote }),
  cancelVote: (gameId: string, playerId: string) =>
    post<{ ok: true }>("/api/games/cancel-vote", { gameId, playerId }),
};
