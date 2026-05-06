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
        "rounded-xl border-2 border-amber-200/40 bg-gradient-to-br from-[oklch(0.55_0.20_28)] to-[oklch(0.35_0.15_28)] shadow-card relative overflow-hidden",
        sizes[size],
      )}>
        <div className="absolute inset-1 rounded-lg border border-amber-200/30 flex items-center justify-center text-amber-100/80 font-display">
          <span className="text-xs tracking-widest -rotate-12">BLAZIN'</span>
        </div>
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
        "rounded-xl border-2 bg-amber-50 shadow-card relative overflow-hidden transition-transform select-none",
        sizes[size],
        !disabled && onClick && "hover:-translate-y-3 cursor-pointer",
        disabled && onClick && "opacity-60 cursor-not-allowed",
        highlight && "ring-4 ring-[var(--color-accent)] -translate-y-2",
        isWild ? "border-[var(--color-accent)]" : "border-amber-200",
      )}
      style={{ color: isWild ? "oklch(0.2 0.02 30)" : color === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.2 0.02 30)" }}
    >
      <div className="absolute top-1 left-1.5 leading-none flex flex-col items-center font-display">
        <span className="text-[0.7em] font-bold">{isSwitch ? "↺" : card.rank}</span>
        <span className="text-[0.7em]">{sym}</span>
      </div>
      <div className="absolute bottom-1 right-1.5 leading-none flex flex-col items-center rotate-180 font-display">
        <span className="text-[0.7em] font-bold">{isSwitch ? "↺" : card.rank}</span>
        <span className="text-[0.7em]">{sym}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        {isSwitch ? <span className="text-[1.6em]" style={{ color: "oklch(0.78 0.16 70)" }}>⇄</span>
          : card.rank === "8" ? <span className="text-[1.6em]" style={{ color: "oklch(0.78 0.16 70)" }}>★</span>
          : <span className="text-[1.4em]">{sym}</span>}
      </div>
    </button>
  );
}
