"use client";

import { Phone, PhoneOff, Mic, MicOff, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallState } from "@/hooks/use-call";

interface CallOverlayProps {
  callState: CallState;
  remoteName: string;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  onAccept: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallOverlay({
  callState, remoteName, duration, isMuted, isSpeaker,
  onAccept, onEnd, onToggleMute, onToggleSpeaker,
}: CallOverlayProps) {
  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-xl" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        {/* Avatar */}
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold",
          callState === "incoming" ? "bg-green-600/20 text-green-400 animate-pulse" :
          callState === "outgoing" ? "bg-orange-600/20 text-orange-400 animate-pulse" :
          "bg-orange-600/20 text-orange-400"
        )}>
          {remoteName?.[0]?.toUpperCase() || "?"}
        </div>

        {/* Nom */}
        <div className="text-center">
          <p className="text-xl font-bold text-white">{remoteName || "Inconnu"}</p>
          <p className={cn(
            "text-sm mt-1",
            callState === "incoming" ? "text-green-400" :
            callState === "outgoing" ? "text-orange-400" :
            "text-gray-400"
          )}>
            {callState === "incoming" && "Appel entrant..."}
            {callState === "outgoing" && "Appel en cours..."}
            {callState === "active" && formatDuration(duration)}
          </p>
        </div>

        {/* Boutons actifs (pendant l appel) */}
        {callState === "active" && (
          <div className="flex items-center gap-6">
            <button
              onClick={onToggleMute}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isMuted ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-white"
              )}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button
              onClick={onToggleSpeaker}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isSpeaker ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-white"
              )}
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Boutons action */}
        <div className="flex items-center gap-8">
          {callState === "incoming" && (
            <>
              {/* Refuser */}
              <button
                onClick={onEnd}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              {/* Accepter */}
              <button
                onClick={onAccept}
                className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-2xl shadow-green-600/30 active:scale-90 transition-all animate-bounce"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
            </>
          )}

          {callState === "outgoing" && (
            <button
              onClick={onEnd}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          )}

          {callState === "active" && (
            <button
              onClick={onEnd}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          )}
        </div>

        {/* Label sous le bouton */}
        <p className="text-xs text-gray-500">
          {callState === "incoming" ? "Glissez pour repondre" : ""}
          {callState === "outgoing" ? "En attente de reponse..." : ""}
        </p>
      </div>
    </div>
  );
}

