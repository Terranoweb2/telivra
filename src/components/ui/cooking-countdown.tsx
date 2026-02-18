"use client";

import { useEffect, useState, useRef } from "react";
import { Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";

interface CookingCountdownProps {
  cookAcceptedAt: string;
  cookingTimeMin: number;
  onConfirmReady?: () => void;
}

export function CookingCountdown({ cookAcceptedAt, cookingTimeMin, onConfirmReady }: CookingCountdownProps) {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const reminderPlayed = useRef(false);

  useEffect(() => {
    const totalMs = cookingTimeMin * 60 * 1000;
    const update = () => {
      const elapsed = Date.now() - new Date(cookAcceptedAt).getTime();
      const rem = Math.max(0, totalMs - elapsed);
      setRemaining(Math.ceil(rem / 1000));
      setProgress(Math.min(100, (elapsed / totalMs) * 100));

      if (rem <= 30000 && rem > 0 && !reminderPlayed.current) {
        reminderPlayed.current = true;
        playSound("order-ready");
        setShowReminder(true);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cookAcceptedAt, cookingTimeMin, showReminder]);

  useEffect(() => {
    reminderPlayed.current = false;
    setShowReminder(false);
  }, [cookAcceptedAt]);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isOverdue = remaining === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={cn("w-4 h-4", isOverdue ? "text-red-400" : "text-gray-400")} />
          <span className={cn("text-sm font-semibold", isOverdue ? "text-red-400" : "text-gray-200")}>
            {isOverdue ? "Temps écoulé" : `${min}:${sec.toString().padStart(2, "0")}`}
          </span>
        </div>
        <span className="text-xs text-gray-500">{cookingTimeMin} min</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-1000", isOverdue ? "bg-red-500" : "bg-gray-400")}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {showReminder && (
        <div className={cn(
          "flex items-center gap-2 px-2.5 py-2 rounded-lg border",
          isOverdue ? "bg-red-500/10 border-red-500/20" : "bg-gray-800 border-gray-700"
        )}>
          <AlertTriangle className={cn("w-4 h-4 shrink-0", isOverdue ? "text-red-400" : "text-gray-400")} />
          <p className={cn("text-[11px] font-medium flex-1", isOverdue ? "text-red-400" : "text-gray-300")}>
            {isOverdue ? "Le temps est écoulé" : "30s restantes"}
          </p>
          {onConfirmReady && (
            <button
              onClick={() => { setShowReminder(false); onConfirmReady(); }}
              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-md transition-colors shrink-0"
            >
              Prête
            </button>
          )}
          <button
            onClick={() => setShowReminder(false)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] font-medium rounded-md transition-colors shrink-0"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
