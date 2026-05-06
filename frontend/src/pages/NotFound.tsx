import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-table flex items-center justify-center px-4">
      <Seo title="Page not found — Blazing 8s" description="That trail leads to nowhere." path="/404" noIndex />
      <div className="text-center">
        <h1 className="text-7xl font-display">404</h1>
        <p className="mt-2 opacity-80">That trail leads to nowhere, partner.</p>
        <Link to="/" className="inline-block mt-6 px-4 py-2 rounded-md bg-sunset font-display">Go home</Link>
      </div>
    </main>
  );
}
