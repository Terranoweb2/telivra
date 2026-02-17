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
  isEdited?: boolean;
  createdAt: string;
  fileUrl?: string | null;
  user?: { id: string; name: string; role: string } | null;
  replyTo?: { id: string; content: string; sender: string; guestName?: string | null; fileUrl?: string | null; user?: { name: string } | null } | null;
}

interface UseChatOptions {
  orderId: string;
  enabled?: boolean;
  onResolvedOrderId?: (realId: string) => void;
}

export function useChat({ orderId, enabled = true, onResolvedOrderId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const effectiveOrderId = useRef(orderId);
  const mySenderTypeRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (cursor?: string) => {
    const oid = effectiveOrderId.current || orderId;
    if (!oid) return;
    try {
      const url = cursor
        ? `/api/messages/${oid}?cursor=${encodeURIComponent(cursor)}&limit=50`
        : `/api/messages/${oid}?limit=50`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[Chat] Load messages failed:", res.status);
        return;
      }
      const data = await res.json();

      if (data.resolvedOrderId && data.resolvedOrderId !== oid) {
        effectiveOrderId.current = data.resolvedOrderId;
        const s = socketRef.current;
        if (s?.connected) s.emit("subscribe:chat", data.resolvedOrderId);
        if (onResolvedOrderId) onResolvedOrderId(data.resolvedOrderId);
      }

      if (data.yourSenderType) mySenderTypeRef.current = data.yourSenderType;
      if (!cursor && data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
      if (data.chatEnabled !== undefined) setChatEnabled(data.chatEnabled);

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
  }, [orderId, onResolvedOrderId]);

  const sendMessage = useCallback(async (content: string, fileUrl?: string, replyToId?: string) => {
    if ((!content.trim() && !fileUrl) || sending) return false;
    setSending(true);
    try {
      const oid = effectiveOrderId.current || orderId;
      const res = await fetch(`/api/messages/${oid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), fileUrl, replyToId }),
      });
      if (!res.ok) return false;
      return true;
    } catch {
      return false;
    } finally {
      setSending(false);
    }
  }, [orderId, sending]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      const oid = effectiveOrderId.current || orderId;
      const res = await fetch(`/api/messages/${oid}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [orderId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const oid = effectiveOrderId.current || orderId;
      const res = await fetch(`/api/messages/${oid}/${messageId}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    }
  }, [orderId]);

  const markAsRead = useCallback(async () => {
    try {
      const oid = effectiveOrderId.current || orderId;
      await fetch(`/api/messages/${oid}/read`, { method: "POST" });
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

    effectiveOrderId.current = orderId;
    mySenderTypeRef.current = null;
    setLoading(true);
    loadMessages();

    const s = io({
      path: "/socket.io",
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    setSocket(s);
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("subscribe:chat", orderId);
      const eid = effectiveOrderId.current;
      if (eid && eid !== orderId) s.emit("subscribe:chat", eid);
      loadMessages();
    });

    s.on("chat:message", (msg: ChatMessage) => {
      const eid = effectiveOrderId.current;
      if (msg.orderId !== orderId && msg.orderId !== eid) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      const myType = mySenderTypeRef.current;
      if (msg.sender !== "SYSTEM" && (!myType || msg.sender !== myType)) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    s.on("chat:message-edited", (data: { messageId: string; content: string; orderId: string }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId !== orderId && data.orderId !== eid) return;
      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId ? { ...m, content: data.content, isEdited: true } : m
      ));
    });

    s.on("chat:message-deleted", (data: { messageId: string; orderId: string }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId !== orderId && data.orderId !== eid) return;
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    s.on("chat:typing", (data: { orderId: string; name: string }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId === orderId || data.orderId === eid) setTypingUser(data.name);
    });

    s.on("chat:stop-typing", (data: { orderId: string }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId === orderId || data.orderId === eid) setTypingUser(null);
    });

    s.on("chat:read", (data: { orderId: string; readBy: string }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId !== orderId && data.orderId !== eid) return;
      const myType = mySenderTypeRef.current;
      if (!myType) return;
      // If the reader is me, skip — I already know what I read
      if (data.readBy === myType) return;
      // The OTHER person just read my messages → mark only MY sent messages as read
      setMessages((prev) => prev.map((m) =>
        m.sender === myType ? { ...m, isRead: true } : m
      ));
    });

    s.on("chat:presence", (data: { orderId: string; count: number }) => {
      const eid = effectiveOrderId.current;
      if (data.orderId === orderId || data.orderId === eid) {
        setIsOtherOnline(data.count > 1);
      }
    });

    s.on("disconnect", () => { setIsOtherOnline(false); });

    return () => {
      s.emit("unsubscribe:chat", orderId);
      const eid = effectiveOrderId.current;
      if (eid && eid !== orderId) s.emit("unsubscribe:chat", eid);
      s.disconnect();
      setSocket(null);
      socketRef.current = null;
      setIsOtherOnline(false);
    };
  }, [orderId, enabled]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadMessages();
        const s = socketRef.current;
        if (s && !s.connected) s.connect();
      }
    }
    function handleOnline() {
      loadMessages();
      const s = socketRef.current;
      if (s && !s.connected) s.connect();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [orderId, enabled, loadMessages]);

  const emitTyping = useCallback((name: string, sender: string) => {
    if (!socket?.connected) return;
    const oid = effectiveOrderId.current || orderId;
    socket.emit("chat:typing", { orderId: oid, sender, name });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("chat:stop-typing", { orderId: oid });
    }, 3000);
  }, [orderId, socket]);

  const stopTyping = useCallback(() => {
    if (!socket?.connected) return;
    const oid = effectiveOrderId.current || orderId;
    socket.emit("chat:stop-typing", { orderId: oid });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }, [orderId, socket]);

  return {
    messages, loading, sending, unreadCount, setUnreadCount,
    typingUser, hasMore, sendMessage, editMessage, deleteMessage,
    markAsRead, loadMore, emitTyping, stopTyping, socket,
    isOtherOnline, chatEnabled,
  };
}
