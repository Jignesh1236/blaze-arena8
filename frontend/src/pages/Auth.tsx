import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { Seo } from "@/components/Seo";
import { AVATAR_SEEDS, avatarUrl } from "@/lib/avatar";
import { CowboyIcon } from "@/components/Icons";
import { DiceBearCustomizer, type AvatarConfig } from "@/components/DiceBearCustomizer";

const DEFAULT_CONFIG: AvatarConfig = { seed: AVATAR_SEEDS[0] };

function configToSeed(cfg: AvatarConfig): string {
  const keys = Object.keys(cfg).filter(k => !!(cfg as Record<string, string>)[k]);
  if (keys.length === 1 && keys[0] === "seed") return cfg.seed ?? AVATAR_SEEDS[0];
  return JSON.stringify(cfg);
}

export default function AuthPage() {
  const { profile, loading, save } = useGuest();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedSeed, setSelectedSeed] = useState(AVATAR_SEEDS[0]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      const av = profile.avatar || AVATAR_SEEDS[0];
      if (av.startsWith("{")) {
        try { setAvatarConfig(JSON.parse(av) as AvatarConfig); } catch { /* ignore */ }
      } else {
        setSelectedSeed(av);
        setAvatarConfig({ seed: av });
      }
    }
  }, [profile]);

  if (loading) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save(name, configToSeed(avatarConfig));
    navigate(params.get("next") ?? "/");
  }

  const hasCustomParams = Object.keys(avatarConfig).some(k => k !== "seed");
  const previewUrl = avatarUrl(configToSeed(avatarConfig));

  return (
    <main className="min-h-screen bg-table flex items-center justify-center p-4">
      <Seo title="Pick your handle — Blazing 8s" description="Choose a display name and avatar to play Blazing 8s." path="/auth" noIndex />
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-card">
        <Link to="/" className="text-sm opacity-80">← Back</Link>
        <h1 className="font-display text-3xl mt-2 mb-1">Pick Your Handle</h1>
        <p className="text-sm opacity-80 mb-6">No password, no fuss. Just your name and a face.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-display">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={24}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-border outline-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-display">Choose your look</label>
              <button
                type="button"
                onClick={() => setCustomizerOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 transition-colors font-display"
              >
                ✦ {customizerOpen ? "Close" : "Customize"}
              </button>
            </div>

            {customizerOpen ? (
              <DiceBearCustomizer
                value={avatarConfig}
                onChange={cfg => setAvatarConfig(cfg)}
                onClose={() => setCustomizerOpen(false)}
              />
            ) : (
              <>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_SEEDS.map((seed) => (
                    <button key={seed} type="button"
                      onClick={() => { setSelectedSeed(seed); setAvatarConfig({ seed }); }}
                      className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${selectedSeed === seed && !hasCustomParams ? "border-[var(--color-accent)] scale-110 shadow-glow" : "border-border hover:border-amber-400/40"}`}>
                      <img src={avatarUrl(seed)} alt={seed} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
                {hasCustomParams && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative">
                      <img src={previewUrl} alt="selected" className="w-14 h-14 rounded-full border-2 border-amber-400/50 object-cover" />
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-[8px] font-display text-white px-1 py-0.5 rounded-full">CUSTOM</span>
                    </div>
                    <div>
                      <span className="text-xs font-display opacity-60">Custom avatar active</span>
                      <button
                        type="button"
                        onClick={() => { setAvatarConfig(DEFAULT_CONFIG); setSelectedSeed(AVATAR_SEEDS[0]); }}
                        className="block text-[10px] text-red-400/70 hover:text-red-400 mt-0.5"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <button type="submit" className="w-full bg-sunset font-display h-12 text-lg rounded-lg flex items-center justify-center gap-2">
            Saddle up
            <CowboyIcon size={22} color="#fff" />
          </button>
        </form>
      </div>
    </main>
  );
}
