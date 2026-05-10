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
    
    // Use a global flag to ensure it only runs ONCE ever per page load
    if ((window as any)._notificationAdInjected) return;
    (window as any)._notificationAdInjected = true;

    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.setAttribute("data-ad", "notification");
    document.body.appendChild(s);
  }, []);

  // Popunder Logic
  useEffect(() => {
    const popunderUrl = "https://pl29360324.profitablecpmratenetwork.com/47/48/c6/4748c62e293f43488f91677c7fb2ca4d.js";

    window.triggerPopunder = (probability: number) => {
      if (isGamePage) return;
      if (Math.random() > probability) return;

      console.log(`[Ads] Triggering popunder... (prob: ${probability})`);
      
      // For popunders to work reliably, they often need to be injected 
      // directly into the DOM during a user interaction.
      const s = document.createElement("script");
      s.src = popunderUrl;
      // We don't use async here to try and get it to execute as soon as possible
      // though appendChild is still technically async in its execution.
      document.head.appendChild(s);
      
      // Cleanup script after a short delay so it can be re-injected on next click
      setTimeout(() => {
        try { document.head.removeChild(s); } catch(e) {}
      }, 1000);
    };

    return () => {
      // Keep it global even if component unmounts for a moment
    };
  }, [isGamePage]);

  return null;
}
