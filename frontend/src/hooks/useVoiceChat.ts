import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turns:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
  iceCandidatePoolSize: 10,
};

interface PeerConn {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  socketId: string;
}

export interface VoiceState {
  enabled: boolean;
  muted: boolean;
  error: string | null;
  speaking: Record<string, boolean>;
  peers: string[];
  inputDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  volume: number;
}

export function useVoiceChat(gameId: string, myPlayerId: string) {
  const [state, setState] = useState<VoiceState>({
    enabled: false,
    muted: false,
    error: null,
    speaking: {},
    peers: [],
    inputDevices: [],
    selectedDeviceId: "",
    volume: 100,
  });

  const localStream = useRef<MediaStream | null>(null);
  const peerConns = useRef<Map<string, PeerConn>>(new Map());
  const audioCtx = useRef<AudioContext | null>(null);
  const vadFrame = useRef<number>(0);
  const isSpeaking = useRef(false);
  const enabledRef = useRef(false);

  function patch(p: Partial<VoiceState>) {
    setState(s => ({ ...s, ...p }));
  }

  const closePeer = useCallback((playerId: string) => {
    const conn = peerConns.current.get(playerId);
    if (!conn) return;
    try { conn.pc.close(); } catch { /* ignore */ }
    conn.audioEl.srcObject = null;
    peerConns.current.delete(playerId);
    setState(s => ({
      ...s,
      peers: s.peers.filter(p => p !== playerId),
      speaking: Object.fromEntries(Object.entries(s.speaking).filter(([k]) => k !== playerId)),
    }));
  }, []);

  const getPeer = useCallback((playerId: string, socketId: string): PeerConn => {
    const existing = peerConns.current.get(playerId);
    if (existing) { existing.socketId = socketId; return existing; }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.volume = 1;

    if (localStream.current) {
      for (const track of localStream.current.getAudioTracks()) {
        pc.addTrack(track, localStream.current);
      }
    }

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        audioEl.srcObject = e.streams[0];
        // Force play to overcome autoplay restrictions
        audioEl.play().catch(() => {});
      }
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const conn = peerConns.current.get(playerId);
      if (!conn) return;
      getSocket().emit("voice:signal", {
        toSocketId: conn.socketId,
        fromPlayerId: myPlayerId,
        signal: { type: "ice", candidate: e.candidate.toJSON() },
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeer(playerId);
      }
    };

    const conn: PeerConn = { pc, audioEl, socketId };
    peerConns.current.set(playerId, conn);
    setState(s => ({ ...s, peers: [...s.peers.filter(p => p !== playerId), playerId] }));
    return conn;
  }, [myPlayerId, closePeer]);

  const enable = useCallback(async (deviceId?: string) => {
    try {
      patch({ error: null });

      // 1. Check if we're in a secure context (MediaDevices require HTTPS or localhost)
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost) {
        throw new Error("SECURITY_BLOCK: Browser mic access block kar raha hai kyunki connection HTTPS nahi hai. Agar aap mobile ya dusre device par test kar rahe hain, toh aapko HTTPS use karna hoga ya 'localhost' par chalana hoga.");
      }

      // 2. Check for basic API support
      if (!navigator.mediaDevices && !(navigator as any).getUserMedia && !(navigator as any).webkitGetUserMedia) {
        throw new Error("API_NOT_SUPPORTED: Aapka browser microphone access support nahi karta. Kripya Chrome, Firefox ya Safari ka latest version use karein.");
      }

      console.log("Requesting mic permission...");
      
      // 3. Try requesting permission directly. 
      let stream: MediaStream;
      try {
        console.log("Attempting getUserMedia...");
        
        // Legacy fallback for very old browsers
        const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) || 
                           (navigator as any).webkitGetUserMedia?.bind(navigator) || 
                           (navigator as any).mozGetUserMedia?.bind(navigator);

        if (!getUserMedia) {
          throw new Error("GET_USER_MEDIA_MISSING");
        }

        stream = await getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(deviceId ? { deviceId: { exact: deviceId } } : {})
          },
        });
      } catch (err: any) {
        console.error("Mic Error Details:", err);
        
        // Fallback to simplest possible audio request
        if (err.name === "OverconstrainedError" || err.name === "NotFoundError" || err.message === "GET_USER_MEDIA_MISSING") {
          const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) || 
                             (navigator as any).webkitGetUserMedia?.bind(navigator);
          
          if (getUserMedia) {
            stream = await getUserMedia({ audio: true });
          } else {
            throw new Error("Aapke browser mein mic access ka option hi nahi mil raha.");
          }
        } else {
          throw err;
        }
      }

      console.log("Mic granted successfully");
      localStream.current = stream;
      enabledRef.current = true;

      // 4. Initialize AudioContext for VAD (Voice Activity Detection)
      // Some browsers require resume() on user gesture
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      audioCtx.current = ctx;

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const vad = () => {
        if (!enabledRef.current) return;
        analyser.getByteFrequencyData(buf);
        const vol = buf.reduce((a, b) => a + b, 0) / buf.length;
        const speaking = vol > 10;
        if (speaking !== isSpeaking.current) {
          isSpeaking.current = speaking;
          getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking });
        }
        vadFrame.current = requestAnimationFrame(vad);
      };
      vadFrame.current = requestAnimationFrame(vad);

      // 5. Update device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === "audioinput");
      patch({ enabled: true, inputDevices: mics, selectedDeviceId: deviceId || mics[0]?.deviceId || "" });

      getSocket().emit("voice:join", { gameId, playerId: myPlayerId });
    } catch (e: any) {
      console.error("Mic enable error:", e);
      let msg = "Mic access denied";
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        msg = "Permission denied. Please allow microphone access in your browser settings.";
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        msg = "No microphone found. Please connect one and try again.";
      } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
        msg = "Microphone is already in use by another application.";
      } else if (e.message) {
        msg = e.message;
      }
      patch({ error: msg });
    }
  }, [gameId, myPlayerId]);

  const disable = useCallback(() => {
    cancelAnimationFrame(vadFrame.current);
    try { audioCtx.current?.close(); } catch { /* ignore */ }
    audioCtx.current = null;
    if (localStream.current) {
      for (const t of localStream.current.getTracks()) t.stop();
      localStream.current = null;
    }
    const pids = Array.from(peerConns.current.keys());
    for (const pid of pids) closePeer(pid);
    enabledRef.current = false;
    getSocket().emit("voice:leave", { gameId, playerId: myPlayerId });
    getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking: false });
    patch({ enabled: false, muted: false, speaking: {}, peers: [] });
    isSpeaking.current = false;
  }, [gameId, myPlayerId, closePeer]);

  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    setState(s => {
      const nowMuted = !s.muted;
      for (const t of localStream.current!.getAudioTracks()) t.enabled = !nowMuted;
      if (nowMuted) getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking: false });
      return { ...s, muted: nowMuted };
    });
  }, [gameId, myPlayerId]);

  const changeMic = useCallback((deviceId: string) => {
    patch({ selectedDeviceId: deviceId });
    if (enabledRef.current) {
      disable();
      setTimeout(() => enable(deviceId), 400);
    }
  }, [disable, enable]);

  const setVolume = useCallback((vol: number) => {
    patch({ volume: vol });
    const v = vol / 100;
    for (const [, conn] of peerConns.current) conn.audioEl.volume = v;
  }, []);

  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    const socket = getSocket();

    async function onRoomPeers(peerList: { playerId: string; socketId: string }[]) {
      for (const { playerId, socketId } of peerList) {
        if (playerId === myPlayerId) continue;
        const conn = getPeer(playerId, socketId);
        try {
          const offer = await conn.pc.createOffer();
          await conn.pc.setLocalDescription(offer);
          socket.emit("voice:signal", {
            toSocketId: socketId,
            fromPlayerId: myPlayerId,
            signal: { type: "offer", sdp: conn.pc.localDescription },
          });
        } catch (e) { console.error("[voice] offer error:", e); }
      }
    }

    function onPeerJoined({ playerId, socketId }: { playerId: string; socketId: string }) {
      // Do NOT create an offer here — the joiner already sends offers via onRoomPeers.
      // Creating offers from both sides causes signaling glare (state mismatch).
      // Just pre-register the peer so we're ready to handle their incoming offer.
      if (playerId === myPlayerId || !enabledRef.current) return;
      getPeer(playerId, socketId);
    }

    function onPeerLeft({ playerId }: { playerId: string }) {
      closePeer(playerId);
    }

    async function onSignal({ fromPlayerId, fromSocketId, signal }: {
      fromPlayerId: string;
      fromSocketId: string;
      signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    }) {
      // Fix race condition: if peer not found but we have their socketId, create peer entry
      let conn = peerConns.current.get(fromPlayerId);
      if (!conn && fromSocketId && enabledRef.current) {
        conn = getPeer(fromPlayerId, fromSocketId);
      }
      if (!conn) return;
      const { pc } = conn;
      // Update socketId if we got it via signal (race condition safety)
      if (fromSocketId) conn.socketId = fromSocketId;

      try {
        if (signal.type === "offer" && signal.sdp) {
          await pc.setRemoteDescription(signal.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("voice:signal", {
            toSocketId: conn.socketId,
            fromPlayerId: myPlayerId,
            signal: { type: "answer", sdp: pc.localDescription },
          });
        } else if (signal.type === "answer" && signal.sdp) {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(signal.sdp);
        } else if (signal.type === "ice" && signal.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
        }
      } catch (e) { console.error("[voice] signal error:", signal.type, e); }
    }

    function onSpeaking({ playerId, speaking: s }: { playerId: string; speaking: boolean }) {
      setState(prev => ({ ...prev, speaking: { ...prev.speaking, [playerId]: s } }));
    }

    socket.on("voice:room-peers", onRoomPeers);
    socket.on("voice:peer-joined", onPeerJoined);
    socket.on("voice:peer-left", onPeerLeft);
    socket.on("voice:signal", onSignal);
    socket.on("voice:speaking", onSpeaking);

    return () => {
      socket.off("voice:room-peers", onRoomPeers);
      socket.off("voice:peer-joined", onPeerJoined);
      socket.off("voice:peer-left", onPeerLeft);
      socket.off("voice:signal", onSignal);
      socket.off("voice:speaking", onSpeaking);
    };
  }, [gameId, myPlayerId, getPeer, closePeer]);

  return { state, enable, disable, toggleMute, changeMic, setVolume };
}
