import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuest } from "@/lib/use-auth";
import { drawCard, leaveGame, playCard, startGame, rematch, joinGame } from "@/server/game.functions";
import { canPlay, type Card, type GameRow, type Suit, SUIT_SYMBOL, SUIT_COLOR } from "@/lib/game";
import { PlayingCard } from "@/components/game/PlayingCard";
import { PlayerSeat } from "@/components/game/PlayerSeat";
import { SuitPicker } from "@/components/game/SuitPicker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import desertBg from "@/assets/desert-bg.jpg";

export const Route = createFileRoute("/game/$id")({
  head: () => ({ meta: [{ title: "Round in progress — Blazing 8s" }] }),
  component: GamePage,
});

function GamePage() {
  const { id } = Route.useParams();
  const { profile, loading } = useGuest();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow | null>(null);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate({ to: "/auth", search: { next: `/game/${id}` } });
  }, [profile, loading, navigate, id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchGame = async () => {
      const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
      if (active && data) setGame(data as unknown as GameRow);
    };
    fetchGame();
    const channel = supabase
      .channel(`game:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${id}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          toast("Game ended");
          navigate({ to: "/" });
          return;
        }
        if (payload.new) setGame(payload.new as unknown as GameRow);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [id, navigate]);

  const youId = profile?.id;
  const yourHand = useMemo(() => (youId && game ? game.hands[youId] ?? [] : []), [game, youId]);
  const top = game?.discard?.[game.discard.length - 1] ?? null;
  const isYourTurn = game?.current_turn === youId && game?.status === "playing";
  const isPlayer = !!(youId && game?.players.some((p) => p.id === youId));
  const isSpectator = !!(youId && game?.spectators?.some((p) => p.id === youId));

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading the saloon…</div>;
  }

  // If guest is neither player nor spectator yet, auto-join as spectator
  // (e.g. they navigated directly to a game URL while a round is in progress).
  if (game.status !== "lobby" && youId && profile && !isPlayer && !isSpectator) {
    void joinGame({ data: { code: game.code, player: profile } }).catch(() => {});
  }

  // ===== Lobby =====
  if (game.status === "lobby") {
    return <LobbyView game={game} youId={youId} onLeave={async () => { if (youId) await leaveGame({ data: { gameId: game.id, playerId: youId } }); navigate({ to: "/" }); }} />;
  }

  // ===== Finished =====
  if (game.status === "finished") {
    const winner = game.players.find((p) => p.id === game.winner_id);
    const youWon = game.winner_id === youId;
    return (
      <main className="min-h-screen bg-table flex items-center justify-center p-4 text-center">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-card animate-scale-in">
          <div className="text-6xl mb-2">{youWon ? "🏆" : "🎬"}</div>
          <h1 className="font-display text-4xl mb-1">{youWon ? "You Won!" : "Game Over"}</h1>
          <p className="text-muted-foreground mb-6">
            {winner ? `${winner.avatar} ${winner.name} took the pot.` : "The dust has settled."}
          </p>
          <div className="space-y-2">
            {(isPlayer || isSpectator) && (
              <Button
                onClick={async () => { if (youId) await rematch({ data: { gameId: game.id, playerId: youId } }); }}
                className="w-full bg-sunset font-display h-12 text-lg"
              >
                Rematch — join the table
              </Button>
            )}
            <Link to="/"><Button variant="outline" className="w-full font-display h-12 text-lg">Back to Saloon</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  // ===== Playing =====
  async function onPlay(card: Card) {
    if (!isYourTurn || !game || !youId || busyAction) return;
    if (!top || !game.current_suit) return;
    if (!canPlay(card, top, game.current_suit, game.draw_count)) {
      toast.error("Can't play that card");
      return;
    }
    if (card.rank === "8" || card.rank === "K") { setPendingCard(card); return; }
    setBusyAction(true);
    try { await playCard({ data: { gameId: game.id, playerId: youId, cardId: card.id } }); }
    catch (e) {
      const msg = (e as Error).message;
      if (msg !== "Not your turn") toast.error(msg);
    }
    finally { setBusyAction(false); }
  }

  async function pickSuit(s: Suit) {
    if (!pendingCard || !game || !youId || busyAction) return;
    setBusyAction(true);
    try {
      await playCard({ data: { gameId: game.id, playerId: youId, cardId: pendingCard.id, chosenSuit: s } });
      setPendingCard(null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "Not your turn") toast.error(msg);
      setPendingCard(null);
    } finally { setBusyAction(false); }
  }

  async function onDraw() {
    if (!isYourTurn || !game || !youId || busyAction) return;
    setBusyAction(true);
    try { await drawCard({ data: { gameId: game.id, playerId: youId } }); }
    catch (e) {
      const msg = (e as Error).message;
      if (msg !== "Not your turn") toast.error(msg);
    }
    finally { setBusyAction(false); }
  }

  // Seat ordering: put "you" at bottom, others around
  const others = youId ? game.players.filter((p) => p.id !== youId) : game.players;

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      <img src={desertBg} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-table/80" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-background/40 backdrop-blur border-b border-border gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={async () => { if (youId) await leaveGame({ data: { gameId: game.id, playerId: youId } }); navigate({ to: "/" }); }}
          className="font-display h-8 px-2 text-xs sm:text-sm sm:h-9 sm:px-3"
        >
          ← Leave
        </Button>
        <div className="text-center leading-tight">
          <div className="text-[10px] sm:text-xs text-muted-foreground">ROOM</div>
          <div className="font-display tracking-widest text-sm sm:text-base">{game.code}</div>
        </div>
        <div className="text-[11px] sm:text-xs text-muted-foreground max-w-[45%] truncate text-right">
          {game.last_action?.text}
        </div>
      </div>

      {isSpectator && (
        <div className="relative z-10 bg-accent/20 border-b border-accent/40 text-center py-1.5 text-sm font-display">
          👀 Spectating — you'll auto-join the next round
          {(game.spectators?.length ?? 0) > 1 && ` · ${game.spectators!.length} watchers`}
        </div>
      )}

      {/* Opponents */}
      <div className="relative z-10 flex justify-center gap-2 sm:gap-8 mt-2 sm:mt-4 flex-wrap px-2">
        {others.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            cardCount={game.hands[p.id]?.length ?? 0}
            isCurrent={game.current_turn === p.id}
            isHost={game.host_id === p.id}
          />
        ))}
      </div>

      {/* Center table */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-2 sm:my-4 min-h-[140px]">
        <div className="relative flex items-center gap-3 sm:gap-6">
          {/* Deck */}
          <button
            onClick={onDraw}
            disabled={!isYourTurn}
            className="relative disabled:opacity-60"
            aria-label="Draw card"
          >
            <PlayingCard faceDown size="lg" className={isYourTurn ? "hover:-translate-y-2 transition-transform" : ""} />
            {game.draw_count > 0 && (
              <span className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-sm font-bold animate-pulse-glow">
                +{game.draw_count}
              </span>
            )}
          </button>

          {/* Discard */}
          <div className="relative">
            {top && (
              <div key={top.id} className="animate-flip">
                <PlayingCard card={top} size="lg" overrideSuit={game.current_suit ?? undefined} />
              </div>
            )}
            {game.current_suit && top && (top.rank === "8" || top.rank === "K") && (
              <div
                className="absolute -bottom-3 -right-3 bg-card border border-border rounded-full w-9 h-9 flex items-center justify-center text-2xl shadow-card"
                style={{ color: SUIT_COLOR[game.current_suit] === "red" ? "oklch(0.55 0.22 25)" : "oklch(0.95 0 0)" }}
              >
                {SUIT_SYMBOL[game.current_suit]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="relative z-10 text-center mb-2">
        {isYourTurn ? (
          <div className="inline-block bg-accent text-accent-foreground px-4 py-1 rounded-full font-display animate-pulse-glow text-sm">
            Your turn, partner
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            Waiting for {game.players.find((p) => p.id === game.current_turn)?.name}…
          </div>
        )}
      </div>

      {/* Your hand */}
      {isPlayer ? (
      <div className="relative z-10 pb-3 px-1 sm:px-2">
        <div className="flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto py-2 px-1 snap-x snap-mandatory scrollbar-thin">
          {yourHand.map((card, i) => {
            const playable = !!top && !!game.current_suit && isYourTurn && canPlay(card, top, game.current_suit, game.draw_count);
            return (
              <div key={card.id} className="animate-deal snap-center shrink-0" style={{ animationDelay: `${i * 30}ms` }}>
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
      ) : (
        <div className="relative z-10 pb-6 text-center text-muted-foreground text-sm">
          Watching the showdown — wait for this round to end to play.
        </div>
      )}

      {pendingCard && <SuitPicker onPick={pickSuit} onCancel={() => setPendingCard(null)} />}
    </main>
  );
}

function LobbyView({ game, youId, onLeave }: { game: GameRow; youId?: string; onLeave: () => void }) {
  const isHost = game.host_id === youId;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function start() {
    setBusy(true);
    try {
      if (!youId) throw new Error("No profile");
      await startGame({ data: { gameId: game.id, playerId: youId } });
    }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-table relative">
      <img src={desertBg} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="relative z-10 max-w-2xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground" onClick={onLeave}>← Leave</Link>
          <span className="font-display text-xl">🔥 Blazing 8s</span>
        </div>

        <div className="bg-card/90 backdrop-blur border border-border rounded-2xl p-6 sm:p-8 shadow-card text-center">
          <p className="text-muted-foreground text-sm">Share this code with your posse</p>
          <button onClick={copy} className="mt-2 inline-flex items-center gap-3 group">
            <span className="font-display text-5xl sm:text-7xl tracking-[0.2em] text-accent drop-shadow-glow">
              {game.code}
            </span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{copied ? "Copied!" : "Copy"}</span>
          </button>

          <div className="mt-8">
            <h3 className="font-display text-xl mb-3">Players ({game.players.length}/6)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {game.players.map((p) => (
                <div key={p.id} className="bg-background/50 border border-border rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-display truncate">{p.name}</span>
                  {p.id === game.host_id && <span className="ml-auto text-sm">👑</span>}
                </div>
              ))}
              {Array.from({ length: 6 - game.players.length }).map((_, i) => (
                <div key={i} className="bg-background/20 border border-dashed border-border rounded-xl p-3 text-muted-foreground text-sm flex items-center justify-center">
                  empty seat
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {isHost ? (
              <Button onClick={start} disabled={busy || game.players.length < 2} className="w-full bg-sunset font-display h-14 text-lg shadow-glow">
                {game.players.length < 2 ? "Need 2+ players" : "Deal the cards 🎴"}
              </Button>
            ) : (
              <p className="text-muted-foreground italic">Waiting for the host to start…</p>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p><strong className="text-foreground">How to play:</strong> Match suit or rank. <strong>★ Wild 8</strong> = play anytime, pick a suit. <strong>⇄ Switcheroo</strong> = play anytime, pick a suit & swap hands with next player. <strong>+1</strong> = next player draws 1 (still plays). <strong>J</strong> = skip (2P → you go again). <strong>Q</strong> = reverse (3+ players only). Empty your hand to win.</p>
        </div>
      </div>
    </main>
  );
}