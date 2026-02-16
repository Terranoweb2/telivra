"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Loader2, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Hash,
  MapPin, ClipboardList, Map, LogIn, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  ACCEPTED: { label: "Acceptée", color: "bg-orange-500/20 text-orange-400", icon: CheckCircle },
  PICKING_UP: { label: "Recuperation", color: "bg-orange-500/20 text-orange-400", icon: ShoppingBag },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400", icon: Truck },
  DELIVERED: { label: "Livrée", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  CANCELLED: { label: "Annulée", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

export default function TrackPage() {
  const [ref, setRef] = useState("");
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function searchOrders() {
    if (!ref || ref.trim().length < 3) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/track?ref=" + encodeURIComponent(ref.trim()));
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Link href="/" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold text-white">Mes commandes</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Recherche par telephone */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Suivre une commande</h2>
          <p className="text-xs text-gray-500 mb-4">Entrez la référence de votre commande (ex: REF-ABC123)</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && searchOrders()}
                placeholder="REF-ABC123"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 uppercase"
              />
            </div>
            <button
              onClick={searchOrders}
              disabled={loading || ref.trim().length < 3}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Rechercher
            </button>
          </div>
        </div>

        {/* Resultats */}
        {orders !== null && (
          orders.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <ClipboardList className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucune commande trouvée pour ce numéro</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">{orders.length} commande{orders.length > 1 ? "s" : ""} trouvée{orders.length > 1 ? "s" : ""}</p>
              {orders.map((order) => {
                const st = statusConfig[order.status] || statusConfig.PENDING;
                const Icon = st.icon;
                return (
                  <Link
                    key={order.id}
                    href={`/track/${order.id}`}
                    className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.orderNumber || "CMD-" + order.id.slice(-6)}</p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                      </div>
                      <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", st.color)}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </div>
                    {order.deliveryAddress && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {order.items?.slice(0, 3).map((item: any) => (
                        <p key={item.id}>{item.quantity}x {item.product?.name}</p>
                      ))}
                      {order.items?.length > 3 && <p className="text-gray-600">+{order.items.length - 3} autres</p>}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                      <p className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</p>
                      {order.delivery && (
                        <span className="text-xs text-green-400">Livreur assigne</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Navigation mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800/50">
          <div className="flex items-center justify-around h-16 px-2">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl bg-orange-600/15">
                <ClipboardList className="w-5 h-5 text-orange-400 transition-colors" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium text-orange-400">Commandes</span>
            </Link>
            <Link href="/" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl">
                <ShoppingBag className="w-5 h-5 text-gray-500 group-active:text-gray-300 transition-colors" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Commander</span>
            </Link>
            <Link href="/login" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl">
                <LogIn className="w-5 h-5 text-gray-500 group-active:text-gray-300 transition-colors" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
