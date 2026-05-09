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
  sm: { card: "w-10 h-[58px]", corner: "text-[9px]", center: "1rem", pip: "text-[8px]" },
  md: { card: "w-[52px] h-[74px]", corner: "text-[11px]", center: "1.3rem", pip: "text-[10px]" },
  lg: { card: "w-[76px] h-[106px]", corner: "text-[14px]", center: "2rem", pip: "text-[13px]" },
};

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// How many center pips to show for number cards
const PIP_COUNTS: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "9": 9, "10": 10,
};

export function PlayingCard({
  card,
  faceDown,
  size = "md",
  onClick,
  disabled,
  highlight,
  overrideSuit,
}: Props) {
  const sz = sizes[size];

  // ── Face-down / empty ────────────────────────────────────────────────────
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          "rounded-xl border-[3px] border-amber-900/40 bg-gradient-to-br from-[oklch(0.52_0.20_28)] to-[oklch(0.33_0.15_28)] shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative overflow-hidden flex-shrink-0 select-none",
          sz.card,
        )}
      >
        <div className="absolute inset-1 rounded-[8px] border border-amber-200/20 flex items-center justify-center text-amber-100/80 font-display">
          <div className="flex flex-col items-center gap-0.5">
            <span className={cn("tracking-tighter opacity-40", sz.pip)}>SALOON</span>
            <span
              className={cn("-rotate-12 border-y border-amber-200/35 py-0.5 px-1 tracking-widest", sz.pip)}
              style={{ fontSize: size === "lg" ? "0.7rem" : size === "md" ? "0.6rem" : "0.5rem" }}
            >
              BLAZIN'
            </span>
            <span className="opacity-35" style={{ fontSize: size === "lg" ? "0.9rem" : "0.75rem" }}>
              🎴
            </span>
          </div>
        </div>
        {/* Sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none rounded-xl" />
      </div>
    );
  }

  // ── Face-up card ─────────────────────────────────────────────────────────
  const isWild = card.rank === "8" || card.rank === "K";
  const isSwitch = card.rank === "K";
  const displaySuit = overrideSuit ?? (isWild ? undefined : card.suit);
  const colorHex = displaySuit ? SUIT_HEX[displaySuit] : SUIT_HEX.spades;
  const sym = displaySuit ? SUIT_SYMBOL[displaySuit] : "";

  const isClickable = !!onClick && !disabled;
  const pipCount = PIP_COUNTS[card.rank] ?? 0;

  // Build center content
  function centerContent() {
    if (isSwitch) {
      return (
        <span style={{ color: "oklch(0.72 0.18 70)", fontSize: sz.center }}>⇄</span>
      );
    }
    if (card.rank === "8") {
      return (
        <span style={{ color: "oklch(0.72 0.18 70)", fontSize: sz.center }}>★</span>
      );
    }
    if (card.rank === "J") {
      return <span style={{ color: colorHex, fontSize: sz.center, opacity: 0.85 }}>J</span>;
    }
    if (card.rank === "Q") {
      return <span style={{ color: colorHex, fontSize: sz.center, opacity: 0.85 }}>Q</span>;
    }
    if (card.rank === "A") {
      return <span style={{ color: colorHex, fontSize: `calc(${sz.center} * 1.4)`, opacity: 0.9 }}>{sym}</span>;
    }
    // Number cards — large center suit symbol
    if (sym) {
      return <span style={{ color: colorHex, fontSize: sz.center, opacity: 0.85 }}>{sym}</span>;
    }
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        // Base
        "rounded-xl border bg-white relative overflow-hidden select-none flex-shrink-0",
        "shadow-[0_3px_10px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.2)]",
        // Transition
        "transition-shadow duration-150",
        // Size
        sz.card,
        // Cursor
        isClickable ? "cursor-pointer" : "cursor-default",
        // Disabled
        disabled && onClick && "opacity-50 grayscale-[30%] cursor-not-allowed",
        // Wild card background
        isWild
          ? "border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100"
          : "border-gray-200",
        // Highlight: pulsing accent ring
        highlight &&
          "ring-[3px] ring-amber-400 ring-offset-[2px] ring-offset-transparent shadow-[0_0_12px_rgba(251,191,36,0.5),0_3px_10px_rgba(0,0,0,0.35)]",
      )}
      style={{ color: colorHex }}
    >
      {/* Inner border */}
      <div className="absolute inset-[2px] rounded-[9px] border border-gray-100/80 pointer-events-none" />

      {/* Top-left corner pip */}
      <div
        className={cn(
          "absolute top-[3px] left-[4px] leading-none flex flex-col items-center font-bold z-10",
          sz.corner,
        )}
      >
        <span className="font-display">{isSwitch ? "K" : card.rank}</span>
        {sym && <span style={{ fontSize: "0.85em", lineHeight: 1 }}>{sym}</span>}
      </div>

      {/* Bottom-right corner pip (rotated) */}
      <div
        className={cn(
          "absolute bottom-[3px] right-[4px] leading-none flex flex-col items-center rotate-180 font-bold z-10",
          sz.corner,
        )}
      >
        <span className="font-display">{isSwitch ? "K" : card.rank}</span>
        {sym && <span style={{ fontSize: "0.85em", lineHeight: 1 }}>{sym}</span>}
      </div>

      {/* Center symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {centerContent()}
      </div>

      {/* Wild card shimmer */}
      {isWild && (
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-300/15 via-yellow-200/5 to-orange-300/10 pointer-events-none rounded-xl" />
      )}

      {/* Highlight glow pulse overlay */}
      {highlight && (
        <div className="absolute inset-0 rounded-xl pointer-events-none animate-pulse bg-amber-400/8" />
      )}

      {/* Top gloss */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/5 to-transparent pointer-events-none rounded-xl" style={{ height: "50%" }} />
    </button>
  );
}
