"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Trash2, Edit2, Plus, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityName: string | null;
  reason: string | null;
  details: string | null;
  userId: string;
  user: { id: string; name: string; role: string };
  createdAt: string;
}

const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
  DELETE: { icon: Trash2, color: "text-red-400", label: "Suppression" },
  UPDATE: { icon: Edit2, color: "text-blue-400", label: "Modification" },
  CREATE: { icon: Plus, color: "text-green-400", label: "Création" },
};

const entityLabels: Record<string, string> = {
  product: "Plat",
  user: "Utilisateur",
  promotion: "Promotion",
  cook: "Cuisinier",
  driver: "Livreur",
  order: "Commande",
  settings: "Paramètres",
};

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "authenticated" && role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, role, router]);

  useEffect(() => {
    if (status !== "authenticated" || role !== "ADMIN") return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (filter !== "all") params.set("entity", filter);
    fetch(`/api/audit-log?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, role, page, filter]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const totalPages = Math.ceil(total / 30);

  if (status === "loading" || (status === "authenticated" && role !== "ADMIN")) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Journal d’audit" subtitle={`${total} action(s) enregistrée(s)`} />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "all", label: "Toutes" },
          { key: "product", label: "Plats" },
          { key: "user", label: "Utilisateurs" },
          { key: "promotion", label: "Promotions" },
          { key: "cook", label: "Cuisiniers" },
          { key: "driver", label: "Livreurs" },
          { key: "order", label: "Commandes" },
        ].map((f) => (
          <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
            className={cn("px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
              filter === f.key ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Shield} message="Aucune action enregistrée" />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const ac = actionConfig[log.action] || { icon: AlertTriangle, color: "text-gray-400", label: log.action };
            const ActionIcon = ac.icon;
            return (
              <Card key={log.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0 bg-gray-800")}>
                      <ActionIcon className={cn("w-4 h-4", ac.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {ac.label} {entityLabels[log.entity] || log.entity}
                          </p>
                          {log.entityName && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{log.entityName}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 font-medium">
                          {log.user.name}
                        </span>
                        <span className="text-[10px] text-gray-600">{log.user.role}</span>
                      </div>
                      {log.reason && (
                        <p className="text-xs text-gray-500 mt-1.5 italic">
                          {"Raison : "}{log.reason}
                        </p>
                      )}
                      {log.details && (
                        <p className="text-[11px] text-gray-600 mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
