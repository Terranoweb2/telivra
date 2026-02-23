"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { X, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: "MINOR" | "MAJOR" | "CRITICAL";
  createdAt: string;
}

const typeConfig = {
  MINOR: {
    icon: Info,
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    iconColor: "text-blue-400",
  },
  MAJOR: {
    icon: AlertTriangle,
    bg: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-400",
    iconColor: "text-orange-400",
  },
  CRITICAL: {
    icon: AlertCircle,
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    iconColor: "text-red-400",
  },
};

export function PlatformNotifications() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-notifications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !role || !["ADMIN", "MANAGER"].includes(role)) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [status, role, fetchNotifications]);

  async function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/platform-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  }

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {notifications.map((n) => {
        const config = typeConfig[n.type] || typeConfig.MINOR;
        const Icon = config.icon;
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${config.bg}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold ${config.text}`}>{n.title}</p>
              <div
                className="text-[12px] text-gray-400 mt-0.5 [&_a]:text-orange-400 [&_a]:underline [&_h3]:font-bold [&_h3]:text-sm [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-0.5"
                dangerouslySetInnerHTML={{ __html: n.message }}
              />
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="p-1 text-gray-500 hover:text-white rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
