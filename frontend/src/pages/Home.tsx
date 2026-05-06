import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { api, type PublicGame } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Seo } from "@/components/Seo";
import { PlayingCard } from "@/components/PlayingCard";

const AVATARS = ["🤠", "🐴", "🌵", "🦂", "🪶", "⭐", "🌙", "🔥", "🎩", "🐺"];

export default function HomePage() {
  const { profile, loading, save, clear } = useGuest();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤠");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [games, setGames] = useState<PublicGame[]>([]);

  useEffect(() => {
    const socket = getSocket();

    function onLobbyUpdate(data: PublicGame[]) {
      setGames(data);
    }

    socket.on("lobby:update", onLobbyUpdate);
    socket.on("connect", () => socket.emit("join:lobby"));

    if (socket.connected) {
      socket.emit("join:lobby");
    } else {
      socket.connect();
    }

    return () => {
      socket.emit("leave:lobby");
      socket.off("lobby:update", onLobbyUpdate);
      socket.off("connect");
      socket.disconnect();
    };
  }, []);

  function ensureProfile() {
    if (profile) return profile;
    const t = name.trim();
    if (!t) { setError("Pick a display name first"); return null; }
    return save(t, avatar);
  }

  async function handleCreate() {
    const p = ensureProfile(); if (!p) return;
    setBusy(true); setError("");
    try { const r = await api.createGame(p); navigate(`/game/${r.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleJoin() {
    const p = ensureProfile(); if (!p) return;
    if (!code.trim()) { setError("Enter a room code"); return; }
    setBusy(true); setError("");
    try { const r = await api.joinGame(code.trim(), p); navigate(`/game/${r.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleJoinGame(g: PublicGame) {
    const p = ensureProfile(); if (!p) return;
    setBusy(true); setError("");
    try { const r = await api.joinGame(g.code, p); navigate(`/game/${r.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const activeGames = games.filter((g) => g.status === "lobby" || g.status === "playing");

  return (
    <main className="min-h-screen relative overflow-hidden bg-table">
      <Seo
        title="Blazing 8s — Free Real-time Multiplayer Crazy Eights Card Game"
        description="Play Crazy Eights online free with a Wild West twist. No login needed — pick a handle, create a room, share the code and deal the cards. Up to 6 players."
        path="/"
        keywords="crazy eights online free, multiplayer card game browser, wild west card game, play crazy eights with friends, online card game no signup, blazing 8s, real-time card game, crazy 8s online multiplayer"
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2 font-display text-2xl">
            <span className="text-3xl">🔥</span><span>Blazing 8s</span>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <span className="font-display">{profile.avatar} {profile.name}</span>
              <Link to="/auth" className="text-sm underline">Edit</Link>
              <button onClick={clear} className="text-sm">Reset</button>
            </div>
          )}
        </header>

        <section className="text-center mt-8 sm:mt-16">
          <div className="flex justify-center gap-2 mb-6">
            <div className="animate-float -rotate-12"><PlayingCard card={{ id: "h", suit: "hearts", rank: "8" }} size="lg" /></div>
            <div className="animate-float [animation-delay:200ms] rotate-3"><PlayingCard card={{ id: "s", suit: "spades", rank: "K" }} size="lg" /></div>
            <div className="animate-float [animation-delay:400ms] rotate-12"><PlayingCard card={{ id: "d", suit: "diamonds", rank: "7" }} size="lg" /></div>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl drop-shadow-lg">
            Blazing <span style={{ color: "oklch(0.78 0.16 70)" }}>8s</span>
          </h1>
          <p className="mt-1 text-sm font-display tracking-widest uppercase opacity-60" style={{ color: "oklch(0.85 0.04 70)" }}>
            Multiplayer Crazy Eights — Wild West Edition
          </p>
          <p className="mt-3 text-lg max-w-xl mx-auto" style={{ color: "oklch(0.85 0.04 70)" }}>
            No login. Pick a handle, grab your posse — real-time multiplayer Crazy Eights. Free to play, up to 6 players.
          </p>

          <div className="mt-10 max-w-md mx-auto bg-card/90 backdrop-blur border border-border rounded-2xl p-6 shadow-card text-left">
            {!profile && !loading && (
              <div className="mb-5 space-y-3">
                <label className="block text-sm font-display">Display name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-border outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="Lone Ranger" />
                <label className="block text-sm font-display mt-3">Avatar</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-2xl aspect-square rounded-lg border-2 ${avatar === a ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-border"}`}>{a}</button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleCreate} disabled={busy || loading}
              className="w-full h-14 text-lg font-display bg-sunset border-2 border-amber-200/30 rounded-lg hover:opacity-90 shadow-glow disabled:opacity-60">
              🤠 Start a Showdown
            </button>
            <div className="my-4 flex items-center gap-3 text-sm" style={{ color: "oklch(0.75 0.04 70)" }}>
              <div className="flex-1 h-px bg-border" /><span>or join a room</span><div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-2">
              <input placeholder="ROOM CODE" value={code} maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 font-display tracking-widest text-center text-lg uppercase px-3 py-2 rounded-lg bg-black/30 border border-border outline-none" />
              <button onClick={handleJoin} disabled={busy} className="px-4 py-2 rounded-lg bg-card border border-border font-display">Join</button>
            </div>
            {error && <p className="mt-3 text-sm" style={{ color: "oklch(0.7 0.2 25)" }}>{error}</p>}
          </div>

          {/* Active Rooms */}
          {activeGames.length > 0 && (
            <div className="mt-10 max-w-2xl mx-auto text-left">
              <h2 className="font-display text-2xl mb-4 text-center" style={{ color: "oklch(0.85 0.04 70)" }}>
                🏜️ Active Rooms
                <span className="ml-2 inline-block bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 text-[var(--color-accent)] font-sans text-sm px-2 py-0.5 rounded-full align-middle">
                  LIVE
                </span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeGames.map((g) => (
                  <div key={g.id} className="bg-card/90 backdrop-blur border border-border rounded-xl p-4 shadow-card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display tracking-widest text-lg" style={{ color: "oklch(0.78 0.16 70)" }}>{g.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-display ${
                          g.status === "lobby"
                            ? "border-green-500/40 text-green-400 bg-green-500/10"
                            : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                        }`}>
                          {g.status === "lobby" ? "Waiting" : "Playing"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm overflow-hidden">
                        {g.players.slice(0, 5).map((p) => (
                          <span key={p.id} title={p.name}>{p.avatar}</span>
                        ))}
                        {g.players.length > 5 && <span className="text-xs opacity-60">+{g.players.length - 5}</span>}
                        <span className="text-xs opacity-60 ml-1">{g.players.length}/6</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinGame(g)}
                      disabled={busy}
                      className="shrink-0 px-4 py-2 rounded-lg font-display text-sm bg-sunset disabled:opacity-60 hover:opacity-90"
                    >
                      {g.status === "lobby" ? "Join" : "Watch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banner Ad */}
          <div className="mt-10 flex justify-center">
            <div id="banner-ad-container" className="bg-card/80 backdrop-blur border border-border rounded-xl p-2 shadow-card" style={{ minWidth: '468px', minHeight: '60px' }}>
              {/* Banner ad loads here */}
            </div>
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 text-left">
            <Feature icon="⚡" title="Real-time" desc="Live updates the moment cards hit the table." />
            <Feature icon="🎴" title="Classic rules" desc="Match suits & ranks. 8s are wild. Switcheroo swaps hands." />
            <Feature icon="🤝" title="Up to 6 players" desc="Share a code, gather your posse, ride at dawn." />
          </div>

          <div className="mt-10 text-center">
            <Link to="/how-to-play" className="text-sm underline opacity-80">Learn how to play →</Link>
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
      <p className="text-sm" style={{ color: "oklch(0.85 0.04 70)" }}>{desc}</p>
    </div>
  );
}
