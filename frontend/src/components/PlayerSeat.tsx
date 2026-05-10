import type { Player } from "@/lib/game";
import { PlayingCard } from "./PlayingCard";
import { avatarUrl } from "@/lib/avatar";

export function PlayerSeat({ player, cardCount, isCurrent, isHost, isSpeaking, onVote }: {
  player: Player; cardCount: number; isCurrent?: boolean; isHost?: boolean; isSpeaking?: boolean;
  onVote?: (id: string) => void;
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${isCurrent ? "scale-115 z-30" : "scale-100 z-10"}`}>
      <div className="relative group cursor-pointer" onClick={() => onVote?.(player.id)}>
        {/* Vote Hint */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-[8px] font-display px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none uppercase tracking-tighter">
          Click to Vote Kick
        </div>
        {/* Fan of face-down cards behind avatar */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <div
              key={i}
              className="absolute transition-transform duration-500"
              style={{
                transform: `rotate(${(i - (Math.min(cardCount, 5) - 1) / 2) * 18}deg) translateY(-38px)`,
              }}
            >
              <PlayingCard faceDown size="sm" />
            </div>
          ))}
        </div>

        {/* Avatar circle */}
        <div
          className="relative rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 overflow-hidden"
          style={{
            width: "clamp(52px, 6vw, 72px)",
            height: "clamp(52px, 6vw, 72px)",
            background: isCurrent
              ? "radial-gradient(circle at 38% 32%, rgba(255,210,80,0.22) 0%, rgba(30,14,4,0.95) 100%)"
              : "radial-gradient(circle at 38% 32%, rgba(80,40,10,0.9) 0%, rgba(20,8,2,0.97) 100%)",
            border: isCurrent
              ? "4px solid rgba(255,200,50,0.95)"
              : "4px solid rgba(175,100,20,0.85)",
            boxShadow: isCurrent
              ? "0 0 0 2px rgba(255,220,60,0.4), 0 0 18px rgba(255,200,50,0.5), 0 4px 16px rgba(0,0,0,0.5)"
              : "0 0 0 2px rgba(140,75,15,0.3), 0 4px 16px rgba(0,0,0,0.5)",
            transition: "all 0.4s",
          }}
        >
          <img
            src={avatarUrl(player.avatar)}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Speaking ring (Discord-style) */}
          {isSpeaking && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none z-20"
              style={{
                border: "4px solid #4ade80",
                boxShadow: "0 0 12px rgba(74,222,128,0.8)",
              }}
            />
          )}

          {isHost && (
            <div className="absolute -top-2 -left-1 bg-amber-100 rounded-full p-0.5 shadow-md border border-amber-300" style={{ fontSize: "10px" }}>
              👑
            </div>
          )}

          {/* Card count badge */}
          <div
            className="absolute -bottom-1.5 -right-1.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg"
            style={{
              width: "22px", height: "22px",
              background: isCurrent ? "rgba(200,130,15,0.95)" : "rgba(30,12,3,0.95)",
              border: isCurrent ? "2px solid rgba(255,210,50,0.8)" : "2px solid rgba(160,90,15,0.7)",
              color: isCurrent ? "rgba(255,240,180,1)" : "rgba(200,150,60,0.9)",
            }}
          >
            {cardCount}
          </div>
        </div>
      </div>

      {/* Name tag */}
      <div
        className="px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(175,100,20,0.3)",
        }}
      >
        <span className="text-[9px] sm:text-[11px] font-display truncate max-w-[72px] block"
          style={{ color: isCurrent ? "rgba(255,210,80,0.95)" : "rgba(220,180,100,0.75)" }}>
          {player.name}
        </span>
      </div>
    </div>
  );
}
