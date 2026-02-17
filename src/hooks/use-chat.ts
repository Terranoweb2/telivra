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
  fileUrl?: string | null;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async (cursor?: string) => {
    if (!orderId) return;
    try {
      const url = cursor
        ? `/api/messages/${orderId}?cursor=${encodeURIComponent(cursor)}&limit=50`
        : `/api/messages/${orderId}?limit=50`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[Chat] Load messages failed:", res.status);
        return;
      }
      const data = await res.json();
      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages || []);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.warn("[Chat] Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const sendMessage = useCallback(async (content: string, fileUrl?: string) => {
    if ((!content.trim() && !fileUrl) || sending) return false;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), fileUrl }),
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
    if (hasMore && nextCursor) loadMessages(nextCursor);
  }, [hasMore, nextCursor, loadMessages]);

  useEffect(() => {
    if (!enabled || !orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadMessages();

    const s = io({ path: "/socket.io", transports: ["polling", "websocket"] });
    setSocket(s);

    s.on("connect", () => {
      s.emit("subscribe:chat", orderId);
    });

    s.on("chat:message", (msg: ChatMessage) => {
      if (msg.orderId !== orderId) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    s.on("chat:typing", (data: { orderId: string; name: string }) => {
      if (data.orderId === orderId) setTypingUser(data.name);
    });

    s.on("chat:stop-typing", (data: { orderId: string }) => {
      if (data.orderId === orderId) setTypingUser(null);
    });

    s.on("chat:read", () => {
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    });

    return () => {
      s.emit("unsubscribe:chat", orderId);
      s.disconnect();
      setSocket(null);
    };
  }, [orderId, enabled]);

  const emitTyping = useCallback((name: string, sender: string) => {
    if (!socket?.connected) return;
    socket.emit("chat:typing", { orderId, sender, name });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("chat:stop-typing", { orderId });
    }, 3000);
  }, [orderId, socket]);

  const stopTyping = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit("chat:stop-typing", { orderId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, [orderId, socket]);

  return {
    messages, loading, sending, unreadCount, setUnreadCount,
    typingUser, hasMore, sendMessage, markAsRead, loadMore,
    emitTyping, stopTyping, socket,
  };
}
