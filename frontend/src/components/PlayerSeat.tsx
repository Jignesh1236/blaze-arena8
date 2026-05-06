import type { Player } from "@/lib/game";
import { PlayingCard } from "./PlayingCard";

export function PlayerSeat({ player, cardCount, isCurrent, isHost }: {
  player: Player; cardCount: number; isCurrent?: boolean; isHost?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${isCurrent ? "scale-110 z-30" : "scale-100 z-10"}`}>
      <div className="relative group">
        {/* Hand of cards behind/around avatar */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <div
              key={i}
              className="absolute transition-transform duration-500"
              style={{
                transform: `rotate(${(i - (Math.min(cardCount, 5) - 1) / 2) * 15}deg) translateY(-35px)`,
              }}
            >
              <PlayingCard faceDown size="sm" />
            </div>
          ))}
        </div>

        {/* Avatar Circle */}
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl transition-all ${isCurrent ? "border-[var(--color-accent)] shadow-[0_0_20px_rgba(190,155,0,0.6)]" : "border-amber-900/40"}`}>
          <span className="drop-shadow-sm">{player.avatar}</span>
          
          {isHost && (
            <div className="absolute -top-3 -left-1 bg-amber-100 rounded-full p-1 shadow-md border border-amber-300">
               <span className="text-sm">👑</span>
            </div>
          )}
          
          <div className="absolute -bottom-2 -right-2 bg-amber-950 text-amber-100 border-2 border-amber-400 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg">
            {cardCount}
          </div>
        </div>
      </div>
      
      <div className="px-3 py-0.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
        <span className="text-[10px] sm:text-xs font-display text-white truncate max-w-[80px] block">{player.name}</span>
      </div>
    </div>
  );
}
