"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  content: string;
  sender: "CLIENT" | "DRIVER" | "ADMIN" | "SYSTEM";
  orderId: string;
  userId: string | null;
  guestName: string | null;
  isRead: boolean;
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
}

interface UseChatOptions {
  orderId: string;
  enabled?: boolean;
}

export function useChat({ orderId, enabled = true }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/messages/${orderId}?cursor=${encodeURIComponent(cursor)}&limit=50`
        : `/api/messages/${orderId}?limit=50`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return false;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) return false;
      return true;
    } catch {
      return false;
    } finally {
      setSending(false);
    }
  }, [orderId, sending]);

  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/messages/${orderId}/read`, { method: "POST" });
      setUnreadCount(0);
    } catch {}
  }, [orderId]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor) {
      loadMessages(nextCursor);
    }
  }, [hasMore, nextCursor, loadMessages]);

  useEffect(() => {
    if (!enabled || !orderId) return;

    loadMessages();

    const socket = io({ path: "/socket.io", transports: ["polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("subscribe:chat", orderId);
    });

    socket.on("chat:message", (msg: ChatMessage) => {
      if (msg.orderId !== orderId) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("chat:typing", (data: { orderId: string; name: string }) => {
      if (data.orderId === orderId) {
        setTypingUser(data.name);
      }
    });

    socket.on("chat:stop-typing", (data: { orderId: string }) => {
      if (data.orderId === orderId) {
        setTypingUser(null);
      }
    });

    socket.on("chat:read", () => {
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    });

    return () => {
      socket.emit("unsubscribe:chat", orderId);
      socket.disconnect();
    };
  }, [orderId, enabled, loadMessages]);

  const emitTyping = useCallback((name: string, sender: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit("chat:typing", { orderId, sender, name });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("chat:stop-typing", { orderId });
    }, 3000);
  }, [orderId]);

  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("chat:stop-typing", { orderId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, [orderId]);

  return {
    messages,
    loading,
    sending,
    unreadCount,
    setUnreadCount,
    typingUser,
    hasMore,
    sendMessage,
    markAsRead,
    loadMore,
    emitTyping,
    stopTyping,
  };
}
