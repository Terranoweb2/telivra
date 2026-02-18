"use client";


import { useEffect, useState } from "react";
import { Loader2, Users, Shield, Eye, Truck, ShoppingBag, UserCheck, UserX, ChefHat, Phone, UserMinus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  ADMIN: { label: "Admin", color: "bg-red-500/20 text-red-400", icon: Shield },
  MANAGER: { label: "Manager", color: "bg-orange-500/20 text-orange-400", icon: Eye },
  VIEWER: { label: "Viewer", color: "bg-gray-500/20 text-gray-400", icon: Eye },
  CLIENT: { label: "Client", color: "bg-orange-500/20 text-orange-400", icon: ShoppingBag },
  DRIVER: { label: "Livreur", color: "bg-green-500/20 text-green-400", icon: Truck },
  COOK: { label: "Cuisinier", color: "bg-amber-500/20 text-amber-400", icon: ChefHat },
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterState] = useState(() => { if (typeof window !== "undefined") { const p = new URLSearchParams(window.location.search); return (p.get("tab")) || "CLIENT"; } return "CLIENT"; });
  const setFilter = (v: string) => {
    setFilterState(v);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", v);
    window.history.replaceState({}, "", url.toString());
  };
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((data) => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (filter === "guest" && guests.length === 0 && !loadingGuests) {
      setLoadingGuests(true);
      fetch("/api/users?guests=true").then((r) => r.json()).then((data) => {
        setGuests(Array.isArray(data) ? data : []);
        setLoadingGuests(false);
      });
    }
  }, [filter]);

  async function updateUser(id: string, data: any) {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
      toast.success("Utilisateur mis à jour");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Erreur lors de la mise à jour");
    }
  }

  function confirmToggleActive(user: any) {
    if (user.isActive) {
      toast.warning(`Désactiver "${user.name}" ?`, {
        description: "L'utilisateur ne pourra plus se connecter",
        action: { label: "Désactiver", onClick: () => updateUser(user.id, { isActive: false }) },
        cancel: { label: "Annuler", onClick: () => {} },
      });
    } else {
      updateUser(user.id, { isActive: true });
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const filtered = filter === "guest" ? [] : users.filter((u) => u.role === filter);
  const roleCounts = users.reduce((acc: any, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} inscrit${users.length > 1 ? "s" : ""}`}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(roleConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={cn("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors",
                filter === key ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400")}>
              {cfg.label} ({roleCounts[key] || 0})
            </button>
          ))}
          <button onClick={() => setFilter("guest")}
            className={cn("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors",
              filter === "guest" ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400")}>
            Non Inscrit {guests.length > 0 ? `(${guests.length})` : ""}
          </button>
        </div>
      </PageHeader>

      {filter === "guest" ? (
        /* ======= GUEST USERS TABLE ======= */
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loadingGuests ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : guests.length === 0 ? (
            <EmptyState icon={UserMinus} message="Aucun utilisateur non inscrit" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Téléphone</th>
                    <th className="px-4 py-3 font-medium">Localisation</th>
                    <th className="px-4 py-3 font-medium text-center">Commandes</th>
                    <th className="px-4 py-3 font-medium text-center">Livrées</th>
                    <th className="px-4 py-3 font-medium text-right">Dépensé</th>
                    <th className="px-4 py-3 font-medium text-right">Dernière</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {guests.map((g, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{g.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`tel:${g.phone}`} className="text-gray-300 hover:text-orange-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {g.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {g.addresses && g.addresses.length > 0 ? (
                          <div className="space-y-0.5">
                            {g.addresses.map((addr: string, j: number) => (
                              <p key={j} className="text-xs text-gray-400 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0 text-gray-600" /> {addr}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{g.totalOrders}</td>
                      <td className="px-4 py-3 text-center text-green-400">{g.deliveredOrders}</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-400">{g.totalSpent?.toLocaleString()} F</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{new Date(g.lastOrder).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ======= REGISTERED USERS TABLE ======= */
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} message="Aucun utilisateur trouvé" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium text-center">Commandes</th>
                    <th className="px-4 py-3 font-medium text-center">Livraisons</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 font-medium text-right">Inscrit le</th>
                    <th className="px-4 py-3 font-medium text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.map((user, i) => {
                    const rc = roleConfig[user.role] || roleConfig.VIEWER;
                    return (
                      <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{user.name}</p>
                          {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{user.email}</td>
                        <td className="px-4 py-3 text-center text-gray-300">{user._count?.clientOrders || 0}</td>
                        <td className="px-4 py-3 text-center text-gray-300">{user._count?.driverDeliveries || 0}</td>
                        <td className="px-4 py-3">
                          <select value={user.role}
                            onChange={(e) => updateUser(user.id, { role: e.target.value })}
                            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500">
                            {Object.entries(roleConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => confirmToggleActive(user)}
                            className={cn("p-1.5 rounded-lg transition-colors",
                              user.isActive ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10")}>
                            {user.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
