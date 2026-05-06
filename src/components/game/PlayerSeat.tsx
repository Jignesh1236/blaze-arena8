import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

interface Props {
  player: Player;
  cardCount: number;
  isCurrent?: boolean;
  isHost?: boolean;
  isYou?: boolean;
}

export function PlayerSeat({ player, cardCount, isCurrent, isHost, isYou }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-1 transition-transform", isCurrent && "scale-110")}>
      <div
        className={cn(
          "relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sunset border-4 flex items-center justify-center text-3xl sm:text-4xl shadow-card",
          isCurrent ? "border-accent animate-pulse-glow" : "border-amber-200/40",
        )}
      >
        <span>{player.avatar}</span>
        {isHost && <span className="absolute -top-2 -right-2 text-lg">👑</span>}
        <span className="absolute -bottom-2 -right-2 bg-card border border-border rounded-full px-2 py-0.5 text-xs font-bold text-foreground shadow">
          {cardCount}
        </span>
      </div>
      <span
        className={cn(
          "text-xs sm:text-sm font-display max-w-24 truncate px-2 py-0.5 rounded",
          isYou ? "bg-accent text-accent-foreground" : "text-foreground",
        )}
      >
        {player.name}
      </span>
    </div>
  );
}