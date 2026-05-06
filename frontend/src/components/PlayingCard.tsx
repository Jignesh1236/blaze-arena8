import { SUIT_COLOR, SUIT_SYMBOL, type Card, type Suit } from "@/lib/game";

interface Props {
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  overrideSuit?: Suit;
}

const sizes = {
  sm: "w-12 h-[68px] text-base",
  md: "w-16 h-24 text-xl",
  lg: "w-24 h-36 text-3xl",
};

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PlayingCard({ card, faceDown, size = "md", onClick, disabled, highlight, overrideSuit }: Props) {
  if (faceDown || !card) {
    return (
      <div className={cn(
        "rounded-xl border-4 border-amber-900/40 bg-gradient-to-br from-[oklch(0.55_0.20_28)] to-[oklch(0.35_0.15_28)] shadow-card relative overflow-hidden",
        sizes[size],
      )}>
        <div className="absolute inset-1 rounded-lg border-2 border-amber-200/20 flex items-center justify-center text-amber-100/80 font-display">
          <div className="flex flex-col items-center gap-1">
             <span className="text-[0.6em] tracking-tighter opacity-50">THE SALOON</span>
             <span className="text-sm tracking-widest -rotate-12 border-y border-amber-200/40 py-1 px-2">BLAZIN'</span>
             <span className="text-[1.2em] opacity-40">🎴</span>
          </div>
        </div>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      </div>
    );
  }
  const isWild = card.rank === "8" || card.rank === "K";
  const displaySuit = overrideSuit ?? (isWild ? undefined : card.suit);
  const color = displaySuit ? SUIT_COLOR[displaySuit] : "black";
  const sym = displaySuit ? SUIT_SYMBOL[displaySuit] : "";
  const isSwitch = card.rank === "K";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border-2 bg-amber-50 shadow-card relative overflow-hidden transition-all select-none card-fancy",
        sizes[size],
        !disabled && onClick && "cursor-pointer",
        disabled && onClick && "opacity-60 cursor-not-allowed grayscale-[0.5]",
        highlight && "ring-4 ring-[var(--color-accent)] ring-offset-2 ring-offset-transparent -translate-y-6 z-50 relative",
        isWild ? "border-[var(--color-accent)] bg-amber-100/50" : "border-amber-200",
      )}
      style={{ 
        color: isWild ? "oklch(0.2 0.02 30)" : color === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.2 0.02 30)",
        background: isWild ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : undefined
      }}
    >
      {/* Decorative border */}
      <div className="absolute inset-1 border border-amber-900/10 rounded-lg pointer-events-none"></div>

      <div className="absolute top-1 left-1.5 leading-none flex flex-col items-center font-display z-10">
        <span className="text-[0.7em] font-bold">{isSwitch ? "↺" : card.rank}</span>
        <span className="text-[0.7em]">{sym}</span>
      </div>
      <div className="absolute bottom-1 right-1.5 leading-none flex flex-col items-center rotate-180 font-display z-10">
        <span className="text-[0.7em] font-bold">{isSwitch ? "↺" : card.rank}</span>
        <span className="text-[0.7em]">{sym}</span>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {isSwitch ? <span className="text-[1.6em]" style={{ color: "oklch(0.78 0.16 70)" }}>⇄</span>
            : card.rank === "8" ? <span className="text-[1.6em]" style={{ color: "oklch(0.78 0.16 70)" }}>★</span>
            : <span className="text-[1.8em] opacity-90 drop-shadow-sm">{sym}</span>}
          
          {/* Subtle background suit symbol */}
          {!isWild && (
             <span className="absolute inset-0 flex items-center justify-center text-[3em] opacity-[0.03] -z-10 scale-150 rotate-12">{sym}</span>
          )}
        </div>
      </div>

      {/* Glossy effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none"></div>
    </button>
  );
}
