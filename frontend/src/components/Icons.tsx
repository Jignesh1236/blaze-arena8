/** Inline SVG icon set — zero CDN dependency, always renders instantly. */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

function Svg({ size = 20, children, className, style }: { size?: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }} aria-hidden="true">
      {children}
    </svg>
  );
}

export function FlameIcon({ size = 24, className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill="#f97316" d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.65C13.33 7.26 13 4.85 13.95 3c-.96.23-1.8.75-2.5 1.32C8.87 6.4 7.85 10.07 9.07 13.22c.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.956.956 0 0 1-.2-.24C6.87 12.33 6.69 10.28 7.45 8.64 5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26Z" />
      <path fill="#fbbf24" d="M13.5 11.71c-.28-.6-.65-1.14-1.08-1.6.04 1.36-.87 2.7-1.93 3.36.17-1.17-.23-2.38-1-3.16-.05 1.07-.69 1.96-1.46 2.62 0 .14-.01.27-.01.41 0 2.35 1.92 4.25 4.28 4.25 2.36 0 4.28-1.9 4.28-4.25 0-.58-.12-1.13-.33-1.63Z" />
    </Svg>
  );
}

export function ChatIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </Svg>
  );
}

export function GlobeIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </Svg>
  );
}

export function MicIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93C7.06 15.44 4 12.07 4 8H2c0 4.42 3.17 8.09 7.35 8.82L9 22h2v-6.07zm2 0V22h2l-.35-5.18C18.83 16.09 22 12.42 22 8h-2c0 4.07-3.06 7.44-7 7.93z" />
    </Svg>
  );
}

export function MicMutedIcon({ size = 20, color = "#ef4444", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
    </Svg>
  );
}

export function SendIcon({ size = 20, color = "#fff", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </Svg>
  );
}

export function EmojiIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </Svg>
  );
}

export function LightningIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M7 2v11h3v9l7-12h-4l4-8z" />
    </Svg>
  );
}

export function CardsIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M21.47 4.35 20.13 3.79C19.55 3.55 18.89 3.83 18.65 4.41L15 13H17L18.3 9.8L21.6 11.15C21.99 11.31 22.41 11.12 22.57 10.73L23.18 9.25C23.5 8.43 23.09 7.51 22.27 7.19L21.47 4.35ZM15.5 9H15C14.45 9 14 8.55 14 8V3C14 2.45 13.55 2 13 2H3C2.45 2 2 2.45 2 3V21C2 21.55 2.45 22 3 22H13C13.55 22 14 21.55 14 21V11H15.5C16.05 11 16.5 10.55 16.5 10C16.5 9.45 16.05 9 15.5 9ZM12 11H8V9H12V11ZM7 8C6.45 8 6 7.55 6 7S6.45 6 7 6 8 6.45 8 7 7.55 8 7 8Z" />
    </Svg>
  );
}

export function HandshakeIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M11 6H9L7 4H3L1 6v4h2l1 2h5l2-2h1V6zm-6 4H3V6l1-1h3l1.28 1.28L8 11H5v-1zm4.28-.72L8 11 7.72 11.28 6.44 10H8l1.28-1.28zM23 6l-2-2h-4l-2 2v4h1l2 2h5l1-2h2V6zm-2 4h-3l-1.28-1.28L17 7h3l1 1v2h-2v1zm-3.28-.72L17 11l-.28.28L15.44 10H17l1.28-1.28zM12.5 13.5l-1-1H8l-1 1v5l1 1h3.5l1-1v-5zm-1 5H8.5v-4H11.5l.5.5V18l-.5.5zm5 .5h2v-7l-1-1h-3.5l-1 1v1.5h1V12h3v7z" />
    </Svg>
  );
}

export function LeaveIcon({ size = 20, color = "#fff", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </Svg>
  );
}

export function EyeIcon({ size = 16, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </Svg>
  );
}

export function CrownIcon({ size = 16, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" />
    </Svg>
  );
}

export function CowboyIcon({ size = 20, color = "#fff", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M20 9.5c0-.28-.22-.5-.5-.5H18c-.5-2.5-3-4-6-4s-5.5 1.5-6 4H4.5c-.28 0-.5.22-.5.5s.22.5.5.5H5c0 2 1.5 4 4.5 4.5V15h-2c-.55 0-1 .45-1 1s.45 1 1 1h9c.55 0 1-.45 1-1s-.45-1-1-1h-2v-.5c3-.5 4.5-2.5 4.5-4.5h.5c.28 0 .5-.22.5-.5z" />
    </Svg>
  );
}

export function SettingsIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </Svg>
  );
}

export function CopyIcon({ size = 16, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </Svg>
  );
}

export function DesertIcon({ size = 20, color = "#fbbf24", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M3 17h18v2H3v-2zm2-5h2v3H5v-3zm3-3h2v6H8V9zm3 2h2v4h-2v-4zm3-4h2v8h-2V7zm3 2h2v6h-2V9zM3 6l4-4 4 4 4-4 4 4v1H3V6z" />
    </Svg>
  );
}

export function SwitchIcon({ size = 20, color = "#c084fc", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
    </Svg>
  );
}

export function PlayIcon({ size = 20, color = "#fff", className, style }: IconProps) {
  return (
    <Svg size={size} className={className} style={style}>
      <path fill={color} d="M8 5v14l11-7z" />
    </Svg>
  );
}
