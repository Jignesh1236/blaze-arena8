import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useGuest } from "@/lib/use-auth";
import { createGame, joinGame } from "@/server/game.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import desertBg from "@/assets/desert-bg.jpg";
import { PlayingCard } from "@/components/game/PlayingCard";

export const Route = createFileRoute("/")({
  component: Index,
});

const AVATARS = ["🤠", "🐴", "🌵", "🦂", "🪶", "⭐", "🌙", "🔥", "🎩", "🐺"];

function Index() {
  const { profile, loading, save, clear } = useGuest();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Inline guest setup state (only used if no profile)
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤠");

  function ensureProfile() {
    if (profile) return profile;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Pick a display name first");
      return null;
    }
    return save(trimmed, avatar);
  }

  async function handleCreate() {
    const p = ensureProfile();
    if (!p) return;
    setBusy(true);
    try {
      const r = await createGame({ data: { player: p } });
      navigate({ to: "/game/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function handleJoin() {
    const p = ensureProfile();
    if (!p) return;
    if (!code.trim()) return toast.error("Enter a room code");
    setBusy(true);
    try {
      const r = await joinGame({ data: { code: code.trim(), player: p } });
      navigate({ to: "/game/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <img
        src={desertBg}
        alt="Wild west desert at dusk"
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2 font-display text-2xl">
            <span className="text-3xl">🔥</span>
            <span>Blazing 8s</span>
          </div>
          {profile ? (
            <div className="flex items-center gap-3">
              <span className="font-display">{profile.avatar} {profile.name}</span>
              <Link to="/auth"><Button variant="outline" size="sm">Edit</Button></Link>
              <Button variant="ghost" size="sm" onClick={clear}>Reset</Button>
            </div>
          ) : null}
        </header>

        <section className="text-center mt-8 sm:mt-16">
          <div className="flex justify-center gap-2 mb-6">
            <div className="animate-float -rotate-12"><PlayingCard card={{ id: "h", suit: "hearts", rank: "8" }} size="lg" /></div>
            <div className="animate-float [animation-delay:200ms] rotate-3"><PlayingCard card={{ id: "s", suit: "spades", rank: "K" }} size="lg" /></div>
            <div className="animate-float [animation-delay:400ms] rotate-12"><PlayingCard card={{ id: "d", suit: "diamonds", rank: "7" }} size="lg" /></div>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl text-foreground drop-shadow-lg">
            Blazing <span className="text-accent">8s</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            No login. Pick a handle, grab your posse — real-time multiplayer Crazy Eights.
          </p>

          <div className="mt-10 max-w-md mx-auto bg-card/90 backdrop-blur border border-border rounded-2xl p-6 shadow-card text-left">
            {!profile && !loading && (
              <div className="mb-5 space-y-3">
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Lone Ranger"
                    maxLength={24}
                  />
                </div>
                <div>
                  <Label>Avatar</Label>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`text-2xl aspect-square rounded-lg border-2 transition ${avatar === a ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}
                      >{a}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={busy || loading}
              className="w-full h-14 text-lg font-display bg-sunset border-2 border-amber-200/30 hover:opacity-90 shadow-glow"
            >
              🤠 Start a Showdown
            </Button>
            <div className="my-4 flex items-center gap-3 text-muted-foreground text-sm">
              <div className="flex-1 h-px bg-border" />
              <span>or join a room</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="ROOM CODE"
                value={code}
                maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-display tracking-widest text-center text-lg uppercase"
              />
              <Button onClick={handleJoin} disabled={busy} variant="secondary" className="font-display">
                Join
              </Button>
            </div>
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 text-left">
            <Feature icon="⚡" title="Real-time" desc="Live updates the moment cards hit the table." />
            <Feature icon="🎴" title="Classic rules" desc="Match suits & ranks. 8s are wild. Stack 2s for damage." />
            <Feature icon="🤝" title="Up to 6 players" desc="Share a code, gather your posse, ride at dawn." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 shadow-card">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="font-display text-lg">{title}</div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
