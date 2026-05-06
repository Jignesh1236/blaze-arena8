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

export default function GamePage() {
  const { id = "" } = useParams();
  const { profile, loading } = useGuest();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow | null>(null);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate(`/auth?next=/game/${id}`);
  }, [profile, loading, navigate, id]);

  useEffect(() => {
    if (!id) return;
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

    socket.on("connect", joinRoom);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit("leave", id);
      socket.off("game:update");
      socket.off("connect", joinRoom);
      socket.disconnect();
    };
  }, [id, navigate]);

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
      <main className="min-h-screen bg-table flex items-center justify-center p-4 text-center">
        {seoBlock}
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-card">
          <div className="text-6xl mb-2">{youWon ? "🏆" : "🎬"}</div>
          <h1 className="font-display text-4xl mb-1">{youWon ? "You Won!" : "Game Over"}</h1>
          <p className="opacity-80 mb-6">{winner ? `${winner.avatar} ${winner.name} took the pot.` : "The dust has settled."}</p>
          {(isPlayer || isSpectator) && (
            <button onClick={async () => { if (youId) await api.rematch(game.id, youId); }}
              className="w-full bg-sunset font-display h-12 text-lg rounded-lg mb-2">Rematch — join the table</button>
          )}
          <Link to="/"><button className="w-full border border-border font-display h-12 text-lg rounded-lg">Back to Saloon</button></Link>
        </div>
      </main>
    );
  }

  async function onPlay(card: Card) {
    if (!isYourTurn || !game || !youId || busy || !top || !game.current_suit) return;
    if (!canPlay(card, top, game.current_suit)) { setError("Can't play that card"); return; }
    if (card.rank === "8") { setPendingCard(card); return; }
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

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col bg-table">
      {seoBlock}
      <div className="relative z-10 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-black/30 backdrop-blur border-b border-border gap-2">
        <button onClick={async () => { if (youId) await api.leaveGame(game.id, youId); navigate("/"); }}
          className="font-display h-8 px-3 text-xs sm:text-sm rounded bg-[var(--color-destructive)]">← Leave</button>
        <div className="text-center leading-tight">
          <div className="text-[10px] opacity-70">ROOM</div>
          <div className="font-display tracking-widest text-sm sm:text-base">{game.code}</div>
        </div>
        <div className="text-[11px] opacity-80 max-w-[45%] truncate text-right">{game.last_action?.text}</div>
      </div>

      {isSpectator && (
        <div className="bg-[var(--color-accent)]/20 border-b border-[var(--color-accent)]/40 text-center py-1.5 text-sm font-display">
          👀 Spectating — you'll auto-join the next round
        </div>
      )}

      <div className="flex justify-center gap-2 sm:gap-8 mt-4 flex-wrap px-2">
        {others.map((p) => (
          <PlayerSeat key={p.id} player={p} cardCount={game.hands[p.id]?.length ?? 0}
            isCurrent={game.current_turn === p.id} isHost={game.host_id === p.id} />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center my-4 min-h-[140px]">
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={onDraw} disabled={!isYourTurn} className="relative disabled:opacity-60">
            <PlayingCard faceDown size="lg" />
          </button>
          <div className="relative">
            {top && <PlayingCard card={top} size="lg" overrideSuit={game.current_suit ?? undefined} />}
            {game.current_suit && top && (top.rank === "8" || top.rank === "K") && (
              <div className="absolute -bottom-3 -right-3 bg-card border border-border rounded-full w-9 h-9 flex items-center justify-center text-2xl shadow-card"
                style={{ color: SUIT_COLOR[game.current_suit] === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.95 0 0)" }}>
                {SUIT_SYMBOL[game.current_suit]}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mb-2">
        {isYourTurn ? (
          <div className="inline-block bg-[var(--color-accent)] text-[var(--color-accent-foreground)] px-4 py-1 rounded-full font-display text-sm animate-pulse-glow">Your turn, partner</div>
        ) : (
          <div className="opacity-70 text-sm">Waiting for {game.players.find((p) => p.id === game.current_turn)?.name}…</div>
        )}
        {error && <div className="text-sm mt-1" style={{ color: "oklch(0.7 0.2 25)" }}>{error}</div>}
      </div>

      {isPlayer ? (
        <div className="pb-3 px-1">
          <div className="flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto py-2 px-1 snap-x snap-mandatory">
            {yourHand.map((card, i) => {
              const playable = !!top && !!game.current_suit && isYourTurn && canPlay(card, top, game.current_suit);
              return (
                <div key={card.id} className="animate-deal snap-center shrink-0" style={{ animationDelay: `${i * 30}ms` }}>
                  <PlayingCard card={card} size="md" onClick={() => onPlay(card)} disabled={!playable} highlight={playable} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="pb-6 text-center opacity-70 text-sm">Watching the showdown — wait for this round to end to play.</div>
      )}

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
