"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, ChevronUp, Phone, ImagePlus } from "lucide-react";
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
  fileUrl?: string | null;
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
  onSend: (content: string, fileUrl?: string) => Promise<boolean>;
  onMarkRead: () => void;
  onLoadMore: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  otherPartyName?: string;
  orderNumber?: string;
  onCall?: () => void;
  callDisabled?: boolean;
  lightMode?: boolean;
}

export function ChatPanel({
  open, onClose, messages, loading, sending, typingUser,
  hasMore, currentSender, onSend, onMarkRead, onLoadMore,
  onTyping, onStopTyping, disabled = false,
  otherPartyName, orderNumber, onCall, callDisabled = false,
  lightMode = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
    if (!ok) setInput(content);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      alert("Fichier trop volumineux (5MB max)");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/chat", { method: "POST", body: fd });
      if (!res.ok) { setUploading(false); return; }
      const data = await res.json();
      if (data.url) {
        await onSend(input.trim() || "", data.url);
        setInput("");
      }
    } catch {
      // silencieux
    } finally {
      setUploading(false);
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

  // Couleurs adaptatives (dark par défaut, light pour la page track client)
  const bg = lightMode ? "bg-white" : "bg-gray-900";
  const borderColor = lightMode ? "border-gray-200" : "border-gray-800";
  const headerBorder = lightMode ? "border-gray-200/50" : "border-gray-800/50";
  const inputBg = lightMode ? "bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:ring-orange-400/50" : "bg-gray-800 text-white placeholder:text-gray-500 focus:ring-orange-500/50";
  const nameColor = lightMode ? "text-gray-900" : "text-white";
  const subColor = lightMode ? "text-gray-500" : "text-gray-500";
  const closeBg = lightMode ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-800 hover:bg-gray-700";
  const closeIcon = lightMode ? "text-gray-500" : "text-gray-400";

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn("absolute bottom-0 left-0 right-0 max-h-[85vh] border-t rounded-t-2xl flex flex-col shadow-2xl animate-slide-up", bg, borderColor)}>
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", headerBorder)}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-600/20 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-400">
                {otherPartyName?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className={cn("text-sm font-semibold", nameColor)}>
                {otherPartyName || "Discussion"}
              </p>
              {orderNumber && (
                <p className={cn("text-[10px]", subColor)}>{orderNumber}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCall && !callDisabled && (
              <button
                onClick={onCall}
                className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors active:scale-90"
              >
                <Phone className="w-4 h-4 text-white" />
              </button>
            )}
            <button onClick={onClose} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors", closeBg)}>
              <X className={cn("w-4 h-4", closeIcon)} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px] max-h-[60vh]">
          {hasMore && (
            <button onClick={onLoadMore} className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 flex items-center justify-center gap-1">
              <ChevronUp className="w-3 h-3" /> Messages precedents
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className={cn("text-sm", lightMode ? "text-gray-400" : "text-gray-500")}>Aucun message</p>
              <p className={cn("text-xs mt-1", lightMode ? "text-gray-300" : "text-gray-600")}>Commencez la conversation !</p>
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
            <div className="flex items-center gap-2 text-xs text-gray-400 pl-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{"animationDelay": "0ms"}} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{"animationDelay": "150ms"}} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{"animationDelay": "300ms"}} />
              </span>
              {typingUser} ecrit...
            </div>
          )}
        </div>

        {/* Input */}
        <div className={cn("shrink-0 px-4 py-3 border-t pb-safe", headerBorder)}>
          {disabled ? (
            <p className={cn("text-center text-xs py-2", lightMode ? "text-gray-400" : "text-gray-500")}>Conversation terminee</p>
          ) : (
            <div className="flex items-center gap-2">
              {/* Bouton fichier */}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  lightMode ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                )}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                maxLength={1000}
                className={cn("flex-1 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2", inputBg)}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  input.trim() && !sending
                    ? "bg-orange-600 hover:bg-orange-700 active:scale-90 text-white"
                    : lightMode ? "bg-gray-100 text-gray-400" : "bg-gray-800 text-gray-600"
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
