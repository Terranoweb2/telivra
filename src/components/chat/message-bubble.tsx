"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import { useState } from "react";

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

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
}

const senderLabels: Record<string, string> = {
  CLIENT: "Client",
  DRIVER: "Livreur",
  ADMIN: "Support",
  SYSTEM: "Systeme",
};

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const [imgZoom, setImgZoom] = useState(false);
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const name = message.user?.name || message.guestName || senderLabels[message.sender];

  if (message.sender === "SYSTEM") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
        {!isMine && (
          <span className="text-[10px] text-gray-400 mb-0.5 ml-2">{name}</span>
        )}
        <div
          className={cn(
            "rounded-2xl text-sm leading-relaxed break-words overflow-hidden",
            isMine
              ? "bg-orange-600 text-white rounded-br-md"
              : "bg-gray-700 text-gray-100 rounded-bl-md",
            message.fileUrl ? "p-1" : "px-3.5 py-2"
          )}
        >
          {message.fileUrl && (
            <button onClick={() => setImgZoom(true)} className="block">
              <img
                src={message.fileUrl}
                alt="Image"
                className="rounded-xl max-w-[240px] max-h-[300px] object-cover"
                loading="lazy"
              />
            </button>
          )}
          {message.content && (
            <p className={message.fileUrl ? "px-2.5 py-1.5 text-sm" : ""}>{message.content}</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 px-2">
          <span className="text-[9px] text-gray-500">{time}</span>
          {isMine && (
            message.isRead
              ? <CheckCheck className="w-3 h-3 text-blue-400" />
              : <Check className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </div>

      {/* Zoom image */}
      {imgZoom && message.fileUrl && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90"
          onClick={() => setImgZoom(false)}
        >
          <img
            src={message.fileUrl}
            alt="Image"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
