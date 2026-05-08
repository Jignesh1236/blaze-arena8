import { useState, useCallback, useEffect, useRef } from "react";

// DiceBear adventurer style options
const HAIR_OPTIONS = [
  "short01","short02","short03","short04","short05","short06","short07","short08","short09","short10",
  "short11","short12","short13","short14","short15","short16","short17","short18","short19",
  "long01","long02","long03","long04","long05","long06",
];

const EYE_OPTIONS = [
  "variant01","variant02","variant03","variant04","variant05","variant06","variant07","variant08",
  "variant09","variant10","variant11","variant12","variant13","variant14","variant15","variant16",
  "variant17","variant18","variant19","variant20","variant21","variant22","variant23","variant24",
  "variant25","variant26",
];

const MOUTH_OPTIONS = [
  "variant01","variant02","variant03","variant04","variant05","variant06","variant07","variant08",
  "variant09","variant10","variant11","variant12","variant13","variant14","variant15","variant16",
  "variant17","variant18","variant19","variant20","variant21","variant22","variant23","variant24",
  "variant25","variant26","variant27","variant28","variant29","variant30",
];

const SKIN_COLORS = ["9e5622","763900","d08b5b","edb98a","f8d25c","fddbb4","ffffff"];
const HAIR_COLORS = ["0e0e0e","3eac2c","6a4e35","85c2c6","796a45","562306","592454","ab2a18","ac6511","afafaf","b9a05f","cb6820","dba3be","e8e1ef","f28c28","f48024","fce877"];
const BG_COLORS = ["b6e3f4","c0aede","d1d4f9","ffd5dc","ffdfbf","transparent"];

export interface AvatarConfig {
  hair?: string;
  eyes?: string;
  mouth?: string;
  skinColor?: string;
  hairColor?: string;
  backgroundColor?: string;
  seed?: string;
}

