import { useState, useCallback } from "react";

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

export function DiceBearCustomizer({ value, onChange, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("hair");

  const preview = buildAvatarUrl(value);

  const update = useCallback((patch: Partial<AvatarConfig>) => {
    onChange({ ...value, ...patch });
  }, [value, onChange]);

  function handleRandom() {
    const cfg = randomConfig();
    onChange(cfg);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "hair", label: "Hair" },
    { id: "eyes", label: "Eyes" },
    { id: "mouth", label: "Mouth" },
    { id: "colors", label: "Colors" },
  ];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl border border-amber-200/15 overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
        style={{ background: "rgba(10,6,4,0.97)", backdropFilter: "blur(16px)" }}
      >
        {/* Left Side: Large Preview */}
        <div className="md:w-1/2 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-amber-200/10 bg-black/20">
          <div className="relative group">
            <img
              src={preview}
              alt="avatar preview"
              className="w-48 h-48 rounded-full border-4 border-amber-400/50 bg-white/5 shadow-2xl transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-200 animate-pulse">
              <span className="text-xl">✨</span>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={handleRandom}
              className="w-full h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 font-display hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              ↻ Randomize Look
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 bg-sunset font-display text-base rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
            >
              Use This Avatar
            </button>
          </div>
        </div>

        {/* Right Side: Options Grid */}
        <div className="md:w-1/2 flex flex-col h-[500px]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/10 bg-black/40">
            <span className="font-display text-sm text-amber-200/90 tracking-widest uppercase">Customize</span>
            <button onClick={onClose} className="text-amber-200/40 hover:text-amber-200/80 text-2xl leading-none transition-colors">×</button>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pt-4 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-[10px] font-display rounded-lg transition-all uppercase tracking-tighter ${
                  tab === t.id 
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                    : "text-amber-200/40 hover:text-amber-200/70 hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            {tab === "hair" && (
              <div className="grid grid-cols-3 gap-2">
                {HAIR_OPTIONS.map(h => (
                  <button
                    key={h}
                    onClick={() => update({ hair: h })}
                    className={`aspect-square rounded-xl border-2 p-1 transition-all ${
                      value.hair === h ? "border-amber-400 bg-amber-500/10 scale-95" : "border-white/5 hover:border-amber-400/30 bg-white/5"
                    }`}
                  >
                    <img src={buildAvatarUrl({ ...value, hair: h })} alt={h} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {tab === "eyes" && (
              <div className="grid grid-cols-3 gap-2">
                {EYE_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => update({ eyes: e })}
                    className={`aspect-square rounded-xl border-2 p-1 transition-all ${
                      value.eyes === e ? "border-amber-400 bg-amber-500/10 scale-95" : "border-white/5 hover:border-amber-400/30 bg-white/5"
                    }`}
                  >
                    <img src={buildAvatarUrl({ ...value, eyes: e })} alt={e} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {tab === "mouth" && (
              <div className="grid grid-cols-3 gap-2">
                {MOUTH_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => update({ mouth: m })}
                    className={`aspect-square rounded-xl border-2 p-1 transition-all ${
                      value.mouth === m ? "border-amber-400 bg-amber-500/10 scale-95" : "border-white/5 hover:border-amber-400/30 bg-white/5"
                    }`}
                  >
                    <img src={buildAvatarUrl({ ...value, mouth: m })} alt={m} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {tab === "colors" && (
              <div className="space-y-6 p-2">
                <div>
                  <div className="text-[10px] font-display text-amber-200/40 mb-3 tracking-widest uppercase">Skin Tone</div>
                  <div className="flex gap-2 flex-wrap">
                    {SKIN_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => update({ skinColor: c })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${value.skinColor === c ? "border-amber-400 scale-110" : "border-white/10 hover:border-amber-400/50"}`}
                        style={{ backgroundColor: `#${c}` }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-display text-amber-200/40 mb-3 tracking-widest uppercase">Hair Color</div>
                  <div className="flex gap-2 flex-wrap">
                    {HAIR_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => update({ hairColor: c })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${value.hairColor === c ? "border-amber-400 scale-110" : "border-white/10 hover:border-amber-400/50"}`}
                        style={{ backgroundColor: `#${c}` }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-display text-amber-200/40 mb-3 tracking-widest uppercase">Background</div>
                  <div className="flex gap-2 flex-wrap">
                    {BG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => update({ backgroundColor: c })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${value.backgroundColor === c ? "border-amber-400 scale-110" : "border-white/10 hover:border-amber-400/50"}`}
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
        </div>
      </div>
    </div>
  );
}
