// Simple JSON file store for games. Replaces Supabase.
// - In-memory map, periodically flushed to disk.
// - Games inactive longer than TTL_MS are deleted automatically.
// - No persistent user IDs: players exist only inside a game record and
//   disappear when the game is cleaned up.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { GameRow } from "./game.js";

const DATA_FILE = process.env.DATA_FILE ?? "./data/games.json";
export const TTL_MS = Number(process.env.GAME_TTL_MS ?? 5 * 60 * 60 * 1000); // 5h
const FLUSH_MS = 1000;
const SWEEP_MS = 10 * 60 * 1000; // 10m

type Games = Record<string, GameRow>;

let games: Games = {};
let dirty = false;

function load() {
  try {
    if (!existsSync(DATA_FILE)) return;
    const raw = readFileSync(DATA_FILE, "utf8");
    games = JSON.parse(raw) as Games;
  } catch (e) {
    console.error("[store] failed to load:", e);
    games = {};
  }
}

function flush() {
  if (!dirty) return;
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(games), "utf8");
    dirty = false;
  } catch (e) {
    console.error("[store] failed to write:", e);
  }
}

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  let removed = 0;
  for (const [id, g] of Object.entries(games)) {
    const t = Date.parse(g.updated_at);
    if (!Number.isFinite(t) || t < cutoff) {
      delete games[id];
      removed++;
    }
  }
  if (removed > 0) {
    dirty = true;
    console.log(`[store] swept ${removed} inactive game(s)`);
  }
}

load();
setInterval(flush, FLUSH_MS).unref?.();
setInterval(sweep, SWEEP_MS).unref?.();

export const store = {
  get(id: string): GameRow | undefined {
    return games[id];
  },
  findByCode(code: string): GameRow | undefined {
    const upper = code.toUpperCase();
    return Object.values(games).find((g) => g.code === upper);
  },
  put(g: GameRow) {
    g.updated_at = new Date().toISOString();
    games[g.id] = g;
    dirty = true;
  },
  getAll(): GameRow[] {
    return Object.values(games);
  },
  delete(id: string) {
    delete games[id];
    dirty = true;
  },
  newId(): string {
    return (globalThis.crypto?.randomUUID?.() ?? fallbackUUID());
  },
};

function fallbackUUID(): string {
  // RFC4122 v4-ish fallback
  const b = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
