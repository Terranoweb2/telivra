"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ChatButton } from "@/components/chat/chat-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { useCall } from "@/hooks/use-call";
import { CallOverlay } from "@/components/call/call-overlay";

interface ActiveDelivery {
  id: string;
  orderId: string;
  status: string;
  order: {
    id: string;
    orderNumber: string;
    guestName?: string | null;
    guestPhone?: string | null;
    reference?: string | null;
    client?: { name: string; phone?: string | null } | null;
  };
}

export function GlobalDriverChat() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const role = (session?.user as any)?.role;
  const isDriver = role === "DRIVER";

  // Pages qui ont déjà leur propre chat
  const hasOwnChat = /\/livraison\/driver\/|navigate/.test(pathname);

  useEffect(() => {
    if (!isDriver) return;
    // Chercher la livraison active du livreur
    fetch("/api/deliveries/active")
      .then(r => r.ok ? r.json() : null)
      .then(d => setDelivery(d))
      .catch(() => {});
  }, [isDriver, pathname]);

  const orderId = delivery?.orderId || "";
  const chatEnabled = !!delivery && !["DELIVERED", "CANCELLED"].includes(delivery.status);

  const {
    messages, loading, sending, typingUser, hasMore,
    sendMessage, markAsRead, loadMore, emitTyping, stopTyping,
    unreadCount, socket,
  } = useChat({ orderId, enabled: isDriver && !!orderId && !hasOwnChat });

  const {
    callState, remoteName: callRemoteName, callDuration,
    isMuted, isSpeaker, initiateCall, acceptCall, endCall,
    toggleMute, toggleSpeaker,
  } = useCall({
    orderId,
    socket,
    myName: (session?.user as any)?.name || "Livreur",
    myRole: "DRIVER",
    enabled: isDriver && !!orderId && !hasOwnChat,
  });

  // Ne rien afficher si pas livreur, pas de livraison, ou page a déjà son chat
  if (!isDriver || !delivery || hasOwnChat) return null;

  const clientName = delivery.order?.client?.name
    ? `${delivery.order.client.name} (${delivery.order.client.phone || ""})`
    : delivery.order?.guestName
    ? `${delivery.order.guestName} (${delivery.order.guestPhone || ""})`
    : delivery.order?.guestPhone || "Client";

  return (
    <>
      <CallOverlay
        callState={callState}
        remoteName={callRemoteName}
        duration={callDuration}
        isMuted={isMuted}
        isSpeaker={isSpeaker}
        onAccept={acceptCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />
      {!chatOpen && (
        <ChatButton
          onClick={() => setChatOpen(true)}
          unreadCount={unreadCount}
          disabled={!chatEnabled}
        />
      )}
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        loading={loading}
        sending={sending}
        typingUser={typingUser}
        hasMore={hasMore}
        currentSender="DRIVER"
        onSend={sendMessage}
        onMarkRead={markAsRead}
        onLoadMore={loadMore}
        onTyping={() => emitTyping((session?.user as any)?.name || "Livreur", "DRIVER")}
        onStopTyping={stopTyping}
        disabled={!chatEnabled}
        otherPartyName={clientName}
        orderNumber={delivery.order?.orderNumber}
        onCall={initiateCall}
        callDisabled={callState !== "idle" || !chatEnabled}
      />
    </>
  );
}
