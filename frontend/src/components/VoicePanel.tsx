import { useState } from "react";
import type { VoiceState } from "@/hooks/useVoiceChat";
import { avatarUrl } from "@/lib/avatar";
import { MicIcon, MicMutedIcon, SettingsIcon } from "@/components/Icons";

interface Props {
  state: VoiceState;
  players: { id: string; name: string; avatar: string }[];
  myPlayerId: string;
  onEnable: () => void;
  onDisable: () => void;
  onToggleMute: () => void;
  onChangeMic: (deviceId: string) => void;
  onSetVolume: (v: number) => void;
}

export function VoicePanel({ state, players, myPlayerId, onEnable, onDisable, onToggleMute, onChangeMic, onSetVolume }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  const isDenied = state.error?.includes("Permission") || state.error?.includes("denied") || state.error?.includes("NotAllowed");

  return (
    <div className="flex flex-col items-end gap-2">
      {/* ── Mic Permission Guide Modal ── */}
      {showGuide && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border-2 border-amber-200/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-xl text-amber-200 mb-4 text-center">How to Allow Mic 🎙️</h3>
            <div className="space-y-4 text-sm text-amber-100/80">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">1</div>
                <p>Look at the <span className="text-amber-400 font-bold">address bar</span> at the top of your browser.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">2</div>
                <p>Click the <span className="text-amber-400 font-bold">Lock icon 🔒</span> or the <span className="text-amber-400 font-bold">Mic icon</span> next to the URL.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">3</div>
                <p>Switch the <span className="text-amber-400 font-bold">Microphone</span> toggle to <span className="text-green-400 font-bold">ON</span> or "Allow".</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">4</div>
                <p>Refresh the page and try joining again!</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-8 w-full h-12 bg-sunset font-display text-base rounded-xl hover:opacity-90 transition-opacity"
            >
              Got it, partner!
            </button>
          </div>
        </div>
      )}

      {panelOpen && (
        <div
          className="w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden border border-amber-200/15 shadow-2xl"
          style={{ background: "rgba(10,6,4,0.94)", backdropFilter: "blur(16px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/10 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <MicIcon size={15} color="#fbbf24" />
              <span className="font-display text-xs text-amber-200/80 tracking-wide">VOICE CHAT</span>
              {state.enabled && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSettingsOpen(o => !o)} className="text-amber-200/40 hover:text-amber-200/80 transition-colors px-1 flex items-center">
                <SettingsIcon size={15} color="#fbbf2466" />
              </button>
              <button onClick={() => setPanelOpen(false)} className="text-amber-200/40 hover:text-amber-200/80 text-lg leading-none transition-colors ml-1">×</button>
            </div>
          </div>

          {/* Error */}
          {state.error && (
            <div className="mx-2 mt-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/20 text-[10px] text-red-300 font-display">
              {isDenied ? (
                <div className="flex flex-col gap-1.5">
                  <p>Mic access denied. Partner, you need to allow it in your browser.</p>
                  <button
                    onClick={() => setShowGuide(true)}
                    className="text-amber-400 underline text-left hover:text-amber-300"
                  >
                    Show me how →
                  </button>
                </div>
              ) : (
                `Error: ${state.error}`
              )}
            </div>
          )}

          {/* Settings */}
          {settingsOpen && (
            <div className="border-b border-amber-200/10 px-3 py-3 space-y-3">
              {state.inputDevices.length > 1 && (
                <div>
                  <label className="block text-[9px] font-display text-amber-200/40 mb-1 tracking-widest">MICROPHONE</label>
                  <select
                    value={state.selectedDeviceId}
                    onChange={e => onChangeMic(e.target.value)}
                    className="w-full bg-white/6 border border-amber-200/10 rounded-xl px-3 py-1.5 text-xs text-amber-100 outline-none focus:border-amber-400/30 font-sans"
                  >
                    {state.inputDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId} style={{ background: "#1a0f08" }}>
                        {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[9px] font-display text-amber-200/40 mb-1 tracking-widest">SPEAKER VOLUME — {state.volume}%</label>
                <input type="range" min={0} max={100} value={state.volume} onChange={e => onSetVolume(Number(e.target.value))} className="w-full accent-amber-400" />
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="px-2 py-2 space-y-1" style={{ minHeight: "80px" }}>
            {/* Me */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/4">
              <img src={avatarUrl(playerMap[myPlayerId]?.avatar ?? "Felix")} alt="me" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              <span className="text-xs font-display text-amber-200/80 flex-1 truncate">{playerMap[myPlayerId]?.name ?? "You"}</span>
              {state.muted
                ? <MicMutedIcon size={16} color="#ef4444" />
                : <MicIcon size={16} color={state.speaking[myPlayerId] ? "#4ade80" : "#ffffff40"} />
              }
            </div>

            {state.peers.map(pid => {
              const p = playerMap[pid];
              if (!p) return null;
              const speaking = state.speaking[pid];
              return (
                <div key={pid}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200"
                  style={{ background: speaking ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.02)" }}
                >
                  <img src={avatarUrl(p.avatar)} alt={p.name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 transition-all duration-200"
                    style={{ filter: speaking ? "drop-shadow(0 0 4px rgba(74,222,128,0.6))" : "none" }} />
                  <span className="text-xs font-display text-amber-200/70 flex-1 truncate">{p.name}</span>
                  <MicIcon size={16} color={speaking ? "#4ade80" : "#ffffff30"} />
                </div>
              );
            })}

            {state.enabled && state.peers.length === 0 && (
              <div className="text-center text-[10px] font-display text-amber-200/25 py-3 tracking-widest">No one else in voice yet…</div>
            )}
            {!state.enabled && (
              <div className="text-center text-[10px] font-display text-amber-200/25 py-3 tracking-widest">Enable mic to join voice chat</div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-200/10 flex-shrink-0">
            {!state.enabled ? (
              <button onClick={onEnable}
                className="flex-1 h-8 rounded-xl bg-green-500/80 hover:bg-green-400/90 text-white text-xs font-display tracking-wide transition-colors flex items-center justify-center gap-1.5">
                <MicIcon size={15} color="#fff" />
                Join Voice
              </button>
            ) : (
              <>
                <button onClick={onToggleMute}
                  className="flex-1 h-8 rounded-xl text-xs font-display tracking-wide transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    background: state.muted ? "rgba(239,68,68,0.25)" : "rgba(74,222,128,0.15)",
                    border: `1px solid ${state.muted ? "rgba(239,68,68,0.4)" : "rgba(74,222,128,0.3)"}`,
                    color: state.muted ? "rgba(239,68,68,0.9)" : "rgba(74,222,128,0.9)",
                  }}>
                  {state.muted
                    ? <MicMutedIcon size={15} color="#ef4444" />
                    : <MicIcon size={15} color="#4ade80" />
                  }
                  {state.muted ? "Unmute" : "Mute"}
                </button>
                <button onClick={onDisable}
                  className="h-8 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/35 border border-red-400/30 text-red-300 text-xs font-display tracking-wide transition-colors">
                  Leave
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className="relative w-12 h-12 rounded-full flex items-center justify-center border shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: state.enabled ? (panelOpen ? "rgba(74,222,128,0.2)" : "rgba(74,222,128,0.12)") : (panelOpen ? "rgba(251,191,36,0.18)" : "rgba(10,6,4,0.82)"),
          backdropFilter: "blur(12px)",
          borderColor: state.enabled ? "rgba(74,222,128,0.4)" : "rgba(251,191,36,0.2)",
          boxShadow: state.enabled ? "0 0 12px rgba(74,222,128,0.25)" : undefined,
        }}
        title="Voice chat"
      >
        {state.enabled && state.muted
          ? <MicMutedIcon size={22} color="#ef4444" />
          : <MicIcon size={22} color={state.enabled ? "#4ade80" : "#fbbf24"} />
        }
        {state.enabled && !state.muted && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-black" />}
        {state.enabled && state.muted && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-400 border-2 border-black" />}
      </button>
    </div>
  );
}
