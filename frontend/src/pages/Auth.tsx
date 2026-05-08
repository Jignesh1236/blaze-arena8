import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { Seo } from "@/components/Seo";
import { AVATAR_SEEDS, avatarUrl } from "@/lib/avatar";

export default function AuthPage() {
  const { profile, loading, save } = useGuest();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_SEEDS[0]);

  useEffect(() => {
    if (profile) { setName(profile.name); setAvatar(profile.avatar || AVATAR_SEEDS[0]); }
  }, [profile]);

  if (loading) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save(name, avatar);
    navigate(params.get("next") ?? "/");
  }

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
            <label className="block text-sm mb-1 font-display">Choose your look</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_SEEDS.map((seed) => (
                <button key={seed} type="button" onClick={() => setAvatar(seed)}
                  className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${avatar === seed ? "border-[var(--color-accent)] scale-110 shadow-glow" : "border-border hover:border-amber-400/40"}`}>
                  <img src={avatarUrl(seed)} alt={seed} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            {avatar && (
              <div className="mt-3 flex items-center gap-3">
                <img src={avatarUrl(avatar)} alt="selected" className="w-12 h-12 rounded-full border-2 border-amber-400/50" />
                <span className="text-xs font-display opacity-60">Selected: {avatar}</span>
              </div>
            )}
          </div>
          <button type="submit" className="w-full bg-sunset font-display h-12 text-lg rounded-lg">Saddle up 🤠</button>
        </form>
      </div>
    </main>
  );
}
