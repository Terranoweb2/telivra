"use client";

import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallState } from "@/hooks/use-call";

interface CallOverlayProps {
  callState: CallState;
  remoteName: string;
  callerLabel?: string;
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
  callState, remoteName, callerLabel, duration, isMuted, isSpeaker,
  onAccept, onEnd, onToggleMute, onToggleSpeaker,
}: CallOverlayProps) {
  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        {/* Animated rings for ringing states */}
        {(callState === "incoming" || callState === "ringing") && (
          <div className="absolute w-32 h-32 top-0 left-1/2 -translate-x-1/2">
            <span className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-ping" />
            <span className="absolute inset-2 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDelay: "0.5s" }} />
          </div>
        )}
        {callState === "outgoing" && (
          <div className="absolute w-32 h-32 top-0 left-1/2 -translate-x-1/2">
            <span className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-ping" />
            <span className="absolute inset-2 rounded-full border-2 border-orange-500/20 animate-ping" style={{ animationDelay: "0.5s" }} />
          </div>
        )}

        {/* Avatar */}
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold relative z-10",
          callState === "incoming" || callState === "ringing" ? "bg-green-600/20 text-green-400" :
          callState === "outgoing" ? "bg-orange-600/20 text-orange-400" :
          "bg-orange-600/20 text-orange-400"
        )}>
          {remoteName?.[0]?.toUpperCase() || "?"}
        </div>

        {/* Name and status */}
        <div className="text-center">
          <p className="text-xl font-bold text-white">{remoteName || "Inconnu"}</p>
          {callerLabel && callState === "incoming" && (
            <p className="text-xs text-gray-500 mt-0.5">{callerLabel}</p>
          )}
          <p className={cn(
            "text-sm mt-2 font-medium",
            (callState === "incoming" || callState === "ringing") ? "text-green-400" :
            callState === "outgoing" ? "text-orange-400" :
            "text-gray-400"
          )}>
            {callState === "incoming" && "Appel entrant..."}
            {callState === "ringing" && "Ca sonne..."}
            {callState === "outgoing" && "Ca sonne chez " + (remoteName || "...")}
            {callState === "active" && formatDuration(duration)}
          </p>

          {/* Ringing animation dots */}
          {(callState === "outgoing" || callState === "ringing") && (
            <div className="flex items-center justify-center gap-1 mt-3">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "200ms" }} />
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "400ms" }} />
            </div>
          )}
        </div>

        {/* Active call controls */}
        {callState === "active" && (
          <div className="flex items-center gap-6">
            <button onClick={onToggleMute} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", isMuted ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-white")}>
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button onClick={onToggleSpeaker} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", isSpeaker ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-white")}>
              <Volume2 className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-8 mt-2">
          {(callState === "incoming" || callState === "ringing") && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onEnd} className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all">
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <span className="text-[10px] text-gray-500">Refuser</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onAccept} className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-2xl shadow-green-600/30 active:scale-90 transition-all animate-bounce">
                  <Phone className="w-7 h-7 text-white" />
                </button>
                <span className="text-[10px] text-gray-500">Accepter</span>
              </div>
            </>
          )}

          {callState === "outgoing" && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={onEnd} className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all">
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-[10px] text-gray-500">Annuler</span>
            </div>
          )}

          {callState === "active" && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={onEnd} className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/30 active:scale-90 transition-all">
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-[10px] text-gray-500">Raccrocher</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
