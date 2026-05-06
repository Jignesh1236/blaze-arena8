import { EventEmitter } from "node:events";
import type { GameRow } from "./game.js";

export const gameEmitter = new EventEmitter();

export function emitGameUpdate(g: GameRow) {
  gameEmitter.emit("game:update", g);
}
