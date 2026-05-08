export const AVATAR_SEEDS = [
  "Felix", "Milo", "Nova", "Luna", "Blaze", "Cody",
  "Ranger", "Scout", "Dusty", "Storm", "Rio", "Chase",
];

const STYLE = "adventurer";

export function avatarUrl(seed: string): string {
  if (!seed) return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=Felix`;
  // JSON config from DiceBear customizer
  if (seed.startsWith("{")) {
    try {
      const cfg = JSON.parse(seed) as Record<string, string>;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(cfg)) {
        if (v) params.set(k, v);
      }
      return `https://api.dicebear.com/9.x/${STYLE}/svg?${params.toString()}`;
    } catch { /* fallback below */ }
  }
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}

export function isCustomConfig(seed: string): boolean {
  return seed.startsWith("{");
}
