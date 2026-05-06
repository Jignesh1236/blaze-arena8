import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { Seo } from "@/components/Seo";

const AVATARS = ["🤠", "🐴", "🌵", "🦂", "🪶", "⭐", "🌙", "🔥", "🎩", "🐺"];

export default function AuthPage() {
  const { profile, loading, save } = useGuest();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤠");

  useEffect(() => {
    if (profile) { setName(profile.name); setAvatar(profile.avatar); }
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
            <label className="block text-sm mb-1 font-display">Avatar</label>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((a) => (
                <button key={a} type="button" onClick={() => setAvatar(a)}
                  className={`text-2xl aspect-square rounded-lg border-2 ${avatar === a ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-border"}`}>{a}</button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-sunset font-display h-12 text-lg rounded-lg">Saddle up 🤠</button>
        </form>
      </div>
    </main>
  );
}
