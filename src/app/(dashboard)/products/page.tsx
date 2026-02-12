"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Package, Plus, Trash2, ShoppingBag, TrendingUp,
  Clock, CheckCircle, Truck, XCircle, Store,
  UtensilsCrossed, ShoppingCart, Pill, Smartphone,
  Timer, Droplets, CreditCard, Edit2, X, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "products" | "orders" | "revenue";
type ProductFilter = "all" | "meals" | "extras";

const categoryConfig: Record<string, { label: string; icon: any }> = {
  RESTAURANT: { label: "Restaurant", icon: UtensilsCrossed },
  GROCERY: { label: "Epicerie", icon: ShoppingCart },
  PHARMACY: { label: "Pharmacie", icon: Pill },
  ELECTRONICS: { label: "Electronique", icon: Smartphone },
  OTHER: { label: "Autre", icon: Package },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  ACCEPTED: { label: "Acceptee", color: "bg-blue-500/20 text-blue-400" },
  PREPARING: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400" },
  READY: { label: "Pret", color: "bg-cyan-500/20 text-cyan-400" },
  PICKED_UP: { label: "Recuperee", color: "bg-indigo-500/20 text-indigo-400" },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400" },
  DELIVERED: { label: "Livree", color: "bg-green-500/20 text-green-400" },
  CANCELLED: { label: "Annulee", color: "bg-red-500/20 text-red-400" },
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Especes",
  ONLINE: "En ligne",
  BOTH: "Les deux",
};

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");

  // Formulaire ajout
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", price: "", category: "RESTAURANT",
    shopName: "", image: "", cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH",
  });
  const [saving, setSaving] = useState(false);

  // Edition inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/stats/revenue").then((r) => r.json()),
    ]).then(([p, o, r]) => {
      setProducts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setRevenue(r);
      setLoading(false);
    });
  }, []);

  async function addProduct() {
    if (!form.name || !form.price || !form.shopName) return;
    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        cookingTimeMin: parseInt(form.cookingTimeMin) || 15,
        isAvailable: true,
      }),
    });
    if (res.ok) {
      const p = await res.json();
      setProducts((prev) => [p, ...prev]);
      setForm({ name: "", description: "", price: "", category: "RESTAURANT", shopName: "", image: "", cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH" });
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookingTimeMin: parseInt(editForm.cookingTimeMin) || 15,
        isExtra: editForm.isExtra,
        paymentMethod: editForm.paymentMethod,
        price: parseFloat(editForm.price) || 0,
        name: editForm.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
      setEditingId(null);
      setEditForm(null);
    }
  }

  async function deleteProduct(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "products", label: "Produits", icon: Package },
    { key: "orders", label: "Commandes", icon: ShoppingBag },
    { key: "revenue", label: "Recettes", icon: TrendingUp },
  ];

  // Filtrer produits
  const filteredProducts = products.filter((p) => {
    if (productFilter === "meals") return !p.isExtra;
    if (productFilter === "extras") return p.isExtra;
    return true;
  });

  const deliveredOrders = orders.filter((o: any) => o.status === "DELIVERED" || o.delivery?.status === "DELIVERED");
  const shops = [...new Set(filteredProducts.map((p) => p.shopName))];
  const mealsCount = products.filter((p) => !p.isExtra).length;
  const extrasCount = products.filter((p) => p.isExtra).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Produits</h1>
          <p className="text-gray-400 text-sm mt-1">Gerez vos produits, commandes et recettes</p>
        </div>
        {tab === "products" && (
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                tab === t.key ? "bg-orange-600 text-white" : "text-gray-400")}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* === PRODUITS === */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Filtre Repas / Extras / Tous */}
          <div className="flex gap-2">
            <button onClick={() => setProductFilter("all")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                productFilter === "all" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400")}>
              Tous ({products.length})
            </button>
            <button onClick={() => setProductFilter("meals")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                productFilter === "meals" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400")}>
              <UtensilsCrossed className="w-3 h-3" /> Repas ({mealsCount})
            </button>
            <button onClick={() => setProductFilter("extras")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                productFilter === "extras" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400")}>
              <Droplets className="w-3 h-3" /> Extras ({extrasCount})
            </button>
          </div>

          {/* Formulaire ajout */}
          {showAdd && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Nouveau produit</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                <input type="number" placeholder="Prix *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                <input type="text" placeholder="Boutique / Restaurant *" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                  {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {/* Nouveaux champs restaurant */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Temps cuisson (min)</label>
                  <div className="relative">
                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input type="number" min="1" value={form.cookingTimeMin}
                      onChange={(e) => setForm({ ...form, cookingTimeMin: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Paiement</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="BOTH">Les deux</option>
                    <option value="CASH">Especes</option>
                    <option value="ONLINE">En ligne</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isExtra}
                      onChange={(e) => setForm({ ...form, isExtra: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500" />
                    <span className="text-sm text-gray-300 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" /> Extra
                    </span>
                  </label>
                </div>
              </div>

              <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
              <input type="text" placeholder="URL image (optionnel)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
              <button onClick={addProduct} disabled={saving || !form.name || !form.price || !form.shopName}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter le produit
              </button>
            </div>
          )}

          {/* Liste par boutique */}
          {shops.map((shop) => {
            const shopProducts = filteredProducts.filter((p) => p.shopName === shop);
            return (
              <div key={shop}>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-white">{shop}</h3>
                  <span className="text-xs text-gray-600">{shopProducts.length} produit{shopProducts.length > 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {shopProducts.map((p) => {
                    const cat = categoryConfig[p.category] || categoryConfig.OTHER;
                    const CatIcon = cat.icon;
                    const isEditing = editingId === p.id;

                    if (isEditing && editForm) {
                      return (
                        <div key={p.id} className="bg-gray-900 border border-orange-500/30 rounded-xl p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                            <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" placeholder="Prix" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5 text-gray-500" />
                              <input type="number" min="1" value={editForm.cookingTimeMin}
                                onChange={(e) => setEditForm({ ...editForm, cookingTimeMin: e.target.value })}
                                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs" />
                              <span className="text-xs text-gray-500">min</span>
                            </div>
                            <select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs">
                              <option value="BOTH">Les deux</option>
                              <option value="CASH">Especes</option>
                              <option value="ONLINE">En ligne</option>
                            </select>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={editForm.isExtra}
                                onChange={(e) => setEditForm({ ...editForm, isExtra: e.target.checked })}
                                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-orange-500" />
                              <span className="text-xs text-gray-300">Extra</span>
                            </label>
                            <div className="flex-1" />
                            <button onClick={() => saveEdit(p.id)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditingId(null); setEditForm(null); }} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                          {p.image ? <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <CatIcon className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">{p.name}</p>
                            {p.isExtra && (
                              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded font-medium flex items-center gap-0.5">
                                <Droplets className="w-2.5 h-2.5" /> Extra
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{cat.label} - {p.price?.toLocaleString()} FCFA</span>
                            {!p.isExtra && (
                              <span className="flex items-center gap-0.5 text-orange-400/70">
                                <Timer className="w-3 h-3" /> {p.cookingTimeMin || 15}min
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <CreditCard className="w-3 h-3" /> {paymentMethodLabels[p.paymentMethod] || "Les deux"}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => { setEditingId(p.id); setEditForm({ name: p.name, price: p.price, cookingTimeMin: p.cookingTimeMin || 15, isExtra: p.isExtra || false, paymentMethod: p.paymentMethod || "BOTH" }); }}
                          className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucun produit</p>
            </div>
          )}
        </div>
      )}

      {/* === COMMANDES === */}
      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucune commande</p>
            </div>
          ) : (
            orders.slice(0, 50).map((order: any) => {
              const st = statusLabels[order.status] || statusLabels.PENDING;
              return (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {order.client?.name || order.guestName || `#${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.paymentMethod === "ONLINE" && (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                          order.paymentStatus === "PAID" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                          {order.paymentStatus === "PAID" ? "Paye" : "En attente"}
                        </span>
                      )}
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", st.color)}>{st.label}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5 mb-2">
                    {order.items?.map((item: any) => (
                      <p key={item.id}>{item.quantity}x {item.product?.name}</p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</p>
                      <span className="text-[10px] text-gray-600">
                        {order.paymentMethod === "ONLINE" ? "En ligne" : "Especes"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.cook && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <UtensilsCrossed className="w-3 h-3" /> {order.cook.name}
                        </span>
                      )}
                      {order.delivery?.driver && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {order.delivery.driver.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* === RECETTES === */}
      {tab === "revenue" && revenue && (
        <div className="space-y-4">
          {/* Cards recettes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Aujourd&apos;hui</p>
              <p className="text-lg font-bold text-green-400">{revenue.today.revenue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-600">FCFA - {revenue.today.orders} cmd</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Cette semaine</p>
              <p className="text-lg font-bold text-blue-400">{revenue.week.revenue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-600">FCFA - {revenue.week.orders} cmd</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Ce mois</p>
              <p className="text-lg font-bold text-purple-400">{revenue.month.revenue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-600">FCFA - {revenue.month.orders} cmd</p>
            </div>
          </div>

          {/* Repartition paiement */}
          {revenue.paymentBreakdown && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Repartition par mode de paiement</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Especes</p>
                  <p className="text-lg font-bold text-yellow-400">{(revenue.paymentBreakdown.cash?.revenue || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">{revenue.paymentBreakdown.cash?.count || 0} commandes</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">En ligne</p>
                  <p className="text-lg font-bold text-cyan-400">{(revenue.paymentBreakdown.online?.revenue || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">{revenue.paymentBreakdown.online?.count || 0} commandes</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats cuisine */}
          {revenue.cookStats && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Activite cuisine aujourd&apos;hui</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <UtensilsCrossed className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{revenue.cookStats.prepared || 0}</p>
                  <p className="text-[10px] text-gray-500">Preparees</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{revenue.cookStats.preparing || 0}</p>
                  <p className="text-[10px] text-gray-500">En cuisine</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{revenue.cookStats.ready || 0}</p>
                  <p className="text-[10px] text-gray-500">Pretes</p>
                </div>
              </div>
            </div>
          )}

          {/* Graphique 7 jours */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Recettes des 7 derniers jours</h3>
            <div className="flex items-end justify-between gap-2 h-40">
              {revenue.dailyRevenue?.map((day: any) => {
                const maxRevenue = Math.max(...revenue.dailyRevenue.map((d: any) => d.revenue), 1);
                const height = (day.revenue / maxRevenue) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[9px] text-gray-500">{day.revenue > 0 ? `${(day.revenue / 1000).toFixed(0)}k` : "0"}</p>
                    <div className="w-full bg-gray-800 rounded-t-lg relative" style={{ height: "120px" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">{day.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats globales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <Clock className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-lg font-bold text-white">{revenue.totals.pending}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <Truck className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-lg font-bold text-white">{revenue.totals.activeDeliveries}</p>
              <p className="text-xs text-gray-500">Livraisons en cours</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-lg font-bold text-white">{revenue.totals.deliveredToday}</p>
              <p className="text-xs text-gray-500">Livrees aujourd&apos;hui</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <ShoppingBag className="w-5 h-5 text-orange-400 mb-2" />
              <p className="text-lg font-bold text-white">{revenue.totals.orders}</p>
              <p className="text-xs text-gray-500">Total commandes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
