"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
  disabled?: boolean;
}

export function ChatButton({ onClick, unreadCount = 0, disabled = false }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-2xl",
        "flex items-center justify-center transition-all active:scale-90",
        "lg:bottom-6",
        disabled
          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
          : "bg-orange-600 hover:bg-orange-700 text-white"
      )}
    >
      <MessageCircle className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
