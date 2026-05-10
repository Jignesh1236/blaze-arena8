import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function GlobalAds() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith("/game/");

  // Notification Ad: Every 20 seconds
  useEffect(() => {
    const scriptUrl = "https://pl29360580.profitablecpmratenetwork.com/d9/e7/dd/d9e7dd33439880ec8757779e00d18aac.js";
    
    const triggerNotification = () => {
      // Remove old script if exists to allow re-triggering
      const existing = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existing) existing.remove();

      const s = document.createElement("script");
      s.src = scriptUrl;
      s.async = true;
      document.body.appendChild(s);
    };

    // Initial trigger
    triggerNotification();

    // Set interval for 20s
    const interval = setInterval(triggerNotification, 20000);

    return () => clearInterval(interval);
  }, []);

  // Popunder Ad: 10% chance, not during game
  useEffect(() => {
    if (isGamePage) return;
    
    // Only attempt popunder once per session to not be annoying
    if (sessionStorage.getItem("blazing8s_popunder_attempted")) return;
    sessionStorage.setItem("blazing8s_popunder_attempted", "true");

    const popunderUrl = "https://pl29360324.profitablecpmratenetwork.com/47/48/c6/4748c62e293f43488f91677c7fb2ca4d.js";
    
    // 10% chance
    if (Math.random() < 0.1) {
      const s = document.createElement("script");
      s.src = popunderUrl;
      s.async = true;
      document.body.appendChild(s);
    }
  }, [isGamePage]);

  return null;
}
