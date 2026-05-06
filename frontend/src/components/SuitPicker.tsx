import { PLAYABLE_SUITS, SUIT_COLOR, SUIT_SYMBOL, type Suit } from "@/lib/game";

export function SuitPicker({ onPick, onCancel }: { onPick: (s: Suit) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-card">
        <h3 className="font-display text-2xl text-center mb-4">Choose a Suit</h3>
        <div className="grid grid-cols-2 gap-3">
          {PLAYABLE_SUITS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="aspect-square rounded-xl bg-amber-50 border-2 border-amber-200 text-5xl font-bold flex items-center justify-center hover:scale-105 transition-transform shadow-card"
              style={{ color: SUIT_COLOR[s] === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.2 0.02 30)" }}
            >
              {SUIT_SYMBOL[s]}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-sm text-muted hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}