function buildAvatarUrl(config: AvatarConfig): string {
  const params = new URLSearchParams();
  if (config.seed) params.set("seed", config.seed);
  if (config.hair) params.set("hair", config.hair);
  if (config.eyes) params.set("eyes", config.eyes);
  if (config.mouth) params.set("mouth", config.mouth);
  if (config.skinColor) params.set("skinColor", config.skinColor);
  if (config.hairColor) params.set("hairColor", config.hairColor);
  if (config.backgroundColor) {
    if (config.backgroundColor === "transparent") {
      params.set("backgroundColor", "transparent");
    } else {
      params.set("backgroundColor", config.backgroundColor);
    }
  }
  return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`;
}

export function configToSeed(config: AvatarConfig): string {
  return JSON.stringify(config);
}

export function seedToUrl(seed: string): string {
  try {
    if (seed.startsWith("{")) {
      const config = JSON.parse(seed) as AvatarConfig;
      return buildAvatarUrl(config);
    }
  } catch { /* fallback */ }
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConfig(): AvatarConfig {
  return {
    hair: randomFrom(HAIR_OPTIONS),
    eyes: randomFrom(EYE_OPTIONS),
    mouth: randomFrom(MOUTH_OPTIONS),
    skinColor: randomFrom(SKIN_COLORS),
    hairColor: randomFrom(HAIR_COLORS),
    backgroundColor: randomFrom(BG_COLORS),
  };
}

interface Props {
  value: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onClose: () => void;
}

type Tab = "hair" | "eyes" | "mouth" | "colors";

const AD_URL = "https://sadpicture.com/dIm/FRz.duG/NyveZWGvUS/Le/mX9cu/ZFUdlfkpP/TncMwdMCjzcc4JO/TiMLtWNIz/AOyiNzzvg/5AN/yyZosGaiWc1/psd/Df0axy";

function AdPopupModal({ onComplete, onClose }: { onComplete: () => void; onClose?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    // Small delay to show popup first, then load iframe
    const loadTimer = setTimeout(() => setShowIframe(true), 300);
    
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(loadTimer);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-2xl rounded-2xl border border-amber-200/20 shadow-2xl overflow-hidden" style={{ background: "rgba(10,6,4,0.98)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/10 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xs font-display tracking-wider">AD</span>
            <span className="font-display text-sm text-amber-200/80">Watch to Unlock Avatar</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-amber-200/40 hover:text-amber-200/80 text-xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Ad Iframe Container */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 bg-black/60">
          {showIframe && (
            <iframe
              src={AD_URL}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              title="Advertisement"
            />
          )}
          {!showIframe && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-xs text-amber-200/40 font-display">Loading ad…</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with timer / skip button */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-amber-200/10 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-amber-200/50 font-display">
              {canSkip ? "Completed!" : `Wait ${secondsLeft}s…`}
            </span>
          </div>
          
          <button
            onClick={onComplete}
            disabled={!canSkip}
            className={`px-4 py-2 rounded-xl font-display text-sm transition-all ${
              canSkip 
                ? "bg-amber-500 hover:bg-amber-400 text-white" 
                : "bg-white/10 text-amber-200/30 cursor-not-allowed"
            }`}
          >
            {canSkip ? "Continue →" : "Skip Locked"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DiceBearCustomizer({ value, onChange, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("hair");
  const [hairIdx, setHairIdx] = useState(() => HAIR_OPTIONS.indexOf(value.hair ?? "") || 0);
  const [eyeIdx, setEyeIdx] = useState(() => EYE_OPTIONS.indexOf(value.eyes ?? "") || 0);
  const [mouthIdx, setMouthIdx] = useState(() => MOUTH_OPTIONS.indexOf(value.mouth ?? "") || 0);

  const preview = buildAvatarUrl(value);

  const update = useCallback((patch: Partial<AvatarConfig>) => {
    onChange({ ...value, ...patch });
  }, [value, onChange]);

  function cycleHair(dir: 1 | -1) {
    const n = ((hairIdx + dir) + HAIR_OPTIONS.length) % HAIR_OPTIONS.length;
    setHairIdx(n);
    update({ hair: HAIR_OPTIONS[n] });
  }
  function cycleEye(dir: 1 | -1) {
    const n = ((eyeIdx + dir) + EYE_OPTIONS.length) % EYE_OPTIONS.length;
    setEyeIdx(n);
    update({ eyes: EYE_OPTIONS[n] });
  }
  function cycleMouth(dir: 1 | -1) {
    const n = ((mouthIdx + dir) + MOUTH_OPTIONS.length) % MOUTH_OPTIONS.length;
    setMouthIdx(n);
    update({ mouth: MOUTH_OPTIONS[n] });
  }

  function handleRandom() {
    const cfg = randomConfig();
    setHairIdx(HAIR_OPTIONS.indexOf(cfg.hair!));
    setEyeIdx(EYE_OPTIONS.indexOf(cfg.eyes!));
    setMouthIdx(MOUTH_OPTIONS.indexOf(cfg.mouth!));
    onChange(cfg);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "hair", label: "Hair" },
    { id: "eyes", label: "Eyes" },
    { id: "mouth", label: "Mouth" },
    { id: "colors", label: "Colors" },
  ];

  return (
    <div
      className="w-full max-w-sm rounded-2xl border border-amber-200/15 overflow-hidden shadow-2xl"
      style={{ background: "rgba(10,6,4,0.97)", backdropFilter: "blur(16px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/10">
        <span className="font-display text-sm text-amber-200/90 tracking-wide">Customize Avatar</span>
        <button onClick={onClose} className="text-amber-200/40 hover:text-amber-200/80 text-xl leading-none">×</button>
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center py-4 gap-4">
        <img
          src={preview}
          alt="avatar preview"
          className="w-24 h-24 rounded-full border-2 border-amber-400/50 bg-white/5"
        />
        <button
          type="button"
          onClick={handleRandom}
          className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-display hover:bg-amber-500/30 transition-colors"
        >
          ↻ Random
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-amber-200/10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-display transition-colors ${tab === t.id ? "text-amber-300 border-b-2 border-amber-400" : "text-amber-200/40 hover:text-amber-200/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-3 space-y-3">
        {tab === "hair" && (
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => cycleHair(-1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">‹</button>
            <div className="flex-1 text-center">
              <div className="text-[10px] font-display text-amber-200/40 mb-1">HAIR STYLE</div>
              <div className="text-xs font-display text-amber-200/80">{HAIR_OPTIONS[hairIdx]}</div>
              <div className="text-[9px] text-amber-200/30 mt-0.5">{hairIdx + 1} / {HAIR_OPTIONS.length}</div>
            </div>
            <button onClick={() => cycleHair(1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">›</button>
          </div>
        )}

        {tab === "eyes" && (
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => cycleEye(-1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">‹</button>
            <div className="flex-1 text-center">
              <div className="text-[10px] font-display text-amber-200/40 mb-1">EYES</div>
              <div className="text-xs font-display text-amber-200/80">{EYE_OPTIONS[eyeIdx]}</div>
              <div className="text-[9px] text-amber-200/30 mt-0.5">{eyeIdx + 1} / {EYE_OPTIONS.length}</div>
            </div>
            <button onClick={() => cycleEye(1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">›</button>
          </div>
        )}

        {tab === "mouth" && (
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => cycleMouth(-1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">‹</button>
            <div className="flex-1 text-center">
              <div className="text-[10px] font-display text-amber-200/40 mb-1">MOUTH</div>
              <div className="text-xs font-display text-amber-200/80">{MOUTH_OPTIONS[mouthIdx]}</div>
              <div className="text-[9px] text-amber-200/30 mt-0.5">{mouthIdx + 1} / {MOUTH_OPTIONS.length}</div>
            </div>
            <button onClick={() => cycleMouth(1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-amber-200/60 hover:bg-white/10 text-lg flex items-center justify-center">›</button>
          </div>
        )}

        {tab === "colors" && (
          <div className="space-y-3">
            <div>
              <div className="text-[9px] font-display text-amber-200/40 mb-1.5 tracking-widest">SKIN TONE</div>
              <div className="flex gap-1.5 flex-wrap">
                {SKIN_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ skinColor: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${value.skinColor === c ? "border-amber-400 scale-110" : "border-white/20 hover:border-amber-400/50"}`}
                    style={{ backgroundColor: `#${c}` }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-display text-amber-200/40 mb-1.5 tracking-widest">HAIR COLOR</div>
              <div className="flex gap-1 flex-wrap">
                {HAIR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ hairColor: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${value.hairColor === c ? "border-amber-400 scale-110" : "border-white/20 hover:border-amber-400/50"}`}
                    style={{ backgroundColor: `#${c}` }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-display text-amber-200/40 mb-1.5 tracking-widest">BACKGROUND</div>
              <div className="flex gap-1.5 flex-wrap">
                {BG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ backgroundColor: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${value.backgroundColor === c ? "border-amber-400 scale-110" : "border-white/20 hover:border-amber-400/50"}`}
                    style={{
                      backgroundColor: c === "transparent" ? undefined : `#${c}`,
                      backgroundImage: c === "transparent" ? "repeating-conic-gradient(#666 0% 25%, #999 0% 50%)" : undefined,
                      backgroundSize: "8px 8px"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Done button */}
      <div className="px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 bg-sunset font-display text-sm rounded-xl hover:opacity-90 transition-opacity"
        >
          Use This Avatar
        </button>
      </div>
    </div>
  );
}
