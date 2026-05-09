import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

// ─── ICE / STUN / TURN config ────────────────────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  socketId: string;
  /** ICE candidates buffered until setRemoteDescription is called */
  iceBuf: RTCIceCandidateInit[];
  makingOffer: boolean;
}

export interface VoiceState {
  enabled: boolean;
  muted: boolean;
  error: string | null;
  speaking: Record<string, boolean>;
  peers: string[];
  inputDevices: MediaDeviceInfo[];
  selectedDevice: string;
  volume: number;
  permState: "unknown" | "granted" | "denied" | "prompt";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVoiceChat(gameId: string, myPlayerId: string) {
  const [state, setState] = useState<VoiceState>({
    enabled: false,
    muted: false,
    error: null,
    speaking: {},
    peers: [],
    inputDevices: [],
    selectedDevice: "",
    volume: 100,
    permState: "unknown",
  });

  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, Peer>>(new Map());
  const audioCtx = useRef<AudioContext | null>(null);
  const vadFrame = useRef<number>(0);
  const isSpeakingRef = useRef(false);
  const enabledRef = useRef(false);
  const volumeRef = useRef(1);

  // ── helpers ────────────────────────────────────────────────────────────────
  function patch(p: Partial<VoiceState>) {
    setState(s => ({ ...s, ...p }));
  }

  function peerIds() {
    return Array.from(peers.current.keys());
  }

  // ── flush buffered ICE candidates ─────────────────────────────────────────
  async function flushIceBuf(peer: Peer) {
    while (peer.iceBuf.length > 0) {
      const c = peer.iceBuf.shift()!;
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore stale candidate */
      }
    }
  }

  // ── create a peer connection ───────────────────────────────────────────────
  const createPeer = useCallback(
    (playerId: string, socketId: string): Peer => {
      const existing = peers.current.get(playerId);
      if (existing) {
        existing.socketId = socketId;
        return existing;
      }

      const pc = new RTCPeerConnection(ICE_CONFIG);
      const audio = new Audio();
      audio.autoplay = true;
      audio.volume = volumeRef.current;

      // Add local tracks to the new PC
      if (localStream.current) {
        for (const track of localStream.current.getAudioTracks()) {
          pc.addTrack(track, localStream.current);
        }
      }

      // Remote audio
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
        }
      };

