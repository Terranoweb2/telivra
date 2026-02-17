"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, ChevronUp, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { playSound } from "@/lib/sounds";

interface MessageData {
  id: string;
  content: string;
  sender: "CLIENT" | "DRIVER" | "ADMIN" | "SYSTEM";
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
  guestName?: string | null;
  isRead: boolean;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: MessageData[];
  loading: boolean;
  sending: boolean;
  typingUser: string | null;
  hasMore: boolean;
  currentSender: "CLIENT" | "DRIVER" | "ADMIN";
  onSend: (content: string) => Promise<boolean>;
  onMarkRead: () => void;
  onLoadMore: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  otherPartyName?: string;
  otherPartyPhone?: string;
  orderNumber?: string;
}

export function ChatPanel({
  open, onClose, messages, loading, sending, typingUser,
  hasMore, currentSender, onSend, onMarkRead, onLoadMore,
  onTyping, onStopTyping, disabled = false,
  otherPartyName, otherPartyPhone, orderNumber,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const el = scrollRef.current;
      if (el) {
        setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 100);
      }
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender !== currentSender && prevMessageCount.current > 0) {
        playSound("new-message");
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, currentSender]);

  useEffect(() => {
    if (open) {
      onMarkRead();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function handleSend() {
    if (!input.trim() || disabled) return;
    const content = input;
    setInput("");
    onStopTyping();
    const ok = await onSend(content);
    if (!ok) {
      setInput(content);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (e.target.value.length > 0) onTyping();
    else onStopTyping();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-gray-900 border-t border-gray-800 rounded-t-2xl flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-600/20 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-400">
                {otherPartyName?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {otherPartyName || "Discussion"}
              </p>
              {orderNumber && (
                <p className="text-[10px] text-gray-500">{orderNumber}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {otherPartyPhone && (
              <a
                href={`tel:${otherPartyPhone}`}
                className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors"
              >
                <Phone className="w-4 h-4 text-white" />
              </a>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px] max-h-[60vh]">
          {hasMore && (
            <button onClick={onLoadMore} className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1">
              <ChevronUp className="w-3 h-3" /> Messages precedents
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Aucun message</p>
              <p className="text-xs text-gray-600 mt-1">Commencez la conversation !</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={msg.sender === currentSender}
              />
            ))
          )}

          {typingUser && (
            <div className="flex items-center gap-2 text-xs text-gray-500 pl-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              {typingUser} ecrit...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-800/50 pb-safe">
          {disabled ? (
            <p className="text-center text-xs text-gray-500 py-2">Conversation terminee</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                maxLength={1000}
                className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-gray-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  input.trim() && !sending
                    ? "bg-orange-600 hover:bg-orange-700 active:scale-90 text-white"
                    : "bg-gray-800 text-gray-600"
                )}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
