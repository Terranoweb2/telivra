"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export type CallState = "idle" | "outgoing" | "incoming" | "ringing" | "active";

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

const CALL_TIMEOUT_MS = 25000;

export function useCall({ orderId, socket, myName, myRole, enabled = true }: UseCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [remoteName, setRemoteName] = useState("");
  const [callerLabel, setCallerLabel] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneCtxRef = useRef<AudioContext | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    stopRingtone();
    setCallDuration(0);
    setIsMuted(false);
    setCallerLabel("");
    setCallState("idle");
  }, []);

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
      ringtoneRef.current = setInterval(playTone, 1500);
    } catch {}
  }

  function stopRingtone() {
    if (ringtoneRef.current) { clearInterval(ringtoneRef.current); ringtoneRef.current = null; }
    if (ringtoneCtxRef.current && ringtoneCtxRef.current.state !== "closed") {
      ringtoneCtxRef.current.close().catch(() => {});
      ringtoneCtxRef.current = null;
    }
  }

  async function createPC(): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socket?.connected) {
        socket.emit("call:ice-candidate", { orderId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        stopRingtone();
        setCallState("active");
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

  const initiateCall = useCallback(async () => {
    if (!socket?.connected || callState !== "idle") return;
    try {
      setCallState("outgoing");
      setRemoteName(remoteName || "");
      playRingtone();
      socket.emit("call:initiate", { orderId, callerName: myName, callerRole: myRole });

      // Auto-end after 25s if no response
      callTimeoutRef.current = setTimeout(() => {
        if (socket?.connected) {
          socket.emit("call:end", { orderId });
          socket.emit("call:missed", { orderId, callerName: myName });
        }
        cleanup();
      }, CALL_TIMEOUT_MS);
    } catch {
      cleanup();
    }
  }, [socket, orderId, myName, myRole, callState, cleanup, remoteName]);

  const acceptCall = useCallback(async () => {
    if (!socket?.connected || (callState !== "incoming" && callState !== "ringing")) return;
    try {
      stopRingtone();
      socket.emit("call:accept", { orderId, accepterName: myName });
    } catch {
      cleanup();
    }
  }, [socket, orderId, callState, myName, cleanup]);

  const endCall = useCallback(() => {
    if (socket?.connected) {
      socket.emit("call:end", { orderId });
      if (callState === "outgoing") {
        socket.emit("call:missed", { orderId, callerName: myName });
      }
    }
    cleanup();
  }, [socket, orderId, callState, myName, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      setIsSpeaker(prev => {
        const next = !prev;
        (remoteAudioRef.current as any).volume = next ? 1.0 : 0.7;
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!socket || !enabled) return;

    const onIncoming = (data: { orderId: string; callerName: string; callerRole: string }) => {
      if (data.orderId !== orderId) return;
      if (callState !== "idle") {
        socket.emit("call:busy", { orderId });
        return;
      }
      setRemoteName(data.callerName);
      const roleLabel = data.callerRole === "CLIENT" ? "Client" : data.callerRole === "DRIVER" ? "Livreur" : "Support";
      setCallerLabel(roleLabel);
      setCallState("incoming");
      playRingtone();
    };

    const onRinging = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      if (callState === "outgoing") {
        setCallState("outgoing");
      }
    };

    const onAccepted = async (data: { orderId: string; accepterName?: string }) => {
      try {
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        stopRingtone();
        if (data.accepterName) setRemoteName(data.accepterName);
        const pc = await createPC();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", { orderId, offer });
      } catch {
        cleanup();
      }
    };

    const onOffer = async (data: { orderId: string; offer: RTCSessionDescriptionInit }) => {
      if (data.orderId !== orderId) return;
      try {
        const pc = await createPC();
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { orderId, answer });
      } catch {
        cleanup();
      }
    };

    const onAnswer = async (data: { orderId: string; answer: RTCSessionDescriptionInit }) => {
      if (data.orderId !== orderId) return;
      try {
        if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch {}
    };

    const onIceCandidate = async (data: { orderId: string; candidate: RTCIceCandidateInit }) => {
      if (data.orderId !== orderId) return;
      try {
        if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };

    const onEnd = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    const onBusy = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    const onRejected = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      cleanup();
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:ringing", onRinging);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:ended", onEnd);
    socket.on("call:busy", onBusy);
    socket.on("call:rejected", onRejected);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:ringing", onRinging);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:ended", onEnd);
      socket.off("call:busy", onBusy);
      socket.off("call:rejected", onRejected);
    };
  }, [socket, orderId, enabled, callState]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    remoteName,
    callerLabel,
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
