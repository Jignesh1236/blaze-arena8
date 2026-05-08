import { useEffect, useState } from "react";
import type { Player } from "./game";

const KEY = "blazing8s.profile";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function read(): Player | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Player;
    if (!p?.id || !p?.name || !p?.avatar) return null;
    return p;
  } catch { return null; }
}

export function useGuest() {
  const [profile, setProfile] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProfile(read());
    setLoading(false);
  }, []);

  function save(name: string, avatar: string): Player {
    const existing = read();
    const player: Player = {
      id: existing?.id ?? uuid(),
      name: name.trim().slice(0, 24) || "Cowpoke",
      avatar: avatar || "Felix",
    };
    localStorage.setItem(KEY, JSON.stringify(player));
    setProfile(player);
    return player;
  }

  function clear() {
    localStorage.removeItem(KEY);
    setProfile(null);
  }

  return { profile, loading, save, clear };
}