      // ICE relay
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const peer = peers.current.get(playerId);
        if (!peer) return;
        getSocket().emit("voice:signal", {
          toSocketId: peer.socketId,
          fromPlayerId: myPlayerId,
          signal: { type: "ice", candidate: e.candidate.toJSON() },
        });
      };

      // Auto-close on failure
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        console.log(`[voice] peer ${playerId} state: ${s}`);
        if (s === "failed") {
          // Attempt ICE restart once
          pc.restartIce();
        } else if (s === "closed") {
          closePeer(playerId);
        }
      };

      const peer: Peer = { pc, audio, socketId, iceBuf: [], makingOffer: false };
      peers.current.set(playerId, peer);
      setState(s => ({ ...s, peers: [...s.peers.filter(p => p !== playerId), playerId] }));
      return peer;
    },
    [myPlayerId], // closePeer added below
  );

  // ── close a peer ──────────────────────────────────────────────────────────
  const closePeer = useCallback((playerId: string) => {
    const peer = peers.current.get(playerId);
    if (!peer) return;
    try { peer.pc.close(); } catch { /* ignore */ }
    peer.audio.pause();
    peer.audio.srcObject = null;
    peers.current.delete(playerId);
    setState(s => ({
      ...s,
      peers: s.peers.filter(p => p !== playerId),
      speaking: Object.fromEntries(
        Object.entries(s.speaking).filter(([k]) => k !== playerId),
      ),
    }));
  }, []);

  // ── start VAD loop ────────────────────────────────────────────────────────
  function startVAD(stream: MediaStream) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtx.current = ctx;

    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!enabledRef.current) return;
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      const speaking = avg > 8;
      if (speaking !== isSpeakingRef.current) {
        isSpeakingRef.current = speaking;
        getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking });
      }
      vadFrame.current = requestAnimationFrame(tick);
    }
    vadFrame.current = requestAnimationFrame(tick);
  }

  // ── stop VAD loop ─────────────────────────────────────────────────────────
  function stopVAD() {
    cancelAnimationFrame(vadFrame.current);
    try { audioCtx.current?.close(); } catch { /* ignore */ }
    audioCtx.current = null;
  }

  // ── check mic permission ──────────────────────────────────────────────────
  async function checkPermState(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
    if (!navigator.permissions) return "unknown";
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return result.state as "granted" | "denied" | "prompt";
    } catch {
      return "unknown";
    }
  }

  // ── enable voice chat ─────────────────────────────────────────────────────
  const enable = useCallback(async (deviceId?: string) => {
    if (enabledRef.current) return;
    patch({ error: null });

    try {
      // 1. Secure context check
      if (!window.isSecureContext) {
        throw Object.assign(new Error("Mic requires HTTPS. Please use the secure (https://) URL."), { code: "INSECURE" });
      }

      // 2. API availability
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("Your browser doesn't support microphone access. Try Chrome or Firefox."), { code: "NO_API" });
      }

      // 3. Check permission state
      const permState = await checkPermState();
      patch({ permState });

      if (permState === "denied") {
        throw Object.assign(
          new Error("Mic is blocked. Click the 🔒 lock icon in your browser address bar → set Microphone to Allow → refresh."),
          { code: "DENIED" },
        );
      }

      // 4. Request mic
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId
            ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err: unknown) {
        const e = err as DOMException;
        // Retry with plain audio if device constraints failed
        if (e.name === "OverconstrainedError" || e.name === "NotFoundError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw err;
        }
      }

      localStream.current = stream;
      enabledRef.current = true;

      // 5. Start VAD
      startVAD(stream);

      // 6. Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === "audioinput");

      patch({
        enabled: true,
        permState: "granted",
        inputDevices: mics,
        selectedDevice: deviceId || mics[0]?.deviceId || "",
      });

      // 7. Join voice room on backend — backend replies with voice:room-peers
      getSocket().emit("voice:join", { gameId, playerId: myPlayerId });

    } catch (err: unknown) {
      const e = err as DOMException & { code?: string };
      let msg: string;

      if (e.code === "INSECURE") msg = e.message;
      else if (e.code === "NO_API") msg = e.message;
      else if (e.code === "DENIED") msg = e.message;
      else if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        msg = "Permission denied. Click 'Allow' when the browser asks for mic access.";
        patch({ permState: "denied" });
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        msg = "No microphone found. Plug one in and try again.";
      } else if (e.name === "NotReadableError") {
        msg = "Mic is in use by another app. Close it and try again.";
      } else {
        msg = (e as Error).message || "Could not access microphone.";
      }

      console.error("[voice] enable failed:", e);
      patch({ error: msg });
    }
  }, [gameId, myPlayerId]);

  // ── disable voice chat ────────────────────────────────────────────────────
  const disable = useCallback(() => {
    if (!enabledRef.current) return;

    enabledRef.current = false;
    stopVAD();

    // Stop mic tracks
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;

    // Close all peer connections
    for (const pid of Array.from(peers.current.keys())) closePeer(pid);

    // Notify backend
    getSocket().emit("voice:leave", { gameId, playerId: myPlayerId });
    getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking: false });

    isSpeakingRef.current = false;
    patch({ enabled: false, muted: false, peers: [], speaking: {} });
  }, [gameId, myPlayerId, closePeer]);

  // ── toggle mute ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    setState(s => {
      const muted = !s.muted;
      localStream.current!.getAudioTracks().forEach(t => { t.enabled = !muted; });
      if (muted) {
        isSpeakingRef.current = false;
        getSocket().emit("voice:speaking", { gameId, playerId: myPlayerId, speaking: false });
      }
      return { ...s, muted };
    });
  }, [gameId, myPlayerId]);

  // ── change mic device ─────────────────────────────────────────────────────
  const changeMic = useCallback((deviceId: string) => {
    patch({ selectedDevice: deviceId });
    if (enabledRef.current) {
      disable();
      setTimeout(() => enable(deviceId), 300);
    }
  }, [disable, enable]);

  // ── volume control ────────────────────────────────────────────────────────
  const setVolume = useCallback((vol: number) => {
    volumeRef.current = vol / 100;
    patch({ volume: vol });
    for (const peer of peers.current.values()) {
      peer.audio.volume = volumeRef.current;
    }
  }, []);

  // ── socket event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    const socket = getSocket();

    // Backend sends this to the JOINER with the list of already-present peers.
    // The joiner creates offers to each of them.
    async function onRoomPeers(peerList: { playerId: string; socketId: string }[]) {
      console.log("[voice] room peers received:", peerList.map(p => p.playerId));
      for (const { playerId, socketId } of peerList) {
        if (playerId === myPlayerId) continue;
        const peer = createPeer(playerId, socketId);

        // Avoid duplicate offers
        if (peer.makingOffer) continue;
        peer.makingOffer = true;

        try {
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          socket.emit("voice:signal", {
            toSocketId: socketId,
            fromPlayerId: myPlayerId,
            signal: { type: "offer", sdp: peer.pc.localDescription },
          });
        } catch (e) {
          console.error("[voice] offer error:", e);
          peer.makingOffer = false;
        }
      }
    }

    // Backend sends this to EXISTING peers when someone new joins.
    // Existing peers just pre-register the peer entry and wait for the joiner's offer.
    function onPeerJoined({ playerId, socketId }: { playerId: string; socketId: string }) {
      if (playerId === myPlayerId || !enabledRef.current) return;
      console.log("[voice] peer joined:", playerId);
      createPeer(playerId, socketId);
    }

    function onPeerLeft({ playerId }: { playerId: string }) {
      console.log("[voice] peer left:", playerId);
      closePeer(playerId);
    }

    // WebRTC signaling handler
    async function onSignal({
      fromPlayerId,
      fromSocketId,
      signal,
    }: {
      fromPlayerId: string;
      fromSocketId: string;
      signal: {
        type: "offer" | "answer" | "ice";
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }) {
      if (!enabledRef.current) return;

      // Create or retrieve peer entry
      let peer = peers.current.get(fromPlayerId);
      if (!peer) {
        if (signal.type !== "offer") return; // no context without an offer first
        peer = createPeer(fromPlayerId, fromSocketId);
      }
      peer.socketId = fromSocketId;
      const { pc } = peer;

      try {
        if (signal.type === "offer" && signal.sdp) {
          // Collision guard: if we're also making an offer, the peer with
          // lexicographically smaller playerId backs off (polite peer model).
          const collision = peer.makingOffer || pc.signalingState !== "stable";
          const imPolite = myPlayerId < fromPlayerId;

          if (collision && !imPolite) {
            // Impolite peer ignores the colliding offer
            return;
          }

          if (collision && imPolite) {
            // Polite peer rolls back its own offer
            await pc.setLocalDescription({ type: "rollback" });
            peer.makingOffer = false;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushIceBuf(peer);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("voice:signal", {
            toSocketId: peer.socketId,
            fromPlayerId: myPlayerId,
            signal: { type: "answer", sdp: pc.localDescription },
          });

        } else if (signal.type === "answer" && signal.sdp) {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushIceBuf(peer);
          peer.makingOffer = false;

        } else if (signal.type === "ice" && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Buffer until remote description is set
            peer.iceBuf.push(signal.candidate);
          }
        }
      } catch (e) {
        console.error("[voice] signal error:", signal.type, e);
      }
    }

    function onSpeaking({ playerId, speaking }: { playerId: string; speaking: boolean }) {
      setState(s => ({ ...s, speaking: { ...s.speaking, [playerId]: speaking } }));
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
  }, [gameId, myPlayerId, createPeer, closePeer]);

  // ── probe permission on mount ─────────────────────────────────────────────
  useEffect(() => {
    checkPermState().then(permState => {
      if (permState !== "unknown") patch({ permState });
    });
  }, []);

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (enabledRef.current) disable();
    };
  }, [disable]);

  return { state, enable, disable, toggleMute, changeMic, setVolume };
}
