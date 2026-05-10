import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { GlobalAds } from "./components/GlobalAds";

const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Game = lazy(() => import("./pages/Game"));
const HowToPlay = lazy(() => import("./pages/HowToPlay"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <GlobalAds />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/game/:id" element={<Game />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}
