import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Declare global function type
declare global {
  interface Window {
    triggerPopunder: (probability?: number) => void;
  }
}

export function GlobalAds() {
  const location = useLocation();
  const isAllowedPage = location.pathname === "/" || location.pathname === "/how-to-play";

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

    const injectPopunder = () => {
      if (!isAllowedPage) return;

      console.log("[Ads] Injecting popunder script...");
      const s = document.createElement("script");
      s.src = popunderUrl;
      document.head.appendChild(s);
      
      setTimeout(() => {
        try { document.head.removeChild(s); } catch(e) {}
      }, 1000);
    };

    // Global trigger for clicks
    window.triggerPopunder = (probability: number = 1) => {
      // If probability is passed, still respect it, but we'll call it with 1 by default
      if (probability > 0 && Math.random() > probability) return;
      injectPopunder();
    };

    // "Default" behavior: Run once on mount automatically if on allowed page
    if (isAllowedPage) {
      injectPopunder();
    }

    return () => {
      // Keep it global
    };
  }, [isAllowedPage]);

  return null;
}
