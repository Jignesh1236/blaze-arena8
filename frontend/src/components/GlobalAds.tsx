import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Declare global function type
declare global {
  interface Window {
    triggerPopunder: (probability: number) => void;
  }
}

export function GlobalAds() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith("/game/");

  // Notification Ad: Run once on mount
  useEffect(() => {
    const scriptUrl = "https://pl29360580.profitablecpmratenetwork.com/d9/e7/dd/d9e7dd33439880ec8757779e00d18aac.js";
    
    // Check if already injected in this mount cycle
    if (document.querySelector(`script[data-ad="notification"]`)) return;

    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.setAttribute("data-ad", "notification");
    document.body.appendChild(s);

    return () => {
      // Cleanup if needed, but usually scripts are fine to stay
    };
  }, []);

  // Popunder Logic
  useEffect(() => {
    const popunderUrl = "https://pl29360324.profitablecpmratenetwork.com/47/48/c6/4748c62e293f43488f91677c7fb2ca4d.js";

    window.triggerPopunder = (probability: number) => {
      // Probability check
      if (Math.random() > probability) return;

      // During game, we don't want popunders
      if (isGamePage) return;

      console.log(`[Ads] Triggering popunder with prob ${probability}`);
      
      // Remove old script if exists
      const existing = document.querySelector(`script[src="${popunderUrl}"]`);
      if (existing) existing.remove();

      const s = document.createElement("script");
      s.src = popunderUrl;
      s.async = true;
      document.body.appendChild(s);
    };

    return () => {
      // @ts-ignore
      delete window.triggerPopunder;
    };
  }, [isGamePage]);

  return null;
}
