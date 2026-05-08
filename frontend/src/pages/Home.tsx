import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { api, type PublicGame } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Seo } from "@/components/Seo";
import { PlayingCard } from "@/components/PlayingCard";
import { AVATAR_SEEDS, avatarUrl } from "@/lib/avatar";
import { DiceBearCustomizer, type AvatarConfig } from "@/components/DiceBearCustomizer";
import { SevenTVPicker, renderWithEmotes } from "@/components/SevenTVPicker";
import {
  FlameIcon, ChatIcon, GlobeIcon, SendIcon, EmojiIcon,
  LightningIcon, CardsIcon, HandshakeIcon, CowboyIcon, DesertIcon,
} from "@/components/Icons";

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
    (window as unknown as Record<string, unknown>)["atOptions"] = { key: adKey, format: "iframe", height, width, params: {} };
    const s = document.createElement("script");
    s.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
    s.async = true;
    ref.current.appendChild(s);
  }, [adKey, width, height]);
  return <div ref={ref} style={{ width, height, overflow: "hidden" }} />;
}

const DEFAULT_CONFIG: AvatarConfig = { seed: AVATAR_SEEDS[0] };

export default function HomePage() {
  const { profile, loading, save, clear } = useGuest();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_SEEDS[0]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [games, setGames] = useState<PublicGame[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<GlobalMsg[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  function configToSeed(cfg: AvatarConfig): string {
    const keys = Object.keys(cfg).filter(k => cfg[k as keyof AvatarConfig]);
    if (keys.length === 1 && keys[0] === "seed") return cfg.seed ?? AVATAR_SEEDS[0];
    return JSON.stringify(cfg);
  }

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
    if (socket.connected) { socket.emit("join:lobby"); } else { socket.connect(); }
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
    
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    
    socket.emit("global:send", { name: p.name, avatar: p.avatar, text });
    setChatInput("");
    setEmojiOpen(false);
  }

  function ensureProfile() {
    if (profile) return profile;
    const t = name.trim();
    if (!t) { setError("Pick a display name first"); return null; }
    return save(t, configToSeed(avatarConfig));
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
  const previewUrl = avatarUrl(configToSeed(avatarConfig));

  function handleCustomizeClick() {
    setCustomizerOpen(true);
  }

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
            <FlameIcon size={30} />
            <span>Blazing 8s</span>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <img src={avatarUrl(profile.avatar)} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-amber-400/40 shadow-sm" />
              <span className="font-display text-amber-100">{profile.name}</span>
              <Link to="/auth" className="text-xs bg-white/10 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/20 transition-all">Edit</Link>
              <button onClick={clear} className="text-xs opacity-50 hover:opacity-100">Reset</button>
            </div>
          )}
        </header>

        <section className="text-center mt-4 sm:mt-8">
          <div className="flex justify-center gap-2 mb-6">
            <div className="animate-float -rotate-12"><PlayingCard card={{ id: "h", suit: "hearts", rank: "8" }} size="lg" /></div>
            <div className="animate-float [animation-delay:200ms] rotate-3"><PlayingCard card={{ id: "s", suit: "spades", rank: "K" }} size="lg" /></div>
            <div className="animate-float [animation-delay:400ms] rotate-12"><PlayingCard card={{ id: "d", suit: "diamonds", rank: "7" }} size="lg" /></div>
          </div>

          <div className="flex justify-center my-8">
            <AdBanner adKey="0ceec5a7bf06f1913d15695622a746b7" width={468} height={60} />
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

                <div className="flex items-center justify-between mt-3">
                  <label className="block text-sm font-display">Choose your look</label>
                  <button
                    type="button"
                    onClick={handleCustomizeClick}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 transition-colors font-display"
                  >
                    ✦ Customize
                  </button>
                </div>

                {customizerOpen && (
                  <DiceBearCustomizer
                    value={avatarConfig}
                    onChange={cfg => {
                      setAvatarConfig(cfg);
                      setAvatar(configToSeed(cfg));
                    }}
                    onClose={() => setCustomizerOpen(false)}
                  />
                )}
                {!customizerOpen && (
                  <>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_SEEDS.map((seed) => (
                        <button key={seed} type="button"
                          onClick={() => { 
                            setAvatar(seed); 
                            setAvatarConfig({ seed }); 
                          }}
                          className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${avatar === seed ? "border-[var(--color-accent)] scale-110" : "border-border hover:border-amber-400/40"}`}>
                          <img src={avatarUrl(seed)} alt={seed} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                    {Object.keys(avatarConfig).some(k => k !== "seed") && (
                      <div className="flex items-center gap-2 mt-1">
                        <img src={previewUrl} alt="custom" className="w-9 h-9 rounded-full border-2 border-amber-400/50 object-cover" />
                        <span className="text-[10px] font-display text-amber-300">Custom avatar selected</span>
                        <button type="button" onClick={() => { setAvatarConfig(DEFAULT_CONFIG); setAvatar(AVATAR_SEEDS[0]); }}
                          className="text-[10px] text-red-400/70 hover:text-red-400">Reset</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button onClick={handleCreate} disabled={busy || loading}
              className="w-full h-14 text-lg font-display bg-sunset border-2 border-amber-200/30 rounded-lg hover:opacity-90 shadow-glow disabled:opacity-60 flex items-center justify-center gap-2">
              <CowboyIcon size={26} color="#fff" />
              Start a Showdown
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

          {activeGames.length > 0 && (
            <div className="mt-10 max-w-2xl mx-auto text-left">
              <h2 className="font-display text-2xl mb-4 text-center" style={{ color: "oklch(0.85 0.04 70)" }}>
                <span className="inline-flex items-center gap-2">
                  <DesertIcon size={28} color="#fbbf24" />
                  Active Rooms
                </span>
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

          <div className="mt-10 flex justify-center">
            <AdBanner adKey="6faec0f0b766c85bc967985eb764e4e2" width={320} height={50} />
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 text-left">
            <Feature Icon={LightningIcon} title="Real-time" desc="Live updates the moment cards hit the table." />
            <Feature Icon={CardsIcon} title="Classic rules" desc="Match suits & ranks. 8s are wild. Switcheroo swaps hands." />
            <Feature Icon={HandshakeIcon} title="Up to 6 players" desc="Share a code, gather your posse, ride at dawn." />
          </div>

          <div className="mt-10 text-center">
            <Link to="/how-to-play" className="text-sm underline opacity-80">Learn how to play →</Link>
          </div>
        </section>
      </div>

      {/* Global chat floating panel */}
      <div className="fixed bottom-4 right-3 z-[200] flex flex-col items-end gap-2 max-w-[calc(100vw-24px)]">
        {chatOpen && (
          <div className="w-[calc(100vw-24px)] sm:w-96 flex flex-col rounded-2xl border border-amber-200/15 shadow-2xl"
               style={{ background: "rgba(10,6,4,0.94)", backdropFilter: "blur(16px)", maxHeight: "70vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/10 flex-shrink-0 rounded-t-2xl bg-amber-500/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-display text-xs text-amber-200 tracking-[0.15em] uppercase">Saloon Chat</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-amber-200/40 hover:text-amber-200/80 text-2xl leading-none transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 no-scrollbar" style={{ minHeight: "180px" }}>
              {chatMsgs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                    <ChatIcon size={24} color="#fbbf2444" />
                  </div>
                  <p className="text-[11px] font-display text-amber-200/30 tracking-widest uppercase">No messages yet in the saloon</p>
                </div>
              )}
              {chatMsgs.map((msg, i) => {
                const isMe = profile?.name === msg.name;
                return (
                  <div key={msg.id} className={`flex gap-2.5 items-start ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <img src={avatarUrl(msg.avatar)} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10 shadow-sm" />
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%]`}>
                      {!isMe && <span className="text-[10px] font-display text-amber-200/50 mb-1 px-1">{msg.name}</span>}
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                        isMe 
                          ? "bg-amber-500/20 text-amber-50 border-amber-500/20 rounded-tr-none" 
                          : "bg-white/5 text-amber-100/90 border-white/5 rounded-tl-none"
                      } break-words`}>
                        {renderWithEmotes(msg.text)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="relative">
              {emojiOpen && (
                <SevenTVPicker
                  onSelect={tag => setChatInput(prev => prev + tag)}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
            <form className="flex items-center gap-2 px-3 py-3 border-t border-amber-200/10 flex-shrink-0 rounded-b-2xl bg-black/20"
                  onSubmit={e => { e.preventDefault(); sendGlobalChat(); }}>
              <button type="button" onClick={() => setEmojiOpen(o => !o)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-200/40 hover:text-amber-200/70 hover:bg-white/5 transition-all flex-shrink-0 border border-transparent hover:border-amber-200/10"
                title="7TV Emotes">
                <EmojiIcon size={20} color="#fbbf24" />
              </button>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} maxLength={200}
                placeholder="Message the saloon…"
                className="flex-1 bg-white/5 border border-amber-200/10 rounded-xl px-4 py-2 text-xs text-amber-50 placeholder-amber-200/20 outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all font-sans" />
              <button type="submit" disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                <SendIcon size={18} color="#fff" />
              </button>
            </form>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center border border-amber-200/20 shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: chatOpen ? "rgba(251,191,36,0.18)" : "rgba(10,6,4,0.82)", backdropFilter: "blur(12px)" }}>
          <GlobeIcon size={22} color={chatOpen ? "#fbbf24" : "#fbbf2466"} />
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

function Feature({ Icon, title, desc }: { Icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 shadow-card">
      <div className="mb-2">
        <Icon size={32} color="#fbbf24" />
      </div>
      <div className="font-display text-lg">{title}</div>
      <p className="text-sm" style={{ color: "oklch(0.85 0.04 70)" }}>{desc}</p>
    </div>
  );
}
