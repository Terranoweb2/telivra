"use client";

import { useEffect, useState, useRef } from "react";
import {
  Loader2, Package, Plus, Trash2, ShoppingBag, TrendingUp,
  Clock, CheckCircle, Truck, XCircle, Store,
  UtensilsCrossed, ShoppingCart, Pill, Smartphone,
  Timer, Droplets, CreditCard, Edit2, X, Save,
  ImageIcon, Link2, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered, StatCardBadge } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog } from "@/components/ui/dialog";

type Tab = "products" | "orders" | "revenue";
type ProductFilter = "all" | "meals" | "extras";
type ImageMode = "link" | "upload";
type DialogMode = "add" | "edit";

const categoryConfig: Record<string, { label: string; icon: any }> = {
  RESTAURANT: { label: "Restaurant", icon: UtensilsCrossed },
  GROCERY: { label: "Epicerie", icon: ShoppingCart },
  PHARMACY: { label: "Pharmacie", icon: Pill },
  ELECTRONICS: { label: "Electronique", icon: Smartphone },
  OTHER: { label: "Autre", icon: Package },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  ACCEPTED: { label: "Acceptee", color: "bg-orange-500/20 text-orange-400" },
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

const inputClass = "px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");

  // Dialog ajout/édition
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", image: "",
    cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH",
  });
  const [saving, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function resetForm() {
    setForm({ name: "", description: "", price: "", image: "", cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH" });
    setImagePreview(null);
    setImageMode("upload");
    setEditProductId(null);
    setDialogMode("add");
  }

  function openAddDialog() {
    resetForm();
    setShowDialog(true);
  }

  function openEditDialog(product: any) {
    setDialogMode("edit");
    setEditProductId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price || ""),
      image: product.image || "",
      cookingTimeMin: String(product.cookingTimeMin || 15),
      isExtra: product.isExtra || false,
      paymentMethod: product.paymentMethod || "BOTH",
    });
    if (product.image) {
      setImagePreview(product.image);
      setImageMode(product.image.startsWith("/uploads/") ? "upload" : "link");
    } else {
      setImagePreview(null);
      setImageMode("upload");
    }
    setShowDialog(true);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setForm((prev) => ({ ...prev, image: url }));
        setImagePreview(url);
        toast.success("Image importée");
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Erreur lors de l'import");
      }
    } catch {
      toast.error("Erreur réseau");
    }
    setUploading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    handleFileUpload(file);
  }

  function handleImageUrlChange(url: string) {
    setForm((prev) => ({ ...prev, image: url }));
    if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  async function addProduct() {
    if (!form.name || !form.price) return;
    setSaving(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        image: form.image,
        cookingTimeMin: parseInt(form.cookingTimeMin) || 15,
        isExtra: form.isExtra,
        paymentMethod: form.paymentMethod,
        category: "RESTAURANT",
        shopName: "Restaurant",
        isAvailable: true,
      }),
    });
    if (res.ok) {
      const p = await res.json();
      setProducts((prev) => [p, ...prev]);
      resetForm();
      setShowDialog(false);
      toast.success("Repas ajouté");
    } else {
      toast.error("Erreur lors de l'ajout");
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editProductId || !form.name || !form.price) return;
    setSaving(true);
    const res = await fetch(`/api/products/${editProductId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        image: form.image,
        cookingTimeMin: parseInt(form.cookingTimeMin) || 15,
        isExtra: form.isExtra,
        paymentMethod: form.paymentMethod,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => p.id === editProductId ? updated : p));
      resetForm();
      setShowDialog(false);
      toast.success("Repas modifié");
    } else {
      toast.error("Erreur lors de la modification");
    }
    setSaving(false);
  }

  function handleDialogSubmit() {
    if (dialogMode === "edit") {
      saveEdit();
    } else {
      addProduct();
    }
  }

  async function deleteProduct(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Repas supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const tabItems: { key: Tab; label: string }[] = [
    { key: "products", label: "Repas" },
    { key: "orders", label: "Commandes" },
    { key: "revenue", label: "Recettes" },
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
      <PageHeader title="Repas" subtitle="Gérez vos repas, commandes et recettes">
        {tab === "products" && (
          <button onClick={openAddDialog}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        )}
      </PageHeader>

      {/* Onglets */}
      <TabGroup
        tabs={tabItems}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {/* === REPAS === */}
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

          {/* Liste par boutique */}
          {shops.map((shop) => {
            const shopProducts = filteredProducts.filter((p) => p.shopName === shop);
            return (
              <div key={shop}>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-white">{shop}</h3>
                  <span className="text-xs text-gray-600">{shopProducts.length} repas</span>
                </div>
                <div className="space-y-2">
                  {shopProducts.map((p) => {
                    const cat = categoryConfig[p.category] || categoryConfig.OTHER;
                    const CatIcon = cat.icon;

                    return (
                      <Card key={p.id}>
                        <CardContent className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                            {p.image ? <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <CatIcon className="w-5 h-5 text-gray-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">{p.name}</p>
                              {p.isExtra && (
                                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded font-medium flex items-center gap-0.5">
                                  <Droplets className="w-2.5 h-2.5" /> Extra
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{p.price?.toLocaleString()} FCFA</span>
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
                          <button onClick={() => openEditDialog(p)}
                            className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteProduct(p.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <EmptyState icon={UtensilsCrossed} message="Aucun repas" />
          )}
        </div>
      )}

      {/* === COMMANDES === */}
      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} message="Aucune commande" />
          ) : (
            orders.slice(0, 50).map((order: any) => {
              const st = statusLabels[order.status] || statusLabels.PENDING;
              return (
                <Card key={order.id}>
                  <CardContent>
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
                  </CardContent>
                </Card>
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
            <StatCardCentered
              icon={TrendingUp}
              value={`${revenue.today.revenue.toLocaleString()}`}
              label={`Aujourd\u2019hui - ${revenue.today.orders} cmd`}
              color="green"
            />
            <StatCardCentered
              icon={TrendingUp}
              value={`${revenue.week.revenue.toLocaleString()}`}
              label={`Cette semaine - ${revenue.week.orders} cmd`}
              color="orange"
            />
            <StatCardCentered
              icon={TrendingUp}
              value={`${revenue.month.revenue.toLocaleString()}`}
              label={`Ce mois - ${revenue.month.orders} cmd`}
              color="purple"
            />
          </div>

          {/* Repartition paiement */}
          {revenue.paymentBreakdown && (
            <Card>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Stats cuisine */}
          {revenue.cookStats && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-3">Activite cuisine aujourd&apos;hui</h3>
                <div className="grid grid-cols-3 gap-3">
                  <StatCardBadge
                    icon={UtensilsCrossed}
                    value={revenue.cookStats.prepared || 0}
                    label="Preparees"
                    color="orange"
                  />
                  <StatCardBadge
                    icon={Clock}
                    value={revenue.cookStats.preparing || 0}
                    label="En cuisine"
                    color="yellow"
                  />
                  <StatCardBadge
                    icon={CheckCircle}
                    value={revenue.cookStats.ready || 0}
                    label="Pretes"
                    color="green"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Graphique 7 jours */}
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Stats globales */}
          <div className="grid grid-cols-2 gap-3">
            <StatCardBadge
              icon={Clock}
              value={revenue.totals.pending}
              label="En attente"
              color="yellow"
            />
            <StatCardBadge
              icon={Truck}
              value={revenue.totals.activeDeliveries}
              label="Livraisons en cours"
              color="purple"
            />
            <StatCardBadge
              icon={CheckCircle}
              value={revenue.totals.deliveredToday}
              label="Livrees aujourd&apos;hui"
              color="green"
            />
            <StatCardBadge
              icon={ShoppingBag}
              value={revenue.totals.orders}
              label="Total commandes"
              color="orange"
            />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Dialog Ajout / Édition de repas              */}
      {/* ============================================ */}
      <Dialog open={showDialog} onClose={() => { setShowDialog(false); resetForm(); }} title={dialogMode === "edit" ? "Modifier le repas" : "Nouveau repas"}>
        <div className="space-y-4">
          {/* Nom et Prix */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nom *</label>
              <input type="text" placeholder="Ex: Riz au poulet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Prix (FCFA) *</label>
              <input type="number" placeholder="2500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputClass + " w-full"} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <input type="text" placeholder="Description du repas (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass + " w-full"} />
          </div>

          {/* Temps cuisson, Paiement, Extra */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cuisson (min)</label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input type="number" min="1" value={form.cookingTimeMin}
                  onChange={(e) => setForm({ ...form, cookingTimeMin: e.target.value })}
                  className={inputClass + " w-full pl-9"} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Paiement</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={inputClass + " w-full"}>
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
                  <Droplets className="w-3.5 h-3.5 text-orange-400" /> Extra
                </span>
              </label>
            </div>
          </div>

          {/* Image — toggle Upload / Lien */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Image</label>
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                <button type="button" onClick={() => { setImageMode("upload"); setImagePreview(null); setForm((p) => ({ ...p, image: "" })); }}
                  className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                    imageMode === "upload" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-gray-300")}>
                  <Upload className="w-3 h-3" /> Importer
                </button>
                <button type="button" onClick={() => { setImageMode("link"); setImagePreview(null); setForm((p) => ({ ...p, image: "" })); }}
                  className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                    imageMode === "link" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-gray-300")}>
                  <Link2 className="w-3 h-3" /> Lien URL
                </button>
              </div>
            </div>

            {imageMode === "upload" ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-6 border-2 border-dashed border-gray-700 hover:border-orange-500/50 rounded-xl text-gray-400 hover:text-gray-300 transition-colors flex flex-col items-center gap-2">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                  <span className="text-xs">{uploading ? "Import en cours..." : "Cliquez pour importer une image"}</span>
                  <span className="text-[10px] text-gray-600">JPG, PNG, WebP, GIF (5MB max)</span>
                </button>
              </div>
            ) : (
              <input type="text" placeholder="https://exemple.com/image.jpg" value={form.image}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                className={inputClass + " w-full"} />
            )}

            {/* Preview */}
            {imagePreview && (
              <div className="mt-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-[150px] h-[100px] object-cover rounded-lg border border-gray-700"
                  onError={() => setImagePreview(null)}
                />
                <button type="button" onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: "" })); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Bouton soumettre */}
          <button onClick={handleDialogSubmit} disabled={saving || !form.name || !form.price}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dialogMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {dialogMode === "edit" ? "Enregistrer les modifications" : "Ajouter le repas"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
