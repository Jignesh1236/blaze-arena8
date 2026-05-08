import { useCallback, useEffect, useRef, useState } from "react";

interface SevenTVEmote {
  id: string;
  name: string;
  url: string;
}

const SEVEN_TV_GQL = "https://7tv.io/v3/gql";
const EMOTE_CDN = "https://cdn.7tv.app/emote";

const TRENDING_QUERY = `query TrendingEmotes {
  emotes(query: "", limit: 20, filter: { category: TRENDING_DAY, exact_match: false, case_sensitive: false, ignore_tags: false, zero_width: false }) {
    items { id name host { url files { name format } } }
  }
}`;

const SEARCH_QUERY = `query SearchEmotes($query: String!) {
  emotes(query: $query, limit: 20, filter: { exact_match: false, case_sensitive: false, ignore_tags: false, zero_width: false }) {
    items { id name host { url files { name format } } }
  }
}`;

function emoteUrl(id: string): string {
  return `${EMOTE_CDN}/${id}/1x.webp`;
}

async function fetchEmotes(query: string): Promise<SevenTVEmote[]> {
  const body = query.trim()
    ? { query: SEARCH_QUERY, variables: { query } }
    : { query: TRENDING_QUERY };
  try {
    const res = await fetch(SEVEN_TV_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const items = data?.data?.emotes?.items ?? [];
    return items.map((e: { id: string; name: string }) => ({
      id: e.id,
      name: e.name,
      url: emoteUrl(e.id),
    }));
  } catch { return []; }
}

export function renderWithEmotes(text: string): React.ReactNode[] {
  const pattern = /\[7tv:([^\]]+):([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <img
        key={match.index}
        src={emoteUrl(match[1])}
        alt={match[2]}
        title={match[2]}
        className="inline-block h-6 w-auto align-middle mx-0.5"
        style={{ imageRendering: "pixelated" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface Props {
  onSelect: (emoteTag: string) => void;
  onClose: () => void;
}

export function SevenTVPicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [emotes, setEmotes] = useState<SevenTVEmote[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const result = await fetchEmotes(q);
    setEmotes(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 rounded-2xl border border-amber-200/15 shadow-2xl overflow-hidden z-50"
      style={{ background: "rgba(10,6,4,0.97)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/10">
        <div className="flex items-center gap-1.5">
          <span className="text-base">✨</span>
          <span className="font-display text-xs text-amber-200/80 tracking-wide">7TV EMOTES</span>
        </div>
        <button onClick={onClose} className="text-amber-200/40 hover:text-amber-200/80 text-lg leading-none">×</button>
      </div>

      <div className="px-2 py-1.5 border-b border-amber-200/10">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emotes…"
          className="w-full bg-white/6 border border-amber-200/10 rounded-xl px-3 py-1.5 text-xs text-amber-100 placeholder-amber-200/25 outline-none focus:border-amber-400/30 font-sans"
        />
      </div>

      <div className="p-2 grid grid-cols-6 sm:grid-cols-8 gap-1 overflow-y-auto" style={{ maxHeight: "280px" }}>
        {loading && (
          <div className="col-span-6 sm:col-span-8 text-center py-4 text-[10px] font-display text-amber-200/30">Loading…</div>
        )}
        {!loading && emotes.length === 0 && (
          <div className="col-span-6 sm:col-span-8 text-center py-4 text-[10px] font-display text-amber-200/30">No emotes found</div>
        )}
        {emotes.map(e => (
          <button
            key={e.id}
            type="button"
            title={e.name}
            onClick={() => { onSelect(`[7tv:${e.id}:${e.name}]`); onClose(); }}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-amber-400/10 transition-colors group"
          >
            <img
              src={e.url}
              alt={e.name}
              className="w-10 h-10 object-contain"
              style={{ imageRendering: "pixelated" }}
              onError={ev => { (ev.target as HTMLImageElement).src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; }}
            />
            <span className="text-[8px] font-display text-amber-200/40 group-hover:text-amber-200/70 truncate w-full text-center">{e.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
