import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGuest } from "@/lib/use-guest";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { canPlay, type Card, type GameRow, type Suit, SUIT_HEX, SUIT_SYMBOL } from "@/lib/game";
import { PlayingCard } from "@/components/PlayingCard";
import { PlayerSeat } from "@/components/PlayerSeat";
import { SuitPicker } from "@/components/SuitPicker";
import { Seo } from "@/components/Seo";
import { VoicePanel } from "@/components/VoicePanel";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { avatarUrl } from "@/lib/avatar";
import { FlameIcon, CrownIcon, EyeIcon, LeaveIcon, ChatIcon, EmojiIcon, SendIcon, CopyIcon, CowboyIcon, SettingsIcon, SwitchIcon } from "@/components/Icons";
import { SevenTVPicker, renderWithEmotes } from "@/components/SevenTVPicker";

interface ChatMsg {
  id: string;
  playerId: string;
  name: string;
  avatar: string;
  text: string;
  ts: number;
}

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// Phase-based flying card — reliable across all browsers
interface FlyingCard {
  id: string;
  card: Card | null;
  fromX: number; fromY: number;
  toX: number; toY: number;
  isSwitch?: boolean;
  phase: 0 | 1 | 2; // 0=at-from, 1=flying, 2=fading
}

interface SwitchOverlay {
  fromAvatar: string; fromName: string;
  toAvatar: string; toName: string;
  key: string;
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
  const [lastProcessedAction, setLastProcessedAction] = useState<string | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [reverseFlash, setReverseFlash] = useState<string | null>(null);
  const [switchOverlay, setSwitchOverlay] = useState<SwitchOverlay | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatUnread, setChatUnread] = useState(0);
  const [chatEmojiOpen, setChatEmojiOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const youId = profile?.id;
  const { state: voiceState, enable: voiceEnable, disable: voiceDisable, toggleMute: voiceToggleMute, changeMic: voiceChangeMic, setVolume: voiceSetVolume } =
    useVoiceChat(id, youId ?? "");

  function addTimer(t: ReturnType<typeof setTimeout>) {
    timersRef.current.push(t);
  }

  // Phase-based flying card animation — uses CSS transition (100% reliable)
  const launchCard = useCallback((
    card: Card | null,
    fromX: number, fromY: number,
    toX = 50, toY = 46,
    isSwitch = false
  ) => {
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const duration = isSwitch ? 680 : 580;

    setFlyingCards(prev => [...prev, { id, card, fromX, fromY, toX, toY, isSwitch, phase: 0 }]);

    // Phase 1: start flying (after small delay for DOM paint)
    addTimer(setTimeout(() => {
      setFlyingCards(prev => prev.map(fc => fc.id === id ? { ...fc, phase: 1 } : fc));
    }, 24));

    // Phase 2: fade out
    addTimer(setTimeout(() => {
      setFlyingCards(prev => prev.map(fc => fc.id === id ? { ...fc, phase: 2 } : fc));
    }, duration + 24));

    // Remove
    addTimer(setTimeout(() => {
      setFlyingCards(prev => prev.filter(fc => fc.id !== id));
    }, duration + 340));
  }, []);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate(`/auth?next=/game/${id}`);
  }, [profile, loading, navigate, id]);

  // Refs so handlers always see latest values without stale closures
  const gameRef = useRef(game);
  useEffect(() => { gameRef.current = game; }, [game]);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  // Connect socket on mount, disconnect only on full unmount
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  // Register game room listeners — re-runs only when room or profile changes
  useEffect(() => {
    if (!id || !profile) return;
    const socket = getSocket();

    api.getGame(id).then(setGame).catch(() => navigate("/"));

    // Named handler refs so socket.off removes exactly the right ones
    function joinRoom() { socket.emit("join", id); }

    function onGameUpdate(g: GameRow) { setGame(g); }
    function onChatHistory(msgs: ChatMsg[]) { setChatMsgs(msgs); }
    function onChatMessage(msg: ChatMsg) {
      setChatMsgs(prev => [...prev, msg]);
      if (!chatOpenRef.current) setChatUnread(prev => prev + 1);
    }
    function onPlayerMoved(data: { playerId: string; x: number; y: number }) {
      const g = gameRef.current;
      const p = [...(g?.players || []), ...(g?.spectators || [])].find(x => x.id === data.playerId);
      if (p) setCursors(prev => ({ ...prev, [data.playerId]: { x: data.x, y: data.y, name: p.name, avatar: p.avatar } }));
    }

    socket.on("connect", joinRoom);
    socket.on("game:update", onGameUpdate);
    socket.on("chat:history", onChatHistory);
    socket.on("chat:message", onChatMessage);
    socket.on("player:moved", onPlayerMoved);

    // If already connected, join immediately; connect event will handle reconnects
    if (socket.connected) joinRoom();

    let lastMove = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (!socket.connected) return;
      const now = Date.now();
      if (now - lastMove < 60) return;
      lastMove = now;
      socket.emit("player:move", { gameId: id, playerId: profile.id, x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      socket.emit("leave", id);
      socket.off("connect", joinRoom);
      socket.off("game:update", onGameUpdate);
      socket.off("chat:history", onChatHistory);
      socket.off("chat:message", onChatMessage);
      socket.off("player:moved", onPlayerMoved);
      window.removeEventListener("mousemove", handleMouseMove);
      // Do NOT disconnect here — socket stays alive for the session
    };
  }, [id, profile, navigate]);

  useEffect(() => {
    if (game?.status !== "playing" || !game.last_turn_at) { setTimeLeft(null); return; }
    const interval = setInterval(() => {
      const diff = Math.max(0, 60 - Math.floor((Date.now() - new Date(game.last_turn_at!).getTime()) / 1000));
      setTimeLeft(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [game?.status, game?.last_turn_at]);

  const yourHand = useMemo(() => (youId && game ? game.hands[youId] ?? [] : []), [game, youId]);
  const others = useMemo(() => {
    if (!game) return [];
    return youId ? game.players.filter(p => p.id !== youId) : game.players;
  }, [game, youId]);

  // Positions — players sit ON the ring border
  const positions = useMemo(() => {
    const count = others.length;
    if (count === 0) return [];
    if (count === 1) return [{ top: "12%", left: "50%", angle: 90 }];
    return others.map((_, i) => {
      const angle = 180 - (i * (180 / (count - 1)));
      const rad = (angle * Math.PI) / 180;
      const isMobile = window.innerWidth < 640;
      const rx = isMobile ? 36 : 35;
      const ry = isMobile ? 23 : 27;
      const left = 50 + rx * Math.cos(rad);
      const top = Math.max(11, 43 - ry * Math.sin(rad));
      return { top: `${top}%`, left: `${left}%`, angle };
    });
  }, [others.length]);

  // Get viewport position (%) of a player
  const getPlayerPos = useCallback((playerId: string): { x: number; y: number } | null => {
    if (playerId === youId) return { x: 50, y: 86 };
    const idx = others.findIndex(p => p.id === playerId);
    if (idx !== -1 && positions[idx]) return { x: parseFloat(positions[idx].left), y: parseFloat(positions[idx].top) };
    return null;
  }, [youId, others, positions]);

  // Trigger animations for other players' moves
  useEffect(() => {
    if (!game?.last_action || game.last_action.type !== "play") return;
    const action = game.last_action;
    if (!action.by) return;

    const actionKey = `${action.by}-${action.card_rank}-${game.updated_at}`;
    if (lastProcessedAction === actionKey) return;
    setLastProcessedAction(actionKey);

    const byPos = getPlayerPos(action.by);
    const topCard = game.discard[game.discard.length - 1];

    if (action.card_rank === "K" && action.swap_target) {
      const targetPos = getPlayerPos(action.swap_target);
      if (byPos && targetPos) {
        launchCard(null, byPos.x, byPos.y, targetPos.x, targetPos.y, true);
        addTimer(setTimeout(() => launchCard(null, targetPos.x, targetPos.y, byPos.x, byPos.y, true), 100));
        const byPlayer = game.players.find(p => p.id === action.by);
        const tPlayer = game.players.find(p => p.id === action.swap_target);
        if (byPlayer && tPlayer) {
          setSwitchOverlay({ fromAvatar: byPlayer.avatar, fromName: byPlayer.name, toAvatar: tPlayer.avatar, toName: tPlayer.name, key: actionKey });
          addTimer(setTimeout(() => setSwitchOverlay(null), 1800));
        }
      }
      return;
    }

    if (action.card_rank === "Q") {
      setReverseFlash(actionKey);
      addTimer(setTimeout(() => setReverseFlash(null), 1500));
    }

    if (action.by !== youId && byPos && topCard) {
      launchCard(topCard, byPos.x, byPos.y, 50, 46);
    }
  }, [game?.last_action, game?.updated_at, getPlayerPos, launchCard, youId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMsgs, chatOpen]);

  // Reset unread when opening chat
  useEffect(() => {
    if (chatOpen) setChatUnread(0);
  }, [chatOpen]);

  function sendChat() {
    const text = chatInput.trim();
    if (!text || !profile || !id) return;
    const socket = getSocket();
    socket.emit("chat:send", { gameId: id, playerId: profile.id, name: profile.name, avatar: profile.avatar, text });
    setChatInput("");
    chatInputRef.current?.focus();
  }

  const nextPlayer = useMemo(() => {
    if (!game || game.status !== "playing" || !game.current_turn) return null;
    const idx = game.players.findIndex(p => p.id === game.current_turn);
    if (idx === -1) return null;
    const n = game.players.length;
    const nextIdx = ((idx + game.direction) % n + n) % n;
    return game.players[nextIdx] ?? null;
  }, [game?.current_turn, game?.direction, game?.players, game?.status]);

  // Arrows — sit on the ring's thick border (just past 50% radius)
  const arrows = useMemo(() => {
    if (!game || game.status !== "playing") return [];
    const myPos = { angle: 270, playerId: youId ?? "" };
    const allPos = [
      ...positions.map((p, i) => ({ angle: p.angle, playerId: others[i]?.id ?? "" })),
      myPos,
    ];
    allPos.sort((a, b) => a.angle - b.angle);

    const currentIdx = game.players.findIndex(p => p.id === game.current_turn);
    const n = game.players.length;
    const nextIdx = ((currentIdx + game.direction) % n + n) % n;
    const nextId = game.players[nextIdx]?.id;

    return allPos.map((p1, i) => {
      const p2 = allPos[(i + 1) % allPos.length];
      // Detect wrap-around pair (p1 > p2 because array is sorted ascending)
      // e.g. 2 players at 90° and 270°: pair (270,90) wraps through 0°
      let midAngle = (p1.angle + p2.angle) / 2;
      if (p2.angle < p1.angle) midAngle += 180; // wrap-around: shift to correct arc midpoint
      const rad = (midAngle * Math.PI) / 180;
      // 51.5% places arrows in the center of the thick ring border
      const ringLeft = 50 + 51.5 * Math.cos(rad);
      const ringTop  = 50 - 51.5 * Math.sin(rad);
      // Correct tangent: ▶ at 0° points right; clockwise on screen = 90-midAngle
      const rotateDeg = (90 - midAngle) + (game.direction === -1 ? 180 : 0);

      const isNextArrow =
        (game.direction === 1 && (p1.playerId === game.current_turn || p2.playerId === nextId)) ||
        (game.direction === -1 && (p2.playerId === game.current_turn || p1.playerId === nextId));

      return { ringLeft, ringTop, rotateDeg, isNextArrow };
    });
  }, [positions, others, game?.direction, game?.status, game?.current_turn, game?.players, youId]);

  const topCard = game?.discard?.[game.discard.length - 1] ?? null;
  const isYourTurn = game?.current_turn === youId && game?.status === "playing";
  const isPlayer = !!(youId && game?.players.some(p => p.id === youId));
  const isSpectator = !!(youId && game?.spectators?.some(p => p.id === youId));

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center bg-table">
      <div className="font-display text-amber-200 text-xl opacity-70">Loading the saloon…</div>
    </div>
  );

  if (game.status !== "lobby" && youId && profile && !isPlayer && !isSpectator) {
    void api.joinGame(game.code, profile).catch(() => {});
  }

  const seoBlock = <Seo title={`Room ${game.code} — Blazing 8s`} description="A round of Blazing 8s in progress." path={`/game/${id}`} noIndex />;

  if (game.status === "lobby") {
    return <>{seoBlock}<Lobby game={game} youId={youId} onLeave={async () => { if (youId) await api.leaveGame(game.id, youId); navigate("/"); }} /></>;
  }

  if (game.status === "finished") {
    const winner = game.players.find(p => p.id === game.winner_id);
    const youWon = game.winner_id === youId;
    return (
      <main className="min-h-screen bg-table flex items-center justify-center p-4 text-center overflow-hidden relative">
        {seoBlock}
        {youWon && Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: i % 3 === 0 ? "var(--color-accent)" : i % 3 === 1 ? "var(--color-primary)" : "#fff", animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 2}s` }} />
        ))}
        <div className="bg-card/95 backdrop-blur-xl border-2 border-amber-200/20 rounded-3xl p-8 sm:p-12 max-w-lg w-full shadow-2xl relative z-10 animate-deal">
          <div className="text-8xl mb-6">{youWon ? "🏆" : "🏜️"}</div>
          <h1 className="font-display text-5xl sm:text-6xl mb-4 bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">{youWon ? "VICTORY!" : "DEFEAT"}</h1>
          <p className="text-xl opacity-90 mb-8 font-display">
            {winner ? <span className="flex items-center justify-center gap-2"><img src={avatarUrl(winner.avatar)} alt="winner" className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/50" />{winner.name} swept the table!</span> : "The dust has settled."}
          </p>
          <div className="space-y-3">
            {(isPlayer || isSpectator) && (
              <button onClick={async () => { if (youId) await api.rematch(game.id, youId); }} className="w-full bg-sunset font-display h-14 text-lg rounded-xl shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform">
                RAISE THE STAKES (REMATCH)
              </button>
            )}
            <Link to="/"><button className="w-full border-2 border-amber-200/20 bg-white/5 font-display h-12 text-base rounded-xl hover:bg-white/10 transition-colors">RETURN TO SALOON</button></Link>
          </div>
        </div>
      </main>
    );
  }

  async function onPlay(card: Card) {
    if (!isYourTurn || !game || !youId || busy || !topCard || !game.current_suit) return;
    if (!canPlay(card, topCard, game.current_suit)) { setError("Can't play that card"); return; }
    if (card.rank === "8") { setPendingCard(card); return; }

    if (card.rank === "K") {
      const currentIdx = game.players.findIndex(p => p.id === youId);
      const nextIdx = ((currentIdx + game.direction) % game.players.length + game.players.length) % game.players.length;
      const nextPlayer = game.players[nextIdx];
      if (nextPlayer && nextPlayer.id !== youId) {
        const tPos = getPlayerPos(nextPlayer.id);
        if (tPos) {
          launchCard(null, 50, 86, tPos.x, tPos.y, true);
          addTimer(setTimeout(() => launchCard(null, tPos.x, tPos.y, 50, 86, true), 100));
          setSwitchOverlay({ fromAvatar: profile!.avatar, fromName: profile!.name, toAvatar: nextPlayer.avatar, toName: nextPlayer.name, key: `local-${Date.now()}` });
          addTimer(setTimeout(() => setSwitchOverlay(null), 1800));
        }
      }
    } else if (card.rank === "Q") {
      setReverseFlash(`local-q-${Date.now()}`);
      addTimer(setTimeout(() => setReverseFlash(null), 1500));
      launchCard(card, 50, 86, 50, 46);
    } else {
      launchCard(card, 50, 86, 50, 46);
    }

    setBusy(true); setError("");
    try { await api.playCard(game.id, youId, card.id); }
    catch (e) { const m = (e as Error).message; if (m !== "Not your turn") setError(m); }
    finally { setBusy(false); }
  }

  async function pickSuit(s: Suit) {
    if (!pendingCard || !game || !youId || busy) return;
    launchCard(pendingCard, 50, 86, 50, 46);
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

  const suitIndicatorColor = game.current_suit ? SUIT_HEX[game.current_suit] : undefined;

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col bg-table" style={{ height: "100dvh" }}>
      {seoBlock}

      {/* ── Flying cards layer (CSS transition-based, reliable) ── */}
      {flyingCards.map(fc => (
        <div
          key={fc.id}
          style={{
            position: "fixed",
            zIndex: 200,
            pointerEvents: "none",
            left: fc.phase >= 1 ? `${fc.toX}%` : `${fc.fromX}%`,
            top:  fc.phase >= 1 ? `${fc.toY}%` : `${fc.fromY}%`,
            opacity: fc.phase >= 2 ? 0 : 1,
            transform: `translate(-50%, -50%)${fc.phase >= 1 && fc.isSwitch ? " rotate(360deg)" : ""}`,
            transition: fc.phase >= 1
              ? `left ${fc.isSwitch ? 680 : 580}ms cubic-bezier(0.2,0.8,0.2,1), top ${fc.isSwitch ? 680 : 580}ms cubic-bezier(0.2,0.8,0.2,1), opacity 300ms ease-out, transform ${fc.isSwitch ? 680 : 580}ms ease-in-out`
              : "none",
          }}
        >
          {fc.card ? <PlayingCard card={fc.card} size="md" /> : <PlayingCard faceDown size="md" />}
        </div>
      ))}

      {/* ── Reverse banner ── */}
      {reverseFlash && (
        <div key={reverseFlash} className="fixed z-[300] pointer-events-none" style={{ left: "50%", top: "50%", animation: "reverse-banner 1.5s ease forwards" }}>
          <div className="bg-amber-400/95 backdrop-blur-md border-4 border-amber-200 rounded-2xl px-8 py-4 shadow-2xl text-center">
            <div className="font-display text-2xl sm:text-3xl text-amber-950 tracking-widest">↺ REVERSE! ↻</div>
            <div className="text-xs text-amber-900 font-display mt-1">Direction changed!</div>
          </div>
        </div>
      )}

      {/* ── Switcheroo banner — no SVG/circles, just the clean popup ── */}
      {switchOverlay && (
        <div key={switchOverlay.key} className="fixed z-[300] pointer-events-none" style={{ left: "50%", top: "50%", animation: "switch-banner 1.8s ease forwards" }}>
          <div className="bg-purple-900/95 backdrop-blur-md border-4 border-purple-400 rounded-2xl px-5 py-4 shadow-2xl text-center min-w-[200px]">
            <div className="font-display text-xl sm:text-2xl text-purple-200 tracking-wider mb-2 flex items-center justify-center gap-2">
              <SwitchIcon size={24} color="#c084fc" />
              SWITCHEROO!
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center">
                <img src={avatarUrl(switchOverlay.fromAvatar)} alt="from" className="w-10 h-10 rounded-full object-cover border-2 border-purple-400/50" />
                <span className="text-[10px] font-display text-purple-300 max-w-[56px] truncate mt-0.5">{switchOverlay.fromName}</span>
              </div>
              <span className="text-purple-300 text-2xl font-bold">⇄</span>
              <div className="flex flex-col items-center">
                <img src={avatarUrl(switchOverlay.toAvatar)} alt="to" className="w-10 h-10 rounded-full object-cover border-2 border-purple-400/50" />
                <span className="text-[10px] font-display text-purple-300 max-w-[56px] truncate mt-0.5">{switchOverlay.toName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cursor followers ── */}
      {Object.entries(cursors).map(([pid, pos]) => (
        pid !== youId && (
          <div key={pid} className="cursor-follower" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <img src={avatarUrl(pos.avatar)} alt="cursor" className="w-7 h-7 rounded-full object-cover drop-shadow-md border border-amber-400/30" />
          </div>
        )
      ))}

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-2 sm:px-4 py-2 bg-black/50 backdrop-blur-md border-b border-amber-200/10 gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => { if (youId) await api.leaveGame(game.id, youId); navigate("/"); }}
            className="font-display h-8 px-2.5 text-[10px] sm:text-xs rounded-lg bg-destructive shadow-lg hover:opacity-90 transition-opacity uppercase tracking-tighter flex items-center gap-1"
          >
            <LeaveIcon size={14} color="#fff" />
            Leave
          </button>
          {isPlayer && game.status === "playing" && (
            <button
              onClick={async () => { if (youId) await api.becomeSpectator(game.id, youId); }}
              className="font-display h-8 px-2 text-[10px] rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 transition-all uppercase tracking-tighter hidden sm:flex items-center gap-1"
            >
              <EyeIcon size={14} color="#fbbf24" />
              Spectate
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-center leading-tight">
            <div className="text-[9px] opacity-50 font-display">ROOM</div>
            <div className="font-display tracking-[0.2em] text-sm text-amber-200">{game.code}</div>
          </div>
          {timeLeft !== null && (
            <div className={cn("flex flex-col items-center justify-center min-w-[42px] px-1.5 py-0.5 rounded-lg border", timeLeft <= 10 ? "bg-destructive/20 border-destructive animate-pulse" : "bg-white/5 border-white/10")}>
              <div className="text-[8px] font-display opacity-60">TIME</div>
              <div className="font-display text-xs leading-none">{timeLeft}s</div>
            </div>
          )}
        </div>

        <div className="text-[10px] opacity-70 max-w-[36%] truncate text-right font-display italic text-amber-100/70">
          {game.last_action?.text}
        </div>
      </div>

      {isSpectator && (
        <div className="bg-accent/20 backdrop-blur-sm border-b border-accent/40 text-center py-1.5 text-xs font-display relative z-20 flex-shrink-0 flex items-center justify-center gap-1.5">
          <EyeIcon size={14} color="#fbbf24" /> Watching — you'll join next round!
        </div>
      )}

      {/* ── Game area ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Table with players and center pile */}
        <div className="relative flex-1 min-h-0">

          {/* Table ring — thick warm border like reference */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              top: "46%",
              width: "min(80vw, 62vh)",
              height: "min(80vw, 62vh)",
              background: "radial-gradient(circle at 42% 38%, rgba(50,24,7,0.97) 0%, rgba(14,6,1,0.99) 100%)",
              border: reverseFlash
                ? "13px solid rgba(240,160,30,0.95)"
                : "13px solid rgba(175,100,20,0.9)",
              boxShadow: reverseFlash
                ? "0 0 0 3px rgba(255,210,60,0.5), 0 0 0 6px rgba(200,130,20,0.2), inset 0 0 80px rgba(0,0,0,0.65), 0 12px 50px rgba(0,0,0,0.6), 0 0 40px rgba(240,160,30,0.25)"
                : "0 0 0 3px rgba(220,140,25,0.4), 0 0 0 6px rgba(140,75,10,0.15), inset 0 0 80px rgba(0,0,0,0.65), 0 12px 50px rgba(0,0,0,0.6)",
              transition: "border-color 0.4s, box-shadow 0.4s",
            }}
          >
            {/* Connectors — sit ON the thick ring border */}
            {arrows.map((arrow, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${arrow.ringLeft}%`,
                  top: `${arrow.ringTop}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: arrow.isNextArrow ? 20 : 10,
                }}
              >
                {/* Arrow — no background, direction flips with game.direction */}
                <div
                  style={{
                    transform: `rotate(${arrow.rotateDeg}deg)`,
                    fontSize: arrow.isNextArrow ? "18px" : "13px",
                    color: arrow.isNextArrow
                      ? reverseFlash ? "rgba(255,230,60,1)" : "rgba(255,200,50,1)"
                      : "rgba(200,130,30,0.45)",
                    textShadow: arrow.isNextArrow
                      ? reverseFlash
                        ? "0 0 12px rgba(255,230,60,1), 0 0 24px rgba(255,200,40,0.8)"
                        : "0 0 8px rgba(255,200,40,0.9), 0 0 18px rgba(255,180,20,0.5)"
                      : "none",
                    transition: "transform 0.65s cubic-bezier(0.34,1.56,0.64,1), color 0.3s, text-shadow 0.3s, font-size 0.3s",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  ▶
                </div>
              </div>
            ))}
          </div>

          {/* Other players */}
          {others.map((p, i) => (
            <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={positions[i]}>
              <PlayerSeat player={p} cardCount={game.hands[p.id]?.length ?? 0} isCurrent={game.current_turn === p.id} isHost={game.host_id === p.id} isSpeaking={!!voiceState.speaking[p.id]} />
            </div>
          ))}

          {/* Center: Deck + Discard */}
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 sm:gap-8" style={{ top: "46%" }}>
            {/* Draw pile */}
            <button
              onClick={onDraw}
              disabled={!isYourTurn}
              className="relative disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform group"
            >
              <PlayingCard faceDown size="lg" />
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/70 px-2 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-display whitespace-nowrap">
                Draw card
              </div>
            </button>

            {/* Discard pile */}
            <div className="relative">
              {game.discard.length > 1 && (
                <div className="absolute inset-0 translate-x-1 translate-y-1 rotate-6 -z-10 opacity-60">
                  <PlayingCard card={game.discard[game.discard.length - 2]} size="lg" />
                </div>
              )}
              {topCard && <PlayingCard card={topCard} size="lg" overrideSuit={game.current_suit ?? undefined} />}

              {/* Wild suit indicator */}
              {game.current_suit && topCard && (topCard.rank === "8" || topCard.rank === "K") && (
                <div
                  className="absolute -bottom-3 -right-3 bg-white border-2 rounded-full w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-xl sm:text-2xl shadow-xl"
                  style={{ borderColor: suitIndicatorColor, color: suitIndicatorColor }}
                >
                  {SUIT_SYMBOL[game.current_suit]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Turn indicator ── */}
        <div className="text-center py-1.5 relative z-20 flex-shrink-0">
          {isYourTurn ? (
            <div className="inline-block bg-accent text-accent-foreground px-5 py-1.5 rounded-full font-display text-sm shadow-glow animate-pulse-glow">
              Your move, partner! 🤠
            </div>
          ) : (
            <div className="bg-black/30 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-white/5 text-xs sm:text-sm">
              <span className="opacity-50">Waitin' for </span>
              <span className="font-display text-amber-200">{game.players.find(p => p.id === game.current_turn)?.name}</span>
              <span className="opacity-50">…</span>
            </div>
          )}
          {error && (
            <div className="mt-1 text-xs font-display bg-destructive/10 py-0.5 px-3 inline-block rounded-lg" style={{ color: "oklch(0.7 0.2 25)" }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Player hand / spectator view ── */}
        {isPlayer ? (
          <div className="flex-shrink-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pt-2 pb-3 px-2">
            {/* Player info strip */}
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <img src={avatarUrl(profile?.avatar ?? "Felix")} alt="me" className="w-6 h-6 rounded-full object-cover border border-amber-400/30" />
              <span className="text-[10px] font-display text-amber-200/70 truncate max-w-[80px]">{profile?.name}</span>
              <span className="text-[10px] bg-amber-900/40 px-1.5 py-0.5 rounded-full font-display text-amber-200/60">{yourHand.length} cards</span>
              {isYourTurn && <span className="text-[10px] bg-accent/20 border border-accent/40 px-1.5 py-0.5 rounded-full font-display text-accent animate-pulse">YOUR TURN</span>}
            </div>

            {/* Hand cards — no ghost avatar, clean horizontal scroll */}
            <div
              className="flex items-end justify-center overflow-x-auto no-scrollbar"
              style={{ minHeight: "96px", paddingTop: "20px", paddingBottom: "12px", paddingLeft: "8px", paddingRight: "8px" }}
            >
              {yourHand.map((card, i) => {
                const playable = !!topCard && !!game.current_suit && isYourTurn && canPlay(card, topCard, game.current_suit);
                return (
                  <div
                    key={card.id}
                    className="animate-hand-deal flex-shrink-0 hover:-translate-y-4 transition-transform duration-150"
                    style={{
                      animationDelay: `${i * 35}ms`,
                      marginLeft: i === 0 ? 0 : "-6px",
                    }}
                  >
                    <PlayingCard
                      card={card}
                      size="md"
                      onClick={() => onPlay(card)}
                      disabled={!playable}
                      highlight={playable}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : isSpectator ? (
          <div className="flex-shrink-0 pb-3 px-2 bg-gradient-to-t from-black/20 to-transparent border-t border-white/5">
            <div className="text-center mb-2 text-[10px] font-display opacity-40 tracking-widest uppercase pt-2">All Hands</div>
            <div className="flex flex-wrap justify-center gap-3 px-2">
              {game.players.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1 bg-black/20 p-2 rounded-xl border border-white/5">
                  <div className="flex" style={{ gap: "-4px" }}>
                    {Array.from({ length: Math.min(game.hands[p.id]?.length || 0, 5) }).map((_, i) => (
                      <div key={i} style={{ zIndex: i, marginLeft: i === 0 ? 0 : "-6px" }}>
                        <PlayingCard faceDown size="sm" />
                      </div>
                    ))}
                    {(game.hands[p.id]?.length || 0) > 5 && (
                      <div className="w-8 h-[46px] bg-card border border-border rounded-lg flex items-center justify-center text-[9px] font-display" style={{ marginLeft: "-6px" }}>
                        +{game.hands[p.id].length - 5}
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] font-display opacity-60 flex items-center gap-0.5">
                    <img src={avatarUrl(p.avatar)} alt={p.name} className="w-4 h-4 rounded-full object-cover" />
                    <span className="truncate max-w-[48px]">{p.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 pb-6 text-center bg-black/30 backdrop-blur-sm pt-4 border-t border-white/5">
            <p className="opacity-50 text-xs font-display tracking-wide italic">Wait for this round to end to join the table.</p>
          </div>
        )}
      </div>

      {pendingCard && <SuitPicker onPick={pickSuit} onCancel={() => setPendingCard(null)} />}

      {/* ── Voice panel ── */}
      <div className="fixed bottom-4 right-[4.5rem] z-[250]">
        <VoicePanel
          state={voiceState}
          players={game?.players ?? []}
          myPlayerId={youId ?? ""}
          onEnable={voiceEnable}
          onDisable={voiceDisable}
          onToggleMute={voiceToggleMute}
          onChangeMic={voiceChangeMic}
          onSetVolume={voiceSetVolume}
        />
      </div>

      {/* ── Chat panel ── */}
      <div className="fixed bottom-4 right-3 z-[250] flex flex-col items-end gap-2">
        {chatOpen && (
          <div className="w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden border border-amber-200/15 shadow-2xl"
               style={{ background: "rgba(10,6,4,0.94)", backdropFilter: "blur(16px)", maxHeight: "340px" }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/10 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <ChatIcon size={15} color="#fbbf24" />
                <span className="font-display text-xs text-amber-200/80 tracking-wide">SALOON CHAT</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-amber-200/40 hover:text-amber-200/80 text-lg leading-none transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5" style={{ minHeight: "160px", maxHeight: "240px" }}>
              {chatMsgs.length === 0 && (
                <div className="text-center text-[10px] font-display text-amber-200/25 mt-6 tracking-widest">No messages yet…</div>
              )}
              {chatMsgs.map(msg => (
                <div key={msg.id} className={cn("flex gap-1.5 items-start", msg.playerId === youId ? "flex-row-reverse" : "flex-row")}>
                  <img src={avatarUrl(msg.avatar)} alt="avatar" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5 border border-amber-400/20" />
                  <div className={cn("max-w-[75%] flex flex-col", msg.playerId === youId ? "items-end" : "items-start")}>
                    <span className="text-[9px] font-display opacity-40 mb-0.5 px-1">{msg.playerId === youId ? "You" : msg.name}</span>
                    <div className={cn(
                      "px-2.5 py-1.5 rounded-2xl text-xs leading-snug break-words",
                      msg.playerId === youId
                        ? "bg-amber-500/80 text-white rounded-tr-sm"
                        : "bg-white/8 text-amber-100/90 rounded-tl-sm border border-white/5"
                    )}>
                      {renderWithEmotes(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="relative">
              {chatEmojiOpen && (
                <SevenTVPicker
                  onSelect={tag => { setChatInput(prev => prev + tag); chatInputRef.current?.focus(); }}
                  onClose={() => setChatEmojiOpen(false)}
                />
              )}
            </div>
            <form
              className="flex items-center gap-1.5 px-2 py-2 border-t border-amber-200/10 flex-shrink-0"
              onSubmit={e => { e.preventDefault(); sendChat(); }}
            >
              <button
                type="button"
                onClick={() => setChatEmojiOpen(o => !o)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-200/40 hover:text-amber-200/70 hover:bg-white/5 transition-colors flex-shrink-0"
                title="7TV Emotes"
              >
                <EmojiIcon size={16} color="#fbbf24" />
              </button>
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                maxLength={200}
                placeholder="Type a message…"
                className="flex-1 bg-white/6 border border-amber-200/10 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder-amber-200/25 outline-none focus:border-amber-400/30 transition-colors font-sans"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <SendIcon size={16} color="#fff" />
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setChatOpen(o => !o)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center border border-amber-200/20 shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: chatOpen ? "rgba(251,191,36,0.18)" : "rgba(10,6,4,0.82)", backdropFilter: "blur(12px)" }}
        >
          <ChatIcon size={22} color={chatOpen ? "#fbbf24" : "#fbbf2466"} />
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

interface LobbyMsg { id: string; playerId: string; name: string; avatar: string; text: string; }

function Lobby({ game, youId, onLeave }: { game: GameRow; youId?: string; onLeave: () => void }) {
  const { profile } = useGuest();
  const isHost = game.host_id === youId;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const { state: voiceState, enable: voiceEnable, disable: voiceDisable, toggleMute: voiceToggleMute, changeMic: voiceChangeMic, setVolume: voiceSetVolume } =
    useVoiceChat(game.id, youId ?? "");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<LobbyMsg[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [lobbyEmojiOpen, setLobbyEmojiOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  useEffect(() => {
    const socket = getSocket();
    function onChatMsg(msg: LobbyMsg) {
      setChatMsgs(prev => [...prev, msg]);
      if (!chatOpenRef.current) setChatUnread(n => n + 1);
    }
    function onHistory(msgs: LobbyMsg[]) { setChatMsgs(msgs); }
    socket.on("chat:message", onChatMsg);
    socket.on("chat:history", onHistory);
    return () => {
      socket.off("chat:message", onChatMsg);
      socket.off("chat:history", onHistory);
    };
  }, []);

  useEffect(() => {
    if (chatOpen) {
      setChatUnread(0);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatOpen, chatMsgs]);

  function sendChat() {
    if (!chatInput.trim() || !profile) return;
    getSocket().emit("chat:send", { gameId: game.id, playerId: profile.id, name: profile.name, avatar: profile.avatar, text: chatInput.trim() });
    setChatInput("");
  }

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
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-sm opacity-70 font-display" onClick={onLeave}>← Leave</Link>
          <span className="font-display text-lg flex items-center gap-1.5">
            <FlameIcon size={22} />
            Blazing 8s
          </span>
        </div>
        <div className="bg-card/90 backdrop-blur border border-border rounded-2xl p-5 sm:p-8 shadow-card text-center">
          <p className="opacity-70 text-xs font-display tracking-widest uppercase">Share code with your posse</p>
          <button onClick={copy} className="mt-2 inline-flex items-center gap-3 group">
            <span className="font-display text-5xl sm:text-7xl tracking-[0.2em]" style={{ color: "oklch(0.78 0.16 70)" }}>{game.code}</span>
            <span className="text-[10px] bg-black/40 px-2 py-1 rounded font-display flex items-center gap-1 group-hover:bg-amber-500/20 transition-colors">
              <CopyIcon size={12} color="#fbbf24" />
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>
          <div className="mt-6">
            <h3 className="font-display text-base mb-3 opacity-70">Players ({game.players.length}/6)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {game.players.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-black/20 rounded-xl p-2.5 border border-white/5">
                  <img src={avatarUrl(p.avatar)} alt={p.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-amber-400/20" />
                  <div className="text-left min-w-0">
                    <div className="font-display text-xs truncate">{p.name}</div>
                    {p.id === game.host_id && (
                      <div className="text-[9px] opacity-70 flex items-center gap-0.5 text-amber-400">
                        <CrownIcon size={10} color="#fbbf24" /> Host
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="mt-3 text-xs font-display" style={{ color: "oklch(0.7 0.2 25)" }}>{error}</p>}
          {isHost ? (
            <button onClick={start} disabled={busy || game.players.length < 2}
              className="mt-5 w-full bg-sunset font-display h-13 text-base rounded-xl shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 py-3 flex items-center justify-center gap-2">
              <CowboyIcon size={22} color="#fff" />
              {busy ? "Dealing…" : game.players.length < 2 ? "Need 2+ players" : "START GAME"}
            </button>
          ) : (
            <p className="mt-5 opacity-50 font-display text-sm flex items-center justify-center gap-1.5">
              <SettingsIcon size={16} color="#fbbf2450" />
              Waitin' for the host…
            </p>
          )}
        </div>
      </div>

      {/* Voice panel */}
      <div className="fixed bottom-4 right-[4.5rem] z-[250]">
        <VoicePanel
          state={voiceState}
          players={game.players}
          myPlayerId={youId ?? ""}
          onEnable={voiceEnable}
          onDisable={voiceDisable}
          onToggleMute={voiceToggleMute}
          onChangeMic={voiceChangeMic}
          onSetVolume={voiceSetVolume}
        />
      </div>

      {/* Chat panel */}
      <div className="fixed bottom-4 right-3 z-[250] flex flex-col items-end gap-2">
        {chatOpen && (
          <div className="w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden border border-amber-200/15 shadow-2xl"
               style={{ background: "rgba(10,6,4,0.94)", backdropFilter: "blur(16px)", maxHeight: "340px" }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/10 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <ChatIcon size={15} color="#fbbf24" />
                <span className="font-display text-xs text-amber-200/80 tracking-wide">LOBBY CHAT</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-amber-200/40 hover:text-amber-200/80 text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5" style={{ minHeight: "160px", maxHeight: "240px" }}>
              {chatMsgs.length === 0 && (
                <div className="text-center text-[10px] font-display text-amber-200/25 mt-6 tracking-widest">No messages yet…</div>
              )}
              {chatMsgs.map(msg => (
                <div key={msg.id} className={cn("flex gap-1.5 items-start", msg.playerId === youId ? "flex-row-reverse" : "flex-row")}>
                  <img src={avatarUrl(msg.avatar)} alt="avatar" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5 border border-amber-400/20" />
                  <div className={cn("max-w-[75%] flex flex-col", msg.playerId === youId ? "items-end" : "items-start")}>
                    <span className="text-[9px] font-display opacity-40 mb-0.5 px-1">{msg.playerId === youId ? "You" : msg.name}</span>
                    <div className={cn("px-2.5 py-1.5 rounded-2xl text-xs leading-snug break-words",
                      msg.playerId === youId ? "bg-amber-500/80 text-white rounded-tr-sm" : "bg-white/8 text-amber-100/90 rounded-tl-sm border border-white/5")}>
                      {renderWithEmotes(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="relative">
              {lobbyEmojiOpen && (
                <SevenTVPicker
                  onSelect={tag => setChatInput(prev => prev + tag)}
                  onClose={() => setLobbyEmojiOpen(false)}
                />
              )}
            </div>
            <form className="flex items-center gap-1.5 px-2 py-2 border-t border-amber-200/10 flex-shrink-0"
                  onSubmit={e => { e.preventDefault(); sendChat(); }}>
              <button type="button" onClick={() => setLobbyEmojiOpen(o => !o)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-200/40 hover:text-amber-200/70 hover:bg-white/5 transition-colors flex-shrink-0"
                title="7TV Emotes">
                <EmojiIcon size={16} color="#fbbf24" />
              </button>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} maxLength={200}
                placeholder="Type a message…"
                className="flex-1 bg-white/6 border border-amber-200/10 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder-amber-200/25 outline-none focus:border-amber-400/30 font-sans" />
              <button type="submit" disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 flex items-center justify-center flex-shrink-0">
                <SendIcon size={16} color="#fff" />
              </button>
            </form>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center border border-amber-200/20 shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: chatOpen ? "rgba(251,191,36,0.18)" : "rgba(10,6,4,0.82)", backdropFilter: "blur(12px)" }}>
          <ChatIcon size={22} color={chatOpen ? "#fbbf24" : "#fbbf2466"} />
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
