"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import {
  Loader2, Users, Shield, Eye, Truck, ShoppingBag, ChefHat,
  Phone, UserMinus, MapPin, Wifi, UserCheck, UserX, Trash2,
  X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ADMIN: { label: "Admin", color: "text-red-400", bg: "bg-red-500/20", icon: Shield },
  MANAGER: { label: "Manager", color: "text-orange-400", bg: "bg-orange-500/20", icon: Eye },
  VIEWER: { label: "Viewer", color: "text-gray-400", bg: "bg-gray-500/20", icon: Eye },
  CLIENT: { label: "Client", color: "text-blue-400", bg: "bg-blue-500/20", icon: ShoppingBag },
  DRIVER: { label: "Livreur", color: "text-green-400", bg: "bg-green-500/20", icon: Truck },
  COOK: { label: "Cuisinier", color: "text-amber-400", bg: "bg-amber-500/20", icon: ChefHat },
};

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const isManager = userRole === "MANAGER";
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterState] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("tab") || "CLIENT";
    }
    return "CLIENT";
  });
  const setFilter = (v: string) => {
    setFilterState(v);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", v);
    window.history.replaceState({}, "", url.toString());
  };
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [roleDialog, setRoleDialog] = useState<any | null>(null);
  const [blockDialog, setBlockDialog] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<any | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(() => {
    fetch("/api/users").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setUsers(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (filter === "guest" && guests.length === 0 && !loadingGuests) {
      setLoadingGuests(true);
      fetch("/api/users?guests=true").then((r) => r.json()).then((data) => {
        setGuests(Array.isArray(data) ? data : []);
        setLoadingGuests(false);
      });
    }
  }, [filter]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      socket.emit("subscribe:admin");
      socket.emit("presence:list");
    });
    socket.on("presence:list", (list: any[]) => {
      setOnlineUsers(new Set(list.filter((u) => u.online).map((u) => u.userId)));
    });
    socket.on("presence:update", ({ userId, online }: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
    return () => { socket.disconnect(); };
  }, []);

  async function updateUser(id: string, data: any) {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      toast.success("Utilisateur mis à jour");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Erreur");
    }
  }

  async function deleteUser(id: string) {
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Utilisateur supprimé");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Erreur");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const filtered = filter === "guest" ? [] : users.filter((u) => u.role === filter);
  const roleCounts = users.reduce((acc: any, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {} as any);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} inscrit${users.length > 1 ? "s" : ""}`}
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {Object.entries(roleConfig).filter(([key]) => !isManager || ["CLIENT", "DRIVER", "COOK"].includes(key)).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-colors shrink-0",
              filter === key ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
            {cfg.label} ({roleCounts[key] || 0})
          </button>
        ))}
        <button onClick={() => setFilter("guest")}
          className={cn("px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-colors shrink-0",
            filter === "guest" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
          Invités {guests.length > 0 ? `(${guests.length})` : ""}
        </button>
      </div>

      {filter === "guest" ? (
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
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Téléphone</th>
                    <th className="px-4 py-3 font-medium">Localisation</th>
                    <th className="px-4 py-3 font-medium text-center">Cmd</th>
                    <th className="px-4 py-3 font-medium text-right">Dépensé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {guests.map((g, i) => (
                    <tr key={i} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3"><p className="text-white font-medium text-xs">{g.name}</p></td>
                      <td className="px-4 py-3">
                        <a href={`tel:${g.phone}`} className="text-gray-300 hover:text-orange-400 flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3" /> {g.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {g.addresses?.length > 0 ? (
                          <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0 text-gray-600" /> {g.addresses[0]}
                          </p>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300 text-xs">{g.totalOrders}</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-400 text-xs">{g.totalSpent?.toLocaleString()} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const rc = roleConfig[user.role] || roleConfig.VIEWER;
            const RoleIcon = rc.icon;
            const online = onlineUsers.has(user.id);
            const initial = (user.name || "?")[0].toUpperCase();

            return (
              <Card hover key={user.id}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", rc.bg)}>
                      <span className={cn("text-sm font-bold", rc.color)}>{initial}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate max-w-[140px]">{user.name}</p>
                        <button onClick={(e) => { e.preventDefault(); setRoleDialog(user); }}
                          className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 hover:opacity-80", rc.bg, rc.color)}>
                          <RoleIcon className="w-2.5 h-2.5" /> {rc.label}
                        </button>
                        {!user.isActive && (
                          <span className="text-[9px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full shrink-0">Bloqué</span>
                        )}
                        {(user.role === "COOK" || user.role === "DRIVER") && online && (
                          <span className="text-[9px] text-green-400 font-medium shrink-0 flex items-center gap-0.5">
                            <Wifi className="w-2.5 h-2.5" /> En ligne
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 overflow-x-auto scrollbar-hide">
                        <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                        {(user._count?.clientOrders || 0) > 0 && (
                          <span className="text-[10px] text-blue-400 shrink-0">{user._count.clientOrders} cmd</span>
                        )}
                        {(user._count?.driverDeliveries || 0) > 0 && (
                          <span className="text-[10px] text-green-400 shrink-0">{user._count.driverDeliveries} liv.</span>
                        )}
                        {(user._count?.cookOrders || 0) > 0 && (
                          <span className="text-[10px] text-amber-400 shrink-0">{user._count.cookOrders} prép.</span>
                        )}
                        <span className="text-[10px] text-gray-600 shrink-0">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>

                    {user.id !== currentUserId && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={(e) => { e.preventDefault(); setBlockDialog(user); }}
                        className={cn("p-1.5 rounded-lg transition-colors",
                          user.isActive ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10")}>
                        {user.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.preventDefault(); setDeleteDialog(user); }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <EmptyState icon={Users} message="Aucun utilisateur" />}
        </div>
      )}

      {/* === ROLE DIALOG === */}
      {roleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRoleDialog(null)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Changer le rôle</h3>
              <button onClick={() => setRoleDialog(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">{roleDialog.name} &mdash; {roleDialog.email}</p>
            <div className="space-y-1.5">
              {Object.entries(roleConfig).filter(([key]) => !isManager || ["CLIENT", "DRIVER", "COOK"].includes(key)).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key}
                    onClick={() => { updateUser(roleDialog.id, { role: key }); setRoleDialog(null); }}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-colors",
                      roleDialog.role === key
                        ? "bg-orange-600/20 text-orange-400 border border-orange-500/30"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700")}>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{cfg.label}</span>
                    {roleDialog.role === key && <span className="text-[9px] text-orange-500">actuel</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === BLOCK DIALOG === */}
      {blockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBlockDialog(null)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                {blockDialog.isActive ? "Bloquer l'utilisateur" : "Débloquer l'utilisateur"}
              </h3>
              <button onClick={() => setBlockDialog(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {blockDialog.isActive
                ? <>« {blockDialog.name} » ne pourra plus se connecter et sera exclu du staff.</>
                : <>« {blockDialog.name} » pourra se reconnecter.</>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setBlockDialog(null)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 transition-colors">
                Annuler
              </button>
              <button onClick={() => { updateUser(blockDialog.id, { isActive: !blockDialog.isActive }); setBlockDialog(null); }}
                className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors",
                  blockDialog.isActive ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500")}>
                {blockDialog.isActive ? "Bloquer" : "Débloquer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE DIALOG === */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteDialog(null)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Supprimer l'utilisateur</h3>
              <button onClick={() => setDeleteDialog(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              Supprimer définitivement <strong className="text-white">{deleteDialog.name}</strong> ?
            </p>
            <p className="text-[10px] text-red-400/70 mb-4">Cette action est irréversible. Si l'utilisateur a des commandes, il ne pourra pas être supprimé.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteDialog(null)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 transition-colors">
                Annuler
              </button>
              <button onClick={() => { deleteUser(deleteDialog.id); setDeleteDialog(null); }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold text-white transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
