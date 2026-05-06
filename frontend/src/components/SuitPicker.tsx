import { PLAYABLE_SUITS, SUIT_HEX, SUIT_SYMBOL, type Suit } from "@/lib/game";

export function SuitPicker({ onPick, onCancel }: { onPick: (s: Suit) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full shadow-card">
        <h3 className="font-display text-xl text-center mb-4 text-amber-200">Choose a Suit</h3>
        <div className="grid grid-cols-2 gap-3">
          {PLAYABLE_SUITS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="aspect-square rounded-xl bg-white border-2 border-gray-200 flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform shadow-card"
              style={{ color: SUIT_HEX[s] }}
            >
              <span className="text-4xl leading-none">{SUIT_SYMBOL[s]}</span>
              <span className="text-[10px] font-display capitalize opacity-60" style={{ color: SUIT_HEX[s] }}>{s}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-sm text-muted hover:text-foreground transition-colors font-display">
          Cancel
        </button>
      </div>
    </div>
  );
}
