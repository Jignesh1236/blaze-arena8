export const AVATAR_SEEDS = [
  "Felix", "Milo", "Nova", "Luna", "Blaze", "Cody",
  "Ranger", "Scout", "Dusty", "Storm", "Rio", "Chase",
];

const STYLE = "adventurer";

export function avatarUrl(seed: string): string {
  if (!seed) return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=Felix`;
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}
