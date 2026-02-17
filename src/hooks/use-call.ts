"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState = "idle" | "outgoing" | "incoming" | "active";

interface UseCallOptions {
  orderId: string;
  socket: Socket | null;
  myName: string;
  myRole: "CLIENT" | "DRIVER" | "ADMIN";
  enabled?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useCall({ orderId, socket, myName, myRole, enabled = true }: UseCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteName, setRemoteName] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneRef = useRef<OscillatorNode | null>(null);
  const ringtoneCtxRef = useRef<AudioContext | null>(null);

  // Cleanup
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    stopRingtone();
    setCallDuration(0);
    setIsMuted(false);
    setCallState("idle");
  }, []);

  // Sonnerie entrante
  function playRingtone() {
    try {
      const ctx = new AudioContext();
      ringtoneCtxRef.current = ctx;
      const playTone = () => {
        if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === "closed") return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      };
      playTone();
      const iv = setInterval(playTone, 1500);
      ringtoneRef.current = iv as any;
    } catch {}
  }

  function stopRingtone() {
    if (ringtoneRef.current) { clearInterval(ringtoneRef.current as any); ringtoneRef.current = null; }
    if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== "closed") {
      ringtoneCtxRef.current.close().catch(() => {});
      ringtoneCtxRef.current = null;
    }
  }

  // Creer PeerConnection
  async function createPC(isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Audio local
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Audio distant
    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate && socket?.connected) {
        socket.emit("call:ice-candidate", {
          orderId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        stopRingtone();
        setCallState("active");
        // Timer
        const start = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }

  // Appeler
  const initiateCall = useCallback(async () => {
    if (!socket?.connected || callState !== "idle") return;
    try {
      setCallState("outgoing");
      playRingtone();
      socket.emit("call:initiate", { orderId, callerName: myName, callerRole: myRole });
    } catch {
      cleanup();
    }
  }, [socket, orderId, myName, myRole, callState, cleanup]);

  // Accepter
  const acceptCall = useCallback(async () => {
    if (!socket?.connected || callState !== "incoming") return;
    try {
      stopRingtone();
      socket.emit("call:accept", { orderId });
    } catch {
      cleanup();
    }
  }, [socket, orderId, callState, cleanup]);

  // Refuser / Raccrocher
  const endCall = useCallback(() => {
    if (socket?.connected) {
      socket.emit("call:end", { orderId });
      // Si appel sortant sans réponse → appel manqué
      if (callState === "outgoing") {
        socket.emit("call:missed", { orderId, callerName: myName });
      }
    }
    cleanup();
  }, [socket, orderId, callState, myName, cleanup]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  }, []);

  // Speaker toggle
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      const audio = remoteAudioRef.current as any;
      if (audio.setSinkId) {
        // Toggle between default and speakerphone
        setIsSpeaker(prev => {
          const next = !prev;
          // On mobile browsers, volume change simulates speaker
          audio.volume = next ? 1.0 : 0.7;
          return next;
        });
      } else {
        setIsSpeaker(prev => !prev);
      }
    }
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket || !enabled) return;

    // Appel entrant
    const onIncoming = (data: { orderId: string; callerName: string; callerRole: string }) => {
      if (data.orderId !== orderId) return;
      if (callState !== "idle") {
        socket.emit("call:busy", { orderId });
        return;
      }
      setRemoteName(data.callerName);
      setCallState("incoming");
      playRingtone();
    };

    // Appel accepte -> envoyer l offre
    const onAccepted = async () => {
      try {
        stopRingtone();
        const pc = await createPC(true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", { orderId, offer });
      } catch {
        cleanup();
      }
    };

    // Recevoir l offre -> creer reponse
    const onOffer = async (data: { orderId: string; offer: RTCSessionDescriptionInit }) => {
      if (data.orderId !== orderId) return;
      try {
        const pc = await createPC(false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { orderId, answer });
      } catch {
        cleanup();
      }
    };

    // Recevoir la reponse
    const onAnswer = async (data: { orderId: string; answer: RTCSessionDescriptionInit }) => {
      if (data.orderId !== orderId) return;
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch {}
    };

    // ICE candidate
    const onIceCandidate = async (data: { orderId: string; candidate: RTCIceCandidateInit }) => {
      if (data.orderId !== orderId) return;
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {}
    };

    // Appel termine
    const onEnd = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    // Occupe
    const onBusy = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    // Rejete
    const onRejected = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    // Timeout: si pas de réponse après 30s → appel manqué
    let callTimeout: ReturnType<typeof setTimeout> | null = null;

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:ended", onEnd);
    socket.on("call:busy", onBusy);
    socket.on("call:rejected", onRejected);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:ended", onEnd);
      socket.off("call:busy", onBusy);
      socket.off("call:rejected", onRejected);
    };
  }, [socket, orderId, enabled, callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    remoteName,
    callDuration,
    isMuted,
    isSpeaker,
    initiateCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}

