"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, User, Truck, CheckCircle, Star,
  TrendingUp, ChefHat, Users, UtensilsCrossed, ShoppingBag,
  MapPin, Clock, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type Tab = "deliveries" | "clients" | "cooks" | "ratings";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("deliveries");

  useEffect(() => {
    fetch(`/api/drivers/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data?.driver) return <EmptyState icon={User} message="Livreur introuvable" />;

  const { driver, stats, deliveries, clients, cooks } = data;
  const ratingsData = deliveries.filter((d: any) => d.order?.rating);

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "deliveries", label: "Livraisons", icon: Truck, count: deliveries.length },
    { key: "clients", label: "Clients", icon: Users, count: clients.length },
    { key: "cooks", label: "Cuisiniers", icon: ChefHat, count: cooks.length },
    { key: "ratings", label: "Notes", icon: Star, count: ratingsData.length },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={driver.name || "Livreur"}
        subtitle={driver.email}
      >
        <Link href="/drivers" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardCentered icon={CheckCircle} value={stats.totalDeliveries} label="Livraisons" color="green" />
        <StatCardCentered icon={TrendingUp} value={stats.totalRevenue.toLocaleString()} label="FCFA total" color="orange" />
        <StatCardCentered icon={Star} value={stats.avgRating || "-"} label={`${stats.ratingCount} avis`} color="yellow" />
        <StatCardCentered icon={Users} value={clients.length} label="Clients" color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
              tab === t.key ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", tab === t.key ? "bg-white/20" : "bg-gray-700")}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "deliveries" && (
        <div className="space-y-2">
          {deliveries.length === 0 ? (
            <EmptyState icon={Truck} message="Aucune livraison" />
          ) : deliveries.map((d: any) => (
            <Card key={d.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">
                      {d.order?.client?.name || d.order?.guestName || "Client"}
                    </p>
                    {d.order?.deliveryMode === "PICKUP" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-medium">Emporter</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{d.order?.orderNumber || "#" + d.order?.id?.slice(-6)}</span>
                    <span>-</span>
                    <span>{d.order?.items?.length || 0} plats</span>
                    <span>-</span>
                    <span>{new Date(d.endTime || d.order?.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {d.order?.items && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {d.order.items.map((i: any) => i.product?.name).filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-orange-400">{(d.order?.totalAmount || 0).toLocaleString()} F</p>
                  {d.order?.rating && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-400">{d.order.rating.driverRating}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-2">
          {clients.length === 0 ? (
            <EmptyState icon={Users} message="Aucun client" />
          ) : clients.map((c: any) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                  {c.count} commande{c.count > 1 ? "s" : ""}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "cooks" && (
        <div className="space-y-2">
          {cooks.length === 0 ? (
            <EmptyState icon={ChefHat} message="Aucun cuisinier" />
          ) : cooks.map((c: any) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                  {c.count} plat{c.count > 1 ? "s" : ""}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "ratings" && (
        <div className="space-y-2">
          {ratingsData.length === 0 ? (
            <EmptyState icon={Star} message="Aucune note" />
          ) : ratingsData.map((d: any) => (
            <Card key={d.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={cn("w-3.5 h-3.5", s <= (d.order.rating.driverRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-700")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">Livreur</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={cn("w-3 h-3", s <= (d.order.rating.mealRating || 0) ? "text-orange-400 fill-orange-400" : "text-gray-700")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">Plat</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{d.order?.client?.name || d.order?.guestName || "Client"}</p>
                  <p className="text-xs text-gray-500">{new Date(d.order.rating.createdAt).toLocaleDateString("fr-FR")}</p>
                  {d.order.rating.driverComment && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 text-gray-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-400 italic">"{d.order.rating.driverComment}"</p>
                    </div>
                  )}
                  {d.order.rating.mealComment && (
                    <div className="mt-1 flex items-start gap-1.5">
                      <UtensilsCrossed className="w-3 h-3 text-gray-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-400 italic">"{d.order.rating.mealComment}"</p>
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-orange-400 shrink-0">{(d.order?.totalAmount || 0).toLocaleString()} F</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
