"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type EventHandler = (data: any) => void;

interface UseDeliverySocketOptions {
  orderId?: string;
  asDriver?: boolean;
  asCook?: boolean;
  clientId?: string;
  onPosition?: EventHandler;
  onStatusChange?: EventHandler;
  onAccepted?: EventHandler;
  onNewOrder?: EventHandler;
  onOrderUpdate?: EventHandler;
  onCookAccepted?: EventHandler;
  onOrderReady?: EventHandler;
}

export function useDeliverySocket(options: UseDeliverySocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(options);
  handlersRef.current = options;

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Subscribe to rooms
      if (handlersRef.current.orderId) {
        socket.emit("subscribe:order", handlersRef.current.orderId);
      }
      if (handlersRef.current.asDriver) {
        socket.emit("subscribe:driver");
      }
      if (handlersRef.current.asCook) {
        socket.emit("subscribe:cook");
      }
      if (handlersRef.current.clientId) {
        socket.emit("subscribe:client", handlersRef.current.clientId);
      }
    });

    // Position du livreur mise a jour
    socket.on("delivery:position", (data) => {
      handlersRef.current.onPosition?.(data);
    });

    // Statut de la livraison change
    socket.on("delivery:status", (data) => {
      handlersRef.current.onStatusChange?.(data);
    });

    // Livraison acceptee par un livreur
    socket.on("delivery:accepted", (data) => {
      handlersRef.current.onAccepted?.(data);
    });

    // Nouvelle commande disponible (pour cuisiniers et livreurs)
    socket.on("order:new", (data) => {
      handlersRef.current.onNewOrder?.(data);
    });

    // Mise a jour commande (pour client)
    socket.on("order:updated", (data) => {
      handlersRef.current.onOrderUpdate?.(data);
    });

    // Cuisinier a accepte la commande (pour client)
    socket.on("order:cook-accepted", (data) => {
      handlersRef.current.onCookAccepted?.(data);
    });

    // Commande prete (cuisine terminee — pour livreurs et client)
    socket.on("order:ready", (data) => {
      handlersRef.current.onOrderReady?.(data);
    });

    // Commande prise par un livreur
    socket.on("order:taken", (data) => {
      handlersRef.current.onStatusChange?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Changer la room quand orderId change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (options.orderId) {
      socket.emit("subscribe:order", options.orderId);
    }
  }, [options.orderId]);

  return socketRef;
}
