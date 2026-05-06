import { SUIT_HEX, SUIT_SYMBOL, type Card, type Suit } from "@/lib/game";

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
  sm: "w-10 h-[58px] text-sm",
  md: "w-14 h-20 text-base",
  lg: "w-20 h-28 text-2xl",
};

const cornerSizes = {
  sm: "text-[9px]",
  md: "text-[11px]",
  lg: "text-[14px]",
};

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PlayingCard({ card, faceDown, size = "md", onClick, disabled, highlight, overrideSuit }: Props) {
  if (faceDown || !card) {
    return (
      <div className={cn(
        "rounded-xl border-4 border-amber-900/40 bg-gradient-to-br from-[oklch(0.55_0.20_28)] to-[oklch(0.35_0.15_28)] shadow-card relative overflow-hidden flex-shrink-0",
        sizes[size],
      )}>
        <div className="absolute inset-1 rounded-lg border-2 border-amber-200/20 flex items-center justify-center text-amber-100/80 font-display">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[0.55em] tracking-tighter opacity-50">SALOON</span>
            <span className="text-[0.7em] tracking-widest -rotate-12 border-y border-amber-200/40 py-0.5 px-1">BLAZIN'</span>
            <span className="text-[0.9em] opacity-40">🎴</span>
          </div>
        </div>
      </div>
    );
  }

  const isWild = card.rank === "8" || card.rank === "K";
  const displaySuit = overrideSuit ?? (isWild ? undefined : card.suit);
  const colorHex = displaySuit ? SUIT_HEX[displaySuit] : SUIT_HEX.spades;
  const sym = displaySuit ? SUIT_SYMBOL[displaySuit] : "";
  const isSwitch = card.rank === "K";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "rounded-xl border-2 bg-white shadow-card relative overflow-hidden transition-all select-none card-fancy flex-shrink-0",
        sizes[size],
        onClick && !disabled && "cursor-pointer",
        disabled && onClick && "opacity-55 cursor-not-allowed",
        highlight && "ring-4 ring-[var(--color-accent)] ring-offset-1 ring-offset-transparent -translate-y-5 z-50 relative",
        isWild ? "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100" : "border-gray-200",
      )}
      style={{ color: colorHex }}
    >
      {/* Inner border */}
      <div className="absolute inset-[3px] border border-gray-100 rounded-lg pointer-events-none" />

      {/* Top-left corner */}
      <div className={cn("absolute top-1 left-1 leading-none flex flex-col items-center font-display z-10 font-bold", cornerSizes[size])}>
        <span>{isSwitch ? "K" : card.rank}</span>
        {sym && <span>{sym}</span>}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className={cn("absolute bottom-1 right-1 leading-none flex flex-col items-center rotate-180 font-display z-10 font-bold", cornerSizes[size])}>
        <span>{isSwitch ? "K" : card.rank}</span>
        {sym && <span>{sym}</span>}
      </div>

      {/* Center symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isSwitch
          ? <span style={{ color: "oklch(0.78 0.16 70)", fontSize: size === "lg" ? "2rem" : size === "md" ? "1.4rem" : "1rem" }}>⇄</span>
          : card.rank === "8"
            ? <span style={{ color: "oklch(0.78 0.16 70)", fontSize: size === "lg" ? "2rem" : size === "md" ? "1.4rem" : "1rem" }}>★</span>
            : <span style={{ fontSize: size === "lg" ? "2.2rem" : size === "md" ? "1.6rem" : "1.1rem", opacity: 0.9 }}>{sym}</span>
        }
      </div>

      {/* Glossy highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent pointer-events-none rounded-xl" />
    </button>
  );
}
