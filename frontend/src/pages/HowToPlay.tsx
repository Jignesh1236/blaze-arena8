import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

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

export default function HowToPlay() {
  return (
    <main className="min-h-screen bg-table">
      <Seo
        title="How to Play Blazing 8s — Crazy Eights Rules & Special Cards Guide"
        description="Learn Blazing 8s rules: match suits and ranks, use Wild 8s to change suit, Switcheroo (K) swaps hands, +1 draws extra cards, Skip and Reverse control the round. First to empty hand wins!"
        path="/how-to-play"
        keywords="crazy eights rules, how to play crazy eights, blazing 8s rules, wild card game rules, switcheroo card game, crazy 8s special cards, card game instructions"
      />
      <article className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/" className="text-sm opacity-80">← Home</Link>
        <h1 className="font-display text-4xl mt-4 mb-6">How to Play Blazing 8s</h1>

        <div className="flex justify-center my-6">
          <AdBanner adKey="0ceec5a7bf06f1913d15695622a746b7" width={468} height={60} />
        </div>

        <p className="opacity-90 mb-4">Blazing 8s is a fast Wild West take on Crazy Eights for 2–6 players.</p>
        <h2 className="font-display text-2xl mt-8 mb-2">Goal</h2>
        <p>Be the first to empty your hand.</p>
        <h2 className="font-display text-2xl mt-8 mb-2">Basic play</h2>
        <p>On your turn, play one card matching the discard pile's <strong>suit</strong> or <strong>rank</strong>. Or draw one and pass.</p>
        <h2 className="font-display text-2xl mt-8 mb-2">Special cards</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>★ Wild 8</strong> — play anytime, pick the next suit.</li>
          <li><strong>⇄ Switcheroo (K)</strong> — play anytime, pick a suit and swap hands with the next player.</li>
          <li><strong>+1</strong> — next player draws 1 (still plays).</li>
          <li><strong>J</strong> — skip next player. In 2-player, you go again.</li>
          <li><strong>Q</strong> — reverse direction (3+ players only).</li>
        </ul>
        <h2 className="font-display text-2xl mt-8 mb-2">Multiplayer</h2>
        <p>Up to 6 per room. If a round is in progress when you join, you spectate until it ends — then auto-join the rematch.</p>

        <div className="flex justify-center mt-10">
          <AdBanner adKey="6faec0f0b766c85bc967985eb764e4e2" width={320} height={50} />
        </div>
      </article>
    </main>
  );
}
