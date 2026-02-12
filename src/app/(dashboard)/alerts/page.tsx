"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Filter, Loader2, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  device: { id: string; name: string; type: string } | null;
  geofence: { id: string; name: string } | null;
}

const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  INFO: { icon: Info, color: "text-orange-400", bg: "bg-orange-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  CRITICAL: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
};

const typeLabels: Record<string, string> = {
  GEOFENCE_ENTER: "Entree geofence",
  GEOFENCE_EXIT: "Sortie geofence",
  SPEED_LIMIT: "Exces de vitesse",
  LOW_BATTERY: "Batterie faible",
  DEVICE_OFFLINE: "Appareil hors ligne",
  SOS: "SOS",
  MAINTENANCE: "Maintenance",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "unread") params.set("isRead", "false");
    if (filter !== "all" && filter !== "unread") params.set("severity", filter);

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
  }

  async function markAllRead() {
    await fetch("/api/alerts/mark-read", { method: "PUT" });
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Alertes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {alerts.length} alerte(s) • {unreadCount} non lue(s)
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors w-fit"
          >
            <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "Toutes" },
          { key: "unread", label: "Non lues" },
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Aucune alerte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.INFO;
            const Icon = sev.icon;
            return (
              <div
                key={alert.id}
                className={cn(
                  "bg-gray-900 border rounded-xl p-4 transition-colors",
                  alert.isRead ? "border-gray-800" : "border-gray-700 bg-gray-900/80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", sev.bg)}>
                    <Icon className={cn("w-4 h-4", sev.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("text-sm font-medium", alert.isRead ? "text-gray-300" : "text-white")}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {typeLabels[alert.type] || alert.type}
                          {alert.device && ` • ${alert.device.name}`}
                          {alert.geofence && ` • ${alert.geofence.name}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {new Date(alert.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.isRead && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="p-1.5 text-gray-600 hover:text-green-400 transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
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
