"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { cn } from "@/lib/utils";
import { getCachedSettings } from "@/lib/settings-cache";
import {
  LayoutDashboard,
  Bell,
  Settings,
  X,
  ShoppingBag,
  ClipboardList,
  Users,
  Truck,
  Package,
  ChefHat,
  UtensilsCrossed,
  Percent,
} from "lucide-react";

function useBranding() {
  const [brand, setBrand] = useState({ name: "Terrano", logo: null as string | null });
  useEffect(() => {
    getCachedSettings().then((s) => setBrand({ name: s.restaurantName || "Terrano", logo: s.logo }));
  }, []);
  return brand;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: null },
  { label: "Cuisine", href: "/cuisine", icon: ChefHat, roles: ["COOK", "ADMIN"] },
  { label: "Commander", href: "/livraison", icon: ShoppingBag, roles: ["CLIENT"] },
  { label: "Commandes", href: "/livraison/order", icon: ClipboardList, roles: ["ADMIN", "CLIENT", "DRIVER", "COOK"] },
  { label: "Alertes", href: "/alerts", icon: Bell, roles: ["ADMIN", "MANAGER", "VIEWER", "COOK"] },
];

const adminItems = [
  { label: "Repas", href: "/products", icon: Package },
  { label: "Marketing", href: "/products?tab=promotions", icon: Percent },
  { label: "Utilisateurs", href: "/users", icon: Users },
  { label: "Cuisiniers", href: "/cooks", icon: ChefHat },
  { label: "Livreurs", href: "/drivers", icon: Truck },
];

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {}
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { name: restaurantName, logo: brandLogo } = useBranding();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/unread-count");
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count || 0;
        if (newCount > prevCountRef.current && prevCountRef.current >= 0) {
          playNotificationSound();
        }
        prevCountRef.current = newCount;
        setUnreadCount(newCount);
      }
    } catch {}
  }, []);

  // Polling + custom events
  useEffect(() => {
    if (status === "authenticated") {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      const handleAlertsUpdated = () => fetchUnread();
      window.addEventListener("alerts-updated", handleAlertsUpdated);
      return () => {
        clearInterval(interval);
        window.removeEventListener("alerts-updated", handleAlertsUpdated);
      };
    }
  }, [status, fetchUnread]);

  // Socket.IO temps réel pour notification instantanée
  useEffect(() => {
    if (status !== "authenticated" || !role) return;
    const isCook = role === "COOK";
    const isAdmin = role === "ADMIN";
    if (!isCook && !isAdmin) return;

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (isCook || isAdmin) socket.emit("subscribe:cook");
    });

    // Notification instantanée quand l'admin notifie les cuisiniers
    socket.on("notification:new", () => {
      playNotificationSound();
      fetchUnread();
    });

    // Nouvelle commande = son aussi
    socket.on("order:new", () => {
      playNotificationSound();
      fetchUnread();
    });

    return () => { socket.disconnect(); };
  }, [status, role, fetchUnread]);

  if (status === "loading" || !role) return null;

  const filteredItems = navItems.filter(
    (item) => item.roles === null || item.roles.includes(role)
  );

  const isAdmin = role === "ADMIN";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-[#1c1c1e] border-r border-white/[0.06] flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            {brandLogo ? (
              <img src={brandLogo} alt={restaurantName} className="w-9 h-9 object-contain rounded-xl" />
            ) : (
              <div className="bg-orange-600 p-2 rounded-xl">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-lg font-bold text-white">{restaurantName}</span>
          </Link>
          <button onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = item.href === "/livraison"
              ? pathname === "/livraison"
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const isBell = item.href === "/alerts";
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-orange-600/15 text-orange-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}>
                <div className="relative shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                  {isBell && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                {item.label}
                {isBell && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-5 pb-2 px-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Administration</p>
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-orange-600/15 text-orange-400"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}>
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          <div className="pt-4">
            <Link href="/settings" onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-orange-600/15 text-orange-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}>
              <Settings className="w-[18px] h-[18px] shrink-0" />
              Paramètres
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
