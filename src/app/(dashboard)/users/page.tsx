"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Shield, Eye, Truck, ShoppingBag, UserCheck, UserX, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((data) => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function updateUser(id: string, data: any) {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);
  const roleCounts = users.reduce((acc: any, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Utilisateurs</h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} utilisateur{users.length > 1 ? "s" : ""} inscrits</p>
      </div>

      {/* Filtres par role */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setFilter("all")}
          className={cn("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors",
            filter === "all" ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400")}>
          Tous ({users.length})
        </button>
        {Object.entries(roleConfig).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors",
              filter === key ? "bg-orange-600 text-white" : "bg-gray-900 text-gray-400")}>
            {cfg.label} ({roleCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((user) => {
          const rc = roleConfig[user.role] || roleConfig.VIEWER;
          const RoleIcon = rc.icon;
          return (
            <div key={user.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gray-400">
                      {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={user.role}
                    onChange={(e) => updateUser(user.id, { role: e.target.value })}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500">
                    {Object.entries(roleConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                    className={cn("p-2 rounded-lg transition-colors",
                      user.isActive ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10")}>
                    {user.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                <span>{user._count?.clientOrders || 0} commandes</span>
                <span>{user._count?.driverDeliveries || 0} livraisons</span>
                {user.role === "COOK" && <span className="text-amber-400/70">{user._count?.cookOrders || 0} plats prepares</span>}
                <span>Inscrit le {new Date(user.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
