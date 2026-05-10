import { useEffect, useState } from "react";
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
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);

  // AdBlock Detection
  useEffect(() => {
    // We check once per session
    if (sessionStorage.getItem("blazing8s_adblock_check")) return;

    const checkAdBlock = async () => {
      let isBlocked = false;
      
      // Method 1: Try to fetch a common ad script
      try {
        const response = await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
          method: "HEAD",
          mode: "no-cors",
        });
        // If the fetch is blocked, it might throw or return a status that indicates blocking
      } catch (e) {
        isBlocked = true;
      }

      if (isBlocked) {
        // Delay slightly for better UX
        setTimeout(() => {
          setShowAdBlockModal(true);
          sessionStorage.setItem("blazing8s_adblock_check", "done");
        }, 3000);
      }
    };

    checkAdBlock();
  }, []);

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

  return (
    <>
      {showAdBlockModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#1a0f08] border-2 border-amber-200/20 rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowAdBlockModal(false)}
              className="absolute top-4 right-4 text-amber-200/40 hover:text-amber-200/80 text-2xl transition-colors"
            >
              ×
            </button>
            
            <div className="text-5xl mb-6 text-center">🙏</div>
            
            <h3 className="font-display text-2xl text-amber-200 mb-4 text-center">
              Support the Saloon!
            </h3>
            
            <p className="text-amber-100/80 text-center leading-relaxed mb-8">
              Hey partner! We noticed you're using an ad blocker. Ads help us keep the servers running and the game free for everyone. 
              <br/><br/>
              If you enjoy playing, please consider whitelisting us. It really helps!
            </p>
            
            <button
              onClick={() => setShowAdBlockModal(false)}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-white font-display rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
