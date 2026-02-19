"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
// removed duplicate from "react";
import { Bell, Check, CheckCheck, Trash2, Loader2, AlertTriangle, Info, ShieldAlert, UtensilsCrossed, WifiOff, MapPin, Zap, BatteryLow, Siren, Wrench, ChefHat, Percent, Truck, UserCheck, UserPlus, Star, Banknote, Heart, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

interface Alert {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data: any;
  device: { id: string; name: string; type: string } | null;
  geofence: { id: string; name: string } | null;
}

const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  INFO: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
  CRITICAL: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  GEOFENCE_ENTER: { label: "Entrée géofence", icon: MapPin, color: "text-green-400" },
  GEOFENCE_EXIT: { label: "Sortie géofence", icon: MapPin, color: "text-yellow-400" },
  SPEED_LIMIT: { label: "Excès de vitesse", icon: Zap, color: "text-red-400" },
  LOW_BATTERY: { label: "Batterie faible", icon: BatteryLow, color: "text-yellow-400" },
  DEVICE_OFFLINE: { label: "Appareil hors ligne", icon: WifiOff, color: "text-gray-400" },
  SOS: { label: "SOS", icon: Siren, color: "text-red-400" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, color: "text-blue-400" },
  ORDER_NOTIFICATION: { label: "Commande", icon: UtensilsCrossed, color: "text-orange-400" },
  PROMOTION: { label: "Promotion", icon: Percent, color: "text-orange-400" },
  ORDER_READY: { label: "Commande prête", icon: Truck, color: "text-green-400" },
  ORDER_TAKEN: { label: "Commande assignée", icon: UserCheck, color: "text-blue-400" },
  NEW_CLIENT: { label: "Nouveau client", icon: UserPlus, color: "text-green-400" },
  RATING: { label: "Note", icon: Star, color: "text-yellow-400" },
  ENCAISSEMENT: { label: "Paiement", icon: Banknote, color: "text-green-400" },
  LOYALTY: { label: "Client fidèle", icon: Heart, color: "text-pink-400" },
  BIRTHDAY: { label: "Anniversaire", icon: Cake, color: "text-orange-400" },
};

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, "");
}

function notifyBadgeUpdate() {
  window.dispatchEvent(new Event("alerts-updated"));
}

export default function AlertsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isStaff = userRole === "ADMIN" || userRole === "MANAGER";
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterState] = useState(() => { if (typeof window !== "undefined") { const p = new URLSearchParams(window.location.search); return (p.get("tab")) || "all"; } return "all"; });
  const setFilter = (f: string) => {
    setFilterState(f);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", f);
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "unread") params.set("isRead", "false");
    if (filter === "orders") params.set("type", "ORDER_NOTIFICATION,ORDER_READY,ORDER_TAKEN");
    if (filter === "promotions") params.set("type", "PROMOTION");
    if (filter === "clients") params.set("type", "NEW_CLIENT,RATING,LOYALTY,BIRTHDAY");
    if (filter === "payments") params.set("type", "ENCAISSEMENT");
    if (["CRITICAL", "WARNING", "INFO"].includes(filter)) params.set("severity", filter);

    const res = await fetch(`/api/alerts?${params}`);
    const data = await res.json();
    setAlerts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/alerts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    notifyBadgeUpdate();
  }

  async function markAllRead() {
    await fetch("/api/alerts/mark-read", { method: "PUT" });
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    notifyBadgeUpdate();
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    notifyBadgeUpdate();
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHrs < 24) return `Il y a ${diffHrs}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  function getActionLink(alert: Alert) {
    switch (alert.type) {
      case "ORDER_NOTIFICATION": return isStaff ? { href: "/cuisine", icon: ChefHat, label: "Voir en cuisine" } : null;
      case "ORDER_READY": return alert.data?.status === "DELIVERED" ? null : { href: "/navigate", icon: Truck, label: "Livrer la commande" };
      case "PROMOTION": return { href: "/livraison", icon: Percent, label: "Voir les promotions" };
      case "NEW_CLIENT": return isStaff ? { href: "/users", icon: UserPlus, label: "Voir le client" } : null;
      case "RATING": return isStaff ? { href: "/statistiques", icon: Star, label: "Voir les stats" } : null;
      case "ENCAISSEMENT": return isStaff ? { href: "/encaissement", icon: Banknote, label: "Voir l\u0027encaissement" } : null;
      case "LOYALTY": return isStaff ? { href: "/users", icon: Heart, label: "Voir le client" } : null;
      case "BIRTHDAY": return isStaff ? { href: "/users", icon: Cake, label: "Voir le client" } : null;
      default: return null;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle={`${alerts.length} notification(s) • ${unreadCount} non lue(s)`}
      >
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors w-fit"
          >
            <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
          </button>
        )}
      </PageHeader>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "all", label: "Toutes" },
          { key: "unread", label: `Non lues (${unreadCount})` },
          { key: "orders", label: "Commandes" },
          { key: "clients", label: "Clients" },
          { key: "payments", label: "Paiements" },
          { key: "CRITICAL", label: "Critiques" },
          { key: "WARNING", label: "Alertes" },
          { key: "INFO", label: "Info" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
              filter === f.key
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState icon={Bell} message="Aucune notification" />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.INFO;
            const type = typeConfig[alert.type] || { label: alert.type, icon: Bell, color: "text-gray-400" };
            const TypeIcon = type.icon;
            const action = getActionLink(alert);

            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  alert.isRead
                    ? "bg-gray-800/50 border-gray-800"
                    : "bg-gray-900 border-gray-700 shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    alert.isRead ? "opacity-50" : "",
                    sev.bg
                  )}>
                    <TypeIcon className={cn("w-4 h-4", type.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-medium truncate", alert.isRead ? "text-gray-500" : "text-white")}>
                            {stripHtml(alert.title)}
                          </p>
                          {!alert.isRead && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "text-[11px] font-medium px-1.5 py-0.5 rounded",
                            alert.isRead ? "opacity-60" : "",
                            sev.bg, type.color
                          )}>
                            {type.label}
                          </span>
                          {alert.device && (
                            <span className="text-[11px] text-gray-600">
                              {alert.device.name}
                            </span>
                          )}
                          {alert.geofence && (
                            <span className="text-[11px] text-gray-600">
                              {alert.geofence.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-600 whitespace-nowrap shrink-0">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-[13px] mt-1.5 line-clamp-2",
                      alert.isRead ? "text-gray-600" : "text-gray-400"
                    )}>
                      {stripHtml(alert.message)}
                    </p>
                    {alert.data?.imageUrl && (
                      <div className="mt-2">
                        <img loading="lazy" decoding="async" src={alert.data.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      </div>
                    )}
                    {action && !alert.isRead && (
                      <a
                        href={action.href}
                        className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-orange-400 hover:text-orange-300 font-medium transition-colors"
                      >
                        <action.icon className="w-3 h-3" />
                        {action.label}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!alert.isRead && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="p-1.5 text-gray-600 hover:text-green-400 transition-colors rounded-lg hover:bg-green-500/10"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
