import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { api, type PublicGame } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Seo } from "@/components/Seo";
import { PlayingCard } from "@/components/PlayingCard";
import { AVATAR_SEEDS, avatarUrl } from "@/lib/avatar";

interface GlobalMsg {
  id: string;
  name: string;
  avatar: string;
  text: string;
}

function AdBanner({ adKey, width, height }: { adKey: string; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    (window as Record<string, unknown>)["atOptions"] = { key: adKey, format: "iframe", height, width, params: {} };
    const s = document.createElement("script");
    s.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
    s.async = true;
    ref.current.appendChild(s);
  }, [adKey, width, height]);
  return <div ref={ref} style={{ width, height, overflow: "hidden" }} />;
}

export default function HomePage() {
  const { profile, loading, save, clear } = useGuest();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_SEEDS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [games, setGames] = useState<PublicGame[]>([]);

  // Global chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<GlobalMsg[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  useEffect(() => {
    const socket = getSocket();

    function onLobbyUpdate(data: PublicGame[]) { setGames(data); }
    function onGlobalMsg(msg: GlobalMsg) {
      setChatMsgs(prev => [...prev.slice(-99), msg]);
      if (!chatOpenRef.current) setChatUnread(n => n + 1);
    }

    socket.on("lobby:update", onLobbyUpdate);
    socket.on("global:msg", onGlobalMsg);
    socket.on("connect", () => socket.emit("join:lobby"));

    if (socket.connected) {
      socket.emit("join:lobby");
    } else {
      socket.connect();
    }

    return () => {
      socket.emit("leave:lobby");
      socket.off("lobby:update", onLobbyUpdate);
      socket.off("global:msg", onGlobalMsg);
      socket.off("connect");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatOpen) {
      setChatUnread(0);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatOpen, chatMsgs]);

  function sendGlobalChat() {
    const text = chatInput.trim();
    if (!text) return;
    const p = profile || (name.trim() ? { id: "anon", name: name.trim(), avatar } : null);
    if (!p) { setError("Pick a name first to chat"); return; }
    getSocket().emit("global:send", { name: p.name, avatar: p.avatar, text });
    setChatInput("");
  }

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
              <img src={avatarUrl(profile.avatar)} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-amber-400/40" />
              <span className="font-display">{profile.name}</span>
              <Link to="/auth" className="text-sm underline">Edit</Link>
              <button onClick={clear} className="text-sm">Reset</button>
            </div>
          )}
        </header>

        {/* Top banner ad (468x60) */}
        <div className="flex justify-center mb-8">
          <AdBanner adKey="0ceec5a7bf06f1913d15695622a746b7" width={468} height={60} />
        </div>

        <section className="text-center mt-4 sm:mt-8">
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
                <label className="block text-sm font-display mt-3">Choose your look</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_SEEDS.map((seed) => (
                    <button key={seed} type="button" onClick={() => setAvatar(seed)}
                      className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${avatar === seed ? "border-[var(--color-accent)] scale-110" : "border-border hover:border-amber-400/40"}`}>
                      <img src={avatarUrl(seed)} alt={seed} className="w-full h-full object-cover" loading="lazy" />
                    </button>
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
                <span className="ml-2 inline-block bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 text-[var(--color-accent)] font-sans text-sm px-2 py-0.5 rounded-full align-middle">LIVE</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeGames.map((g) => (
                  <div key={g.id} className="bg-card/90 backdrop-blur border border-border rounded-xl p-4 shadow-card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display tracking-widest text-lg" style={{ color: "oklch(0.78 0.16 70)" }}>{g.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-display ${g.status === "lobby" ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"}`}>
                          {g.status === "lobby" ? "Waiting" : "Playing"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 overflow-hidden">
                        {g.players.slice(0, 5).map((p) => (
                          <img key={p.id} src={avatarUrl(p.avatar)} title={p.name} alt={p.name} className="w-6 h-6 rounded-full object-cover border border-amber-400/20" />
                        ))}
                        {g.players.length > 5 && <span className="text-xs opacity-60">+{g.players.length - 5}</span>}
                        <span className="text-xs opacity-60 ml-1">{g.players.length}/6</span>
                      </div>
                    </div>
                    <button onClick={() => handleJoinGame(g)} disabled={busy}
                      className="shrink-0 px-4 py-2 rounded-lg font-display text-sm bg-sunset disabled:opacity-60 hover:opacity-90">
                      {g.status === "lobby" ? "Join" : "Watch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom banner ad (320x50) */}
          <div className="mt-10 flex justify-center">
            <AdBanner adKey="6faec0f0b766c85bc967985eb764e4e2" width={320} height={50} />
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

      {/* Global chat floating panel */}
      <div className="fixed bottom-4 right-3 z-[200] flex flex-col items-end gap-2">
        {chatOpen && (
          <div className="w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden border border-amber-200/15 shadow-2xl"
               style={{ background: "rgba(10,6,4,0.94)", backdropFilter: "blur(16px)", maxHeight: "340px" }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/10 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🌎</span>
                <span className="font-display text-xs text-amber-200/80 tracking-wide">GLOBAL CHAT</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-amber-200/40 hover:text-amber-200/80 text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5" style={{ minHeight: "160px", maxHeight: "240px" }}>
              {chatMsgs.length === 0 && (
                <div className="text-center text-[10px] font-display text-amber-200/25 mt-6 tracking-widest">No messages yet…</div>
              )}
              {chatMsgs.map(msg => (
                <div key={msg.id} className="flex gap-1.5 items-start">
                  <img src={avatarUrl(msg.avatar)} alt="avatar" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col items-start max-w-[80%]">
                    <span className="text-[9px] font-display opacity-40 mb-0.5 px-1">{msg.name}</span>
                    <div className="px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-xs leading-snug bg-white/8 text-amber-100/90 border border-white/5 break-words">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="flex items-center gap-1.5 px-2 py-2 border-t border-amber-200/10 flex-shrink-0"
                  onSubmit={e => { e.preventDefault(); sendGlobalChat(); }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} maxLength={200}
                placeholder="Say something…"
                className="flex-1 bg-white/6 border border-amber-200/10 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder-amber-200/25 outline-none focus:border-amber-400/30 font-sans" />
              <button type="submit" disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 flex items-center justify-center text-sm flex-shrink-0">▶</button>
            </form>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center border border-amber-200/20 shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: chatOpen ? "rgba(251,191,36,0.18)" : "rgba(10,6,4,0.82)", backdropFilter: "blur(12px)" }}>
          <span className="text-xl">{chatOpen ? "✕" : "🌎"}</span>
          {!chatOpen && chatUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center text-[9px] font-bold text-white">
              {chatUnread > 9 ? "9+" : chatUnread}
            </div>
          )}
        </button>
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
