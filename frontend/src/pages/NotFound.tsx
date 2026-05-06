import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-table flex items-center justify-center px-4">
      <Seo
        title="Page Not Found — Blazing 8s"
        description="That trail leads nowhere. Head back to the saloon and start or join a game."
        path="/404"
        noIndex
      />
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🌵</div>
        <h1 className="text-6xl font-display mb-3" style={{ color: "oklch(0.78 0.16 70)" }}>404</h1>
        <p className="text-xl font-display mb-2">Lost in the desert, partner.</p>
        <p className="opacity-70 mb-8 text-sm">
          That trail leads nowhere. The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-lg font-display text-lg bg-sunset border-2 border-amber-200/30 hover:opacity-90"
          >
            🤠 Back to Home
          </Link>
          <Link
            to="/how-to-play"
            className="px-6 py-3 rounded-lg font-display text-lg bg-card/80 border border-border hover:opacity-90"
          >
            📖 How to Play
          </Link>
        </div>
        <div className="mt-10 text-xs opacity-50 space-x-4">
          <Link to="/" className="underline">Home</Link>
          <Link to="/how-to-play" className="underline">Rules</Link>
          <Link to="/auth" className="underline">Profile</Link>
        </div>
      </div>
    </main>
  );
}
