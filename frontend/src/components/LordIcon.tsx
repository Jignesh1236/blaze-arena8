import { useEffect, useRef } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        trigger?: string;
        colors?: string;
        style?: React.CSSProperties;
        target?: string;
        stroke?: string;
      };
    }
  }
}

let scriptLoaded = false;
function ensureLordicon() {
  if (scriptLoaded || typeof window === "undefined") return;
  if (document.querySelector('script[data-lordicon]')) { scriptLoaded = true; return; }
  const s = document.createElement("script");
  s.src = "https://cdn.lordicon.com/lordicon.js";
  s.setAttribute("data-lordicon", "true");
  document.head.appendChild(s);
  scriptLoaded = true;
}

export const ICONS = {
  fire:        "https://cdn.lordicon.com/ulnswmkk.json",
  mic:         "https://cdn.lordicon.com/cllnuoew.json",
  micMuted:    "https://cdn.lordicon.com/vnkzrifa.json",
  chat:        "https://cdn.lordicon.com/nkmsrxmq.json",
  globe:       "https://cdn.lordicon.com/lfqzielh.json",
  settings:    "https://cdn.lordicon.com/dxjqoygy.json",
  trophy:      "https://cdn.lordicon.com/oqdmuxru.json",
  crown:       "https://cdn.lordicon.com/dsvnysmk.json",
  lightning:   "https://cdn.lordicon.com/iihcouqe.json",
  cards:       "https://cdn.lordicon.com/fmjatckf.json",
  handshake:   "https://cdn.lordicon.com/aklfxssc.json",
  desert:      "https://cdn.lordicon.com/zrcovfld.json",
  cowboy:      "https://cdn.lordicon.com/rjzlnunf.json",
  eye:         "https://cdn.lordicon.com/bhfjfgqz.json",
  leave:       "https://cdn.lordicon.com/zxvuccjq.json",
  send:        "https://cdn.lordicon.com/whrxobsb.json",
  upload:      "https://cdn.lordicon.com/wloilxuq.json",
  emoji:       "https://cdn.lordicon.com/iltqorsz.json",
  close:       "https://cdn.lordicon.com/zxvuccjq.json",
  search:      "https://cdn.lordicon.com/msoeawqm.json",
  copy:        "https://cdn.lordicon.com/depeqmsz.json",
  play:        "https://cdn.lordicon.com/becuhtup.json",
  switch:      "https://cdn.lordicon.com/kkvxgpti.json",
  spectate:    "https://cdn.lordicon.com/bhfjfgqz.json",
};

/** Inline SVG flame — renders instantly, no CDN needed. Use for logo / headers. */
export function FlameIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        fill="#f97316"
        d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.65C13.33 7.26 13 4.85 13.95 3c-.96.23-1.8.75-2.5 1.32C8.87 6.4 7.85 10.07 9.07 13.22c.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.956.956 0 0 1-.2-.24C6.87 12.33 6.69 10.28 7.45 8.64 5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26Z"
      />
      <path
        fill="#fbbf24"
        d="M13.5 11.71c-.28-.6-.65-1.14-1.08-1.6.04 1.36-.87 2.7-1.93 3.36.17-1.17-.23-2.38-1-3.16-.05 1.07-.69 1.96-1.46 2.62 0 .14-.01.27-.01.41 0 2.35 1.92 4.25 4.28 4.25 2.36 0 4.28-1.9 4.28-4.25 0-.58-.12-1.13-.33-1.63Z"
      />
    </svg>
  );
}

/** Inline SVG crown — renders instantly, no CDN needed. */
export function CrownIcon({ size = 16, color = "#fbbf24", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path fill={color} d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" />
    </svg>
  );
}

/** Inline SVG eye — renders instantly, no CDN needed. */
export function EyeIcon({ size = 16, color = "#fbbf24", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path fill={color} d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5ZM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z" />
    </svg>
  );
}

interface Props {
  icon: keyof typeof ICONS | string;
  size?: number;
  trigger?: "hover" | "click" | "loop" | "loop-on-hover" | "morph" | "boomerang";
  colors?: string;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
}

export function LordIcon({ icon, size = 24, trigger = "hover", colors = "primary:#f5c518,secondary:#ff8800", className, style, target }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureLordicon(); }, []);

  const src = icon in ICONS ? ICONS[icon as keyof typeof ICONS] : icon;

  return (
    <div ref={ref} className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }}>
      <lord-icon
        src={src}
        trigger={trigger}
        colors={colors}
        target={target}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
