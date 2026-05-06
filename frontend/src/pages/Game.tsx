import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { canPlay, type Card, type GameRow, type Suit, SUIT_COLOR, SUIT_SYMBOL } from "@/lib/game";
import { PlayingCard } from "@/components/PlayingCard";
import { PlayerSeat } from "@/components/PlayerSeat";
import { SuitPicker } from "@/components/SuitPicker";
import { Seo } from "@/components/Seo";

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function GamePage() {
  const { id = "" } = useParams();
  const { profile, loading } = useGuest();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow | null>(null);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; avatar: string }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [animatingCard, setAnimatingCard] = useState<{ card: Card; from: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate(`/auth?next=/game/${id}`);
  }, [profile, loading, navigate, id]);

  useEffect(() => {
    if (!id || !profile) return;
    const socket = getSocket();

    // Load initial state via REST
    api.getGame(id).then(setGame).catch(() => navigate("/"));

    // Join the socket room once connected (or immediately if already connected)
    function joinRoom() {
      socket.emit("join", id);
    }

    socket.on("game:update", (data: GameRow) => {
      setGame(data);
    });

    socket.on("player:moved", (data: { playerId: string; x: number; y: number }) => {
      const p = [...(game?.players || []), ...(game?.spectators || [])].find(x => x.id === data.playerId);
      if (p) {
        setCursors(prev => ({
          ...prev,
          [data.playerId]: { x: data.x, y: data.y, name: p.name, avatar: p.avatar }
        }));
      }
    });

    socket.on("connect", joinRoom);
    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err.message);
    });

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    let lastMove = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (!socket.connected) return;
      const now = Date.now();
      if (now - lastMove < 50) return; // Throttle to 20fps
      lastMove = now;

      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      socket.emit("player:move", { gameId: id, playerId: profile.id, x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      socket.emit("leave", id);
      socket.off("game:update");
      socket.off("player:moved");
      socket.off("connect", joinRoom);
      window.removeEventListener("mousemove", handleMouseMove);
      socket.disconnect();
    };
  }, [id, navigate, profile, game?.players, game?.spectators]);

  useEffect(() => {
    if (game?.status !== "playing" || !game.last_turn_at) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const lastTurn = new Date(game.last_turn_at!).getTime();
      const diff = Math.max(0, 60 - Math.floor((now - lastTurn) / 1000));
      setTimeLeft(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.status, game?.last_turn_at]);

  const youId = profile?.id;
  const yourHand = useMemo(() => (youId && game ? game.hands[youId] ?? [] : []), [game, youId]);
  const top = game?.discard?.[game.discard.length - 1] ?? null;
  const isYourTurn = game?.current_turn === youId && game?.status === "playing";
  const isPlayer = !!(youId && game?.players.some((p) => p.id === youId));
  const isSpectator = !!(youId && game?.spectators?.some((p) => p.id === youId));

  if (!game) return <div className="min-h-screen flex items-center justify-center">Loading the saloon…</div>;

  if (game.status !== "lobby" && youId && profile && !isPlayer && !isSpectator) {
    void api.joinGame(game.code, profile).catch(() => {});
  }

  const seoBlock = (
    <Seo title={`Room ${game.code} — Blazing 8s`} description="A round of Blazing 8s in progress." path={`/game/${id}`} noIndex />
  );

  if (game.status === "lobby") {
    return <>{seoBlock}<Lobby game={game} youId={youId} onLeave={async () => { if (youId) await api.leaveGame(game.id, youId); navigate("/"); }} /></>;
  }

  if (game.status === "finished") {
    const winner = game.players.find((p) => p.id === game.winner_id);
    const youWon = game.winner_id === youId;
    return (
      <main className="min-h-screen bg-table flex items-center justify-center p-4 text-center overflow-hidden relative">
        {seoBlock}
        {/* Confetti elements */}
        {youWon && Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti" style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: i % 3 === 0 ? "var(--color-accent)" : i % 3 === 1 ? "var(--color-primary)" : "#fff",
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }} />
        ))}
        
        <div className="bg-card/95 backdrop-blur-xl border-2 border-amber-200/20 rounded-3xl p-8 sm:p-12 max-w-lg w-full shadow-2xl relative z-10 animate-deal">
          <div className="text-8xl mb-6 animate-float">{youWon ? "🏆" : "🏜️"}</div>
          <h1 className="font-display text-5xl sm:text-6xl mb-4 bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">
            {youWon ? "VICTORY!" : "DEFEAT"}
          </h1>
          <p className="text-xl opacity-90 mb-8 font-display">
            {winner ? (
              <span><span className="text-3xl mr-2">{winner.avatar}</span> {winner.name} swept the table!</span>
            ) : "The dust has settled."}
          </p>
          
          <div className="space-y-3">
            {(isPlayer || isSpectator) && (
              <button onClick={async () => { if (youId) await api.rematch(game.id, youId); }}
                className="w-full bg-sunset font-display h-16 text-xl rounded-xl shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform">
                RAISE THE STAKES (REMATCH)
              </button>
            )}
            <Link to="/" className="block">
              <button className="w-full border-2 border-amber-200/20 bg-white/5 font-display h-14 text-lg rounded-xl hover:bg-white/10 transition-colors">
                RETURN TO SALOON
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function onPlay(card: Card) {
    if (!isYourTurn || !game || !youId || busy || !top || !game.current_suit) return;
    if (!canPlay(card, top, game.current_suit)) { setError("Can't play that card"); return; }
    if (card.rank === "8") { setPendingCard(card); return; }
    
    // Trigger animation
    setAnimatingCard({ card, from: { x: 50, y: 85 } }); // From bottom center
    setTimeout(() => setAnimatingCard(null), 600);

    setBusy(true); setError("");
    try { await api.playCard(game.id, youId, card.id); }
    catch (e) { const m = (e as Error).message; if (m !== "Not your turn") setError(m); }
    finally { setBusy(false); }
  }
  async function pickSuit(s: Suit) {
    if (!pendingCard || !game || !youId || busy) return;
    setBusy(true);
    try { await api.playCard(game.id, youId, pendingCard.id, s); setPendingCard(null); }
    catch (e) { setError((e as Error).message); setPendingCard(null); }
    finally { setBusy(false); }
  }
  async function onDraw() {
    if (!isYourTurn || !game || !youId || busy) return;
    setBusy(true);
    try { await api.drawCard(game.id, youId); }
    catch (e) { const m = (e as Error).message; if (m !== "Not your turn") setError(m); }
    finally { setBusy(false); }
  }

  const others = youId ? game.players.filter((p) => p.id !== youId) : game.players;

  const positions = useMemo(() => {
    const count = others.length;
    if (count === 0) return [];
    return others.map((_, i) => {
      let angle;
      if (count === 1) angle = 90;
      else angle = 180 - (i * (180 / (count - 1)));
      const rad = (angle * Math.PI) / 180;
      const rx = window.innerWidth < 640 ? 40 : 38;
      const ry = window.innerWidth < 640 ? 25 : 30;
      const left = 50 + rx * Math.cos(rad);
      const top = 35 - ry * Math.sin(rad);
      return { top: `${top}%`, left: `${left}%` };
    });
  }, [others.length]);

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col bg-table">
      {seoBlock}
      
      {/* Other players' cursors */}
      {Object.entries(cursors).map(([pid, pos]) => (
        pid !== youId && (
          <div key={pid} className="cursor-follower" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <div className="relative">
              <span className="text-xl drop-shadow-md">{pos.avatar}</span>
              <span className="absolute left-full top-0 ml-1 px-1.5 py-0.5 bg-black/60 text-[10px] rounded whitespace-nowrap border border-white/10 backdrop-blur-sm">
                {pos.name}
              </span>
            </div>
          </div>
        )
      ))}

      <div className="relative z-20 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-black/40 backdrop-blur-md border-b border-amber-200/10 gap-2">
        <div className="flex items-center gap-2">
          <button onClick={async () => { if (youId) await api.leaveGame(game.id, youId); navigate("/"); }}
            className="font-display h-9 px-3 text-[10px] sm:text-xs rounded-lg bg-destructive shadow-lg hover:opacity-90 transition-opacity uppercase tracking-tighter">← Leave</button>
          
          {isPlayer && game.status === "playing" && (
            <button onClick={async () => { if (youId) await api.becomeSpectator(game.id, youId); }}
              className="font-display h-9 px-3 text-[10px] sm:text-xs rounded-lg bg-white/10 border border-white/10 shadow-lg hover:bg-white/20 transition-all uppercase tracking-tighter">👀 Spectate</button>
          )}
        </div>
        
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="text-center leading-tight">
            <div className="text-[10px] opacity-50 font-display">ROOM</div>
            <div className="font-display tracking-[0.2em] text-sm sm:text-base text-amber-200">{game.code}</div>
          </div>

          {timeLeft !== null && (
            <div className={cn(
              "flex flex-col items-center justify-center min-w-[50px] p-1 rounded-lg border backdrop-blur-sm",
              timeLeft <= 10 ? "bg-destructive/20 border-destructive animate-pulse" : "bg-white/5 border-white/10"
            )}>
              <div className="text-[9px] font-display opacity-60">TIMER</div>
              <div className="font-display text-sm leading-none">{timeLeft}s</div>
            </div>
          )}
        </div>

        <div className="text-[11px] opacity-80 max-w-[40%] truncate text-right font-display italic text-amber-100/70">
          {game.last_action?.text}
        </div>
      </div>

      {isSpectator && (
        <div className="bg-accent/20 backdrop-blur-sm border-b border-accent/40 text-center py-2 text-sm font-display relative z-20 shadow-lg">
          👀 Watching the showdown — you'll join the next round, partner!
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* The Round Table Layout */}
        <div className="relative flex-1 min-h-[400px]">
          {/* Table Indicator Ring */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[75vw] max-w-[500px] max-h-[500px] border-4 border-dashed border-amber-200/10 rounded-full pointer-events-none">
             {/* Direction Arrows */}
             <div className={cn(
               "absolute inset-0 transition-all duration-1000",
               game.direction === 1 ? "animate-spin-slow" : "animate-spin-slow-reverse"
             )}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="absolute text-amber-200/20 text-2xl" 
                    style={{ 
                      left: '50%', 
                      top: '50%', 
                      transform: `rotate(${i * 45}deg) translateY(-250px) rotate(${game.direction === 1 ? 90 : -90}deg)` 
                    }}>
                    {game.direction === 1 ? "→" : "←"}
                  </div>
                ))}
             </div>
          </div>

          {others.map((p, i) => (
            <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={positions[i]}>
              <PlayerSeat player={p} cardCount={game.hands[p.id]?.length ?? 0}
                isCurrent={game.current_turn === p.id} isHost={game.host_id === p.id} />
            </div>
          ))}

          {/* Center Area: Deck and Discard */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 sm:gap-12">
            {/* Animating Card */}
            {animatingCard && (
              <div className="fixed z-[100] pointer-events-none transition-all duration-500 ease-in-out"
                style={{
                  left: `${animatingCard.from.x}%`,
                  top: `${animatingCard.from.y}%`,
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  animation: 'play-card-anim 0.5s forwards'
                }}>
                <PlayingCard card={animatingCard.card} size="md" />
              </div>
            )}

             {/* Deck shadow effect */}
            <div className="absolute -left-1 top-1 w-24 h-36 bg-black/20 rounded-xl blur-sm -z-10"></div>
            
            <button onClick={onDraw} disabled={!isYourTurn} className="relative disabled:opacity-60 hover:scale-105 active:scale-95 transition-transform group">
              <PlayingCard faceDown size="lg" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">DRAW</div>
            </button>

            <div className="relative group">
              {/* Discard pile depth effect */}
              {game.discard.length > 1 && (
                <div className="absolute inset-0 translate-x-1 translate-y-1 rotate-3 -z-10">
                   <PlayingCard card={game.discard[game.discard.length - 2]} size="lg" disabled />
                </div>
              )}
              
              {top && <PlayingCard card={top} size="lg" overrideSuit={game.current_suit ?? undefined} />}
              
              {game.current_suit && top && (top.rank === "8" || top.rank === "K") && (
                <div className="absolute -bottom-4 -right-4 bg-amber-50 border-2 border-amber-200 rounded-full w-12 h-12 flex items-center justify-center text-3xl shadow-2xl"
                  style={{ color: SUIT_COLOR[game.current_suit] === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.2 0.02 30)" }}>
                  {SUIT_SYMBOL[game.current_suit]}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mb-4 relative z-20">
          {isYourTurn ? (
            <div className="inline-block bg-accent text-accent-foreground px-6 py-2 rounded-full font-display text-base shadow-glow">
              Your move, partner! 🤠
            </div>
          ) : (
            <div className="bg-black/20 backdrop-blur-sm inline-block px-4 py-1.5 rounded-full border border-white/5 text-sm">
              <span className="opacity-60">Waitin' for </span>
              <span className="font-display text-amber-200">{game.players.find((p) => p.id === game.current_turn)?.name}</span>
              <span className="opacity-60">…</span>
            </div>
          )}
          {error && <div className="text-sm mt-2 font-display bg-destructive/10 py-1 px-4 inline-block rounded-lg" style={{ color: "oklch(0.7 0.2 25)" }}>{error}</div>}
        </div>

        {isPlayer ? (
          <div className="pb-8 px-1 bg-gradient-to-t from-black/40 to-transparent pt-6">
            <div className="flex justify-center -space-x-6 sm:-space-x-8 overflow-x-auto py-12 px-8 no-scrollbar min-h-[200px] items-end relative">
               {/* Your Avatar at the bottom center of the table area */}
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 -translate-y-full opacity-50 scale-75 pointer-events-none">
                  <PlayerSeat player={profile!} cardCount={yourHand.length} isCurrent={isYourTurn} />
               </div>

              {yourHand.map((card, i) => {
                const playable = !!top && !!game.current_suit && isYourTurn && canPlay(card, top, game.current_suit);
                return (
                  <div key={card.id} className="animate-deal shrink-0 transition-all duration-200 hover:z-50 hover:-translate-y-4" style={{ animationDelay: `${i * 50}ms`, zIndex: i }}>
                    <PlayingCard card={card} size="md" onClick={() => onPlay(card)} disabled={!playable} highlight={playable} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : isSpectator ? (
          <div className="pb-8 px-1 bg-gradient-to-t from-black/20 to-transparent pt-6 border-t border-white/5">
             <div className="text-center mb-4 text-xs font-display opacity-50 tracking-widest uppercase">Table View (All Hands)</div>
             <div className="flex flex-wrap justify-center gap-6 px-4">
               {game.players.map((p) => (
                 <div key={p.id} className="flex flex-col items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                   <div className="flex -space-x-4">
                     {Array.from({ length: Math.min(game.hands[p.id]?.length || 0, 5) }).map((_, i) => (
                       <div key={i} style={{ zIndex: i }}>
                         <PlayingCard faceDown size="sm" />
                       </div>
                     ))}
                     {(game.hands[p.id]?.length || 0) > 5 && (
                       <div className="w-10 h-[58px] bg-card border border-border rounded-lg flex items-center justify-center text-[10px] font-display z-10 translate-x-2">
                         +{game.hands[p.id].length - 5}
                       </div>
                     )}
                   </div>
                   <div className="text-[10px] font-display opacity-70 flex items-center gap-1">
                     <span>{p.avatar}</span>
                     <span className="truncate max-w-[60px]">{p.name}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        ) : (
          <div className="pb-10 text-center bg-black/40 backdrop-blur-sm pt-6 border-t border-white/5">
            <p className="opacity-60 text-sm font-display tracking-wide italic">Watching the showdown — wait for this round to end to join the table.</p>
          </div>
        )}
      </div>

      {pendingCard && <SuitPicker onPick={pickSuit} onCancel={() => setPendingCard(null)} />}
    </main>
  );
}

function Lobby({ game, youId, onLeave }: { game: GameRow; youId?: string; onLeave: () => void }) {
  const isHost = game.host_id === youId;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    await navigator.clipboard.writeText(game.code);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  async function start() {
    setBusy(true); setError("");
    try { if (!youId) throw new Error("No profile"); await api.startGame(game.id, youId); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-table">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm opacity-80" onClick={onLeave}>← Leave</Link>
          <span className="font-display text-xl">🔥 Blazing 8s</span>
        </div>
        <div className="bg-card/90 backdrop-blur border border-border rounded-2xl p-6 sm:p-8 shadow-card text-center">
          <p className="opacity-80 text-sm">Share this code with your posse</p>
          <button onClick={copy} className="mt-2 inline-flex items-center gap-3">
            <span className="font-display text-5xl sm:text-7xl tracking-[0.2em]" style={{ color: "oklch(0.78 0.16 70)" }}>{game.code}</span>
            <span className="text-xs bg-black/40 px-2 py-1 rounded">{copied ? "Copied!" : "Copy"}</span>
          </button>
          <div className="mt-8">
            <h3 className="font-display text-xl mb-3">Players ({game.players.length}/6)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {game.players.map((p) => (
                <div key={p.id} className="bg-black/30 border border-border rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-display truncate">{p.name}</span>
                  {p.id === game.host_id && <span className="ml-auto text-sm">👑</span>}
                </div>
              ))}
              {Array.from({ length: 6 - game.players.length }).map((_, i) => (
                <div key={i} className="border border-dashed border-border rounded-xl p-3 opacity-50 text-sm flex items-center justify-center">empty seat</div>
              ))}
            </div>
          </div>
          <div className="mt-8">
            {isHost ? (
              <button onClick={start} disabled={busy || game.players.length < 2}
                className="w-full bg-sunset font-display h-14 text-lg rounded-lg shadow-glow disabled:opacity-60">
                {game.players.length < 2 ? "Need 2+ players" : "Deal the cards 🎴"}
              </button>
            ) : <p className="opacity-70 italic">Waiting for the host to start…</p>}
            {error && <p className="text-sm mt-2" style={{ color: "oklch(0.7 0.2 25)" }}>{error}</p>}
          </div>
        </div>
        <p className="mt-6 text-center text-sm opacity-80">
          <strong>How to play:</strong> Match suit or rank. <strong>★ Wild 8</strong>, <strong>⇄ Switcheroo</strong> playable anytime. <strong>+1</strong> = next draws 1. <strong>J</strong> skips. <strong>Q</strong> reverses (3+).
        </p>
      </div>
    </main>
  );
}
