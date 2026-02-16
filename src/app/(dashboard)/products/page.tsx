"use client";

import { useEffect, useState, useRef } from "react";
import {
  Loader2, Package, Plus, Trash2, ShoppingBag, TrendingUp,
  Clock, CheckCircle, Truck, XCircle, Store, Search,
  UtensilsCrossed, ShoppingCart, Pill, Smartphone,
  Timer, Droplets, CreditCard, Edit2, X, Save,
  ImageIcon, Link2, Upload, Bold, Italic, Underline, List,
  Percent, Calendar, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { orderStatusLabels, paymentMethodLabels } from "@/lib/order-status";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered, StatCardBadge } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StarRating } from "@/components/ui/star-rating";
import { Dialog } from "@/components/ui/dialog";

type Tab = "products" | "orders" | "revenue" | "promotions";
type ProductFilter = "all" | "meals" | "extras";
type ImageMode = "link" | "upload";
type DialogMode = "add" | "edit";
type OrderFilter = "all" | "PENDING" | "PREPARING" | "READY" | "DELIVERING" | "DELIVERED" | "CANCELLED";

const categoryConfig: Record<string, { label: string; icon: any }> = {
  RESTAURANT: { label: "Restaurant", icon: UtensilsCrossed },
  GROCERY: { label: "Epicerie", icon: ShoppingCart },
  PHARMACY: { label: "Pharmacie", icon: Pill },
  ELECTRONICS: { label: "Électronique", icon: Smartphone },
  OTHER: { label: "Autre", icon: Package },
};

const inputClass = "px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500";

const ORDERS_PER_PAGE = 20;
const PRODUCTS_PER_PAGE = 18;

function RichTextArea({ initialValue, onChange }: { initialValue: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    ref.current?.focus();
    if (ref.current) {
      const html = ref.current.innerHTML;
      onChange(html === "<br>" ? "" : html);
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800 focus-within:border-orange-500/50 transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-700">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Gras">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Italique">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Souligne">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-700 mx-1" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Liste">
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] max-h-[200px] overflow-y-auto px-3 py-2.5 text-white text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_b]:font-bold [&_i]:italic [&_u]:underline"
        onInput={() => {
          if (ref.current) {
            const html = ref.current.innerHTML;
            onChange(html === "<br>" ? "" : html);
          }
        }}
      />
    </div>
  );
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [productPage, setProductPage] = useState(1);

  // Commandes: filtre + recherche + pagination
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);

  // Dialog ajout/edition
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", image: "",
    cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH",
    category: "RESTAURANT", discountPercent: "", discountAmount: "",
  });

  // Promotions
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [promoDialogMode, setPromoDialogMode] = useState<DialogMode>("add");
  const [editPromoId, setEditPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    name: "", description: "", image: "",
    discountType: "PERCENTAGE", discountValue: "",
    startDate: "", endDate: "",
    isActive: true, appliesToAll: true,
    productIds: [] as string[],
  });
  const [promoImagePreview, setPromoImagePreview] = useState<string | null>(null);
  const [promoImageMode, setPromoImageMode] = useState<ImageMode>("upload");
  const promoFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Reset page quand filtre change
  useEffect(() => { setOrderPage(1); }, [orderFilter, orderSearch]);
  useEffect(() => { setProductPage(1); }, [productFilter]);

  function loadData() {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/stats/revenue").then((r) => r.json()),
      fetch("/api/promotions?all=true").then((r) => r.json()),
    ]).then(([p, o, r, promos]) => {
      setProducts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setRevenue(r);
      setPromotions(Array.isArray(promos) ? promos : []);
      setLoading(false);
    });
  }

  function refreshProducts() {
    fetch("/api/products").then((r) => r.json()).then((p) => {
      setProducts(Array.isArray(p) ? p : []);
    });
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "", image: "", cookingTimeMin: "15", isExtra: false, paymentMethod: "BOTH", category: "RESTAURANT", discountPercent: "", discountAmount: "" });
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
      category: product.category || "RESTAURANT",
      discountPercent: product.discountPercent ? String(product.discountPercent) : "",
      discountAmount: product.discountAmount ? String(product.discountAmount) : "",
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
        category: form.category,
        shopName: "Restaurant",
        isAvailable: true,
      }),
    });
    if (res.ok) {
      resetForm();
      setShowDialog(false);
      toast.success("Repas ajouté");
      refreshProducts();
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
        category: form.category,
      }),
    });
    if (res.ok) {
      resetForm();
      setShowDialog(false);
      toast.success("Repas modifié");
      refreshProducts();
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

  function confirmDeleteProduct(id: string, name: string) {
    toast.warning(`Supprimer "${name}" ?`, {
      description: "Cette action est irreversible",
      action: { label: "Supprimer", onClick: () => deleteProduct(id) },
      cancel: { label: "Annuler", onClick: () => {} },
    });
  }


  // ── Promotions helpers ──
  function resetPromoForm() {
    setPromoForm({ name: "", description: "", image: "", discountType: "PERCENTAGE", discountValue: "", startDate: "", endDate: "", isActive: true, appliesToAll: true, productIds: [] });
    setPromoImagePreview(null);
    setPromoImageMode("upload");
    setEditPromoId(null);
    setPromoDialogMode("add");
  }

  function openEditPromo(promo: any) {
    setPromoDialogMode("edit");
    setEditPromoId(promo.id);
    setPromoForm({
      name: promo.name || "", description: promo.description || "", image: promo.image || "",
      discountType: promo.discountType || "PERCENTAGE", discountValue: String(promo.discountValue || ""),
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : "",
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : "",
      isActive: promo.isActive !== false, appliesToAll: promo.appliesToAll === true,
      productIds: promo.products?.map((pp: any) => pp.productId || pp.product?.id) || [],
    });
    if (promo.image) { setPromoImagePreview(promo.image); setPromoImageMode(promo.image.startsWith("/uploads/") ? "upload" : "link"); }
    else { setPromoImagePreview(null); setPromoImageMode("upload"); }
    setShowPromoDialog(true);
  }

  async function handlePromoFileUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const { url } = await res.json(); setPromoForm((prev) => ({ ...prev, image: url })); toast.success("Image importée"); }
      else { const err = await res.json().catch(() => null); toast.error(err?.error || "Erreur import"); }
    } catch { toast.error("Erreur réseau"); }
    setUploading(false);
  }

  async function handlePromoSubmit() {
    if (!promoForm.name || !promoForm.discountValue || !promoForm.startDate || !promoForm.endDate) { toast.error("Remplissez les champs requis"); return; }
    setSaving(true);
    try {
      const body = { ...promoForm, discountValue: parseFloat(promoForm.discountValue) };
      const url = promoDialogMode === "edit" ? `/api/promotions/${editPromoId}` : "/api/promotions";
      const method = promoDialogMode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(promoDialogMode === "edit" ? "Promotion modifiée" : "Promotion créée");
        setShowPromoDialog(false); resetPromoForm(); loadData();
      } else { const err = await res.json().catch(() => null); toast.error(err?.error || "Erreur"); }
    } catch { toast.error("Erreur réseau"); }
    setSaving(false);
  }

  async function deletePromo(id: string, name: string) {
    if (!confirm(`Supprimer la promotion "${name}" ?`)) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Promotion supprimée"); loadData(); }
      else toast.error("Erreur");
    } catch { toast.error("Erreur réseau"); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const tabItems: { key: Tab; label: string }[] = [
    { key: "products", label: "Repas" },
    { key: "promotions", label: "Promotions" },
    { key: "orders", label: "Commandes" },
    { key: "revenue", label: "Recettes" },
  ];

  // Filtrer produits
  const filteredProducts = products.filter((p) => {
    if (productFilter === "meals") return !p.isExtra;
    if (productFilter === "extras") return p.isExtra;
    return true;
  });

  const mealsCount = products.filter((p) => !p.isExtra).length;
  const extrasCount = products.filter((p) => p.isExtra).length;
  const totalProductPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);

  // Filtrer commandes
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      const clientName = (o.client?.name || o.guestName || "").toLowerCase();
      const orderId = o.id.toLowerCase();
      if (!clientName.includes(q) && !orderId.includes(q)) return false;
    }
    return true;
  });
  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);

  return (
    <div className="space-y-4">
      <PageHeader title="Repas" subtitle="Gérez vos repas, commandes et recettes">
        {tab === "products" && (
          <button onClick={openAddDialog}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        )}
        {tab === "promotions" && (
          <button onClick={() => { resetPromoForm(); setShowPromoDialog(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
            <Plus className="w-4 h-4" /> Nouvelle Promo
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

          {/* Grille produits */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {paginatedProducts.map((p) => {
              const cat = categoryConfig[p.category] || categoryConfig.OTHER;
              const CatIcon = cat.icon;

              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-2 p-2.5">
                    {/* Image + badge */}
                    <div className="relative">
                      <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <CatIcon className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      {p.isExtra && (
                        <span className="absolute top-1 right-1 px-1 py-0.5 bg-orange-500/90 text-white text-[9px] rounded font-medium flex items-center gap-0.5">
                          <Droplets className="w-2 h-2" /> Extra
                        </span>
                      )}
                    </div>
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      {p.hasDiscount ? (
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-green-400">{p.effectivePrice?.toLocaleString()} F</span>
                          <span className="text-[10px] text-gray-500 line-through">{p.originalPrice?.toLocaleString()} F</span>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-orange-400 mt-0.5">{p.price?.toLocaleString()} F</p>
                      )}
                      {p.averageRating > 0 && (
                        <StarRating value={p.averageRating} size="sm" showValue count={p.ratingCount} className="mt-0.5" />
                      )}
                      {!p.isExtra && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                          <Timer className="w-2.5 h-2.5" /> {p.cookingTimeMin || 15}min
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1.5 border-t border-gray-800">
                      <button onClick={() => openEditDialog(p)}
                        className="flex-1 flex items-center justify-center py-1 text-xs text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => confirmDeleteProduct(p.id, p.name)}
                        className="flex-1 flex items-center justify-center py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <EmptyState icon={UtensilsCrossed} message="Aucun repas" />
          )}

          {/* Pagination produits */}
          {totalProductPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                disabled={productPage === 1}
                className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Précédent
              </button>
              <span className="text-xs text-gray-500">
                Page {productPage} / {totalProductPages} ({filteredProducts.length} repas)
              </span>
              <button
                onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                disabled={productPage === totalProductPages}
                className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}


      {/* === PROMOTIONS === */}
      {tab === "promotions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCardCentered value={promotions.filter((p: any) => p.isActive && new Date(p.startDate) <= new Date() && new Date(p.endDate) >= new Date()).length} label="Actives" color="green" />
            <StatCardCentered value={promotions.filter((p: any) => new Date(p.endDate) >= new Date()).length} label="En cours" color="orange" />
            <StatCardCentered value={promotions.length} label="Total" color="purple" />
          </div>

          {promotions.length === 0 ? (
            <EmptyState icon={Percent} message="Aucune promotion" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {promotions.map((promo: any) => {
                const isExpired = new Date(promo.endDate) < new Date();
                const isUpcoming = new Date(promo.startDate) > new Date();
                return (
                  <Card key={promo.id}>
                    <CardContent className="p-3 space-y-2">
                      {promo.image && <img src={promo.image} alt={promo.name} className="w-full h-32 object-cover rounded-lg" />}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{promo.name}</p>
                          <p className="text-xs text-orange-400 font-bold">-{promo.discountValue}{promo.discountType === "PERCENTAGE" ? "%" : " FCFA"}</p>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium",
                          isExpired ? "bg-red-500/20 text-red-400" : isUpcoming ? "bg-blue-500/20 text-blue-400" : promo.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                        )}>{isExpired ? "Expirée" : isUpcoming ? "À venir" : promo.isActive ? "Active" : "Inactive"}</span>
                      </div>
                      {promo.description && <p className="text-[10px] text-gray-500 line-clamp-2">{promo.description}</p>}
                      <p className="text-[10px] text-gray-500">{new Date(promo.startDate).toLocaleDateString("fr-FR")} → {new Date(promo.endDate).toLocaleDateString("fr-FR")}</p>
                      <p className="text-[10px] text-gray-500">{promo.appliesToAll ? "Tous les produits" : `${promo.products?.length || 0} produit(s)`}</p>
                      <div className="flex items-center gap-1 pt-1.5 border-t border-gray-800">
                        <button onClick={() => openEditPromo(promo)} className="flex-1 flex items-center justify-center py-1 text-xs text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => deletePromo(promo.id, promo.name)} className="flex-1 flex items-center justify-center py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === COMMANDES === */}
      {tab === "orders" && (
        <div className="space-y-3">
          {/* Recherche + filtres */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Rechercher par client ou ID..."
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as OrderFilter)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="all">Tous les statuts ({orders.length})</option>
              {Object.entries(orderStatusLabels).map(([key, val]) => {
                const count = orders.filter((o) => o.status === key).length;
                return count > 0 ? <option key={key} value={key}>{val.label} ({count})</option> : null;
              })}
            </select>
          </div>

          {/* Liste */}
          {paginatedOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} message="Aucune commande trouvée" />
          ) : (
            paginatedOrders.map((order: any) => {
              const st = orderStatusLabels[order.status] || orderStatusLabels.PENDING;
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
                            {order.paymentStatus === "PAID" ? "Payé" : "En attente"}
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
                          {order.paymentMethod === "ONLINE" ? "En ligne" : "Espèces"}
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

          {/* Pagination */}
          {totalOrderPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                disabled={orderPage === 1}
                className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Précédent
              </button>
              <span className="text-xs text-gray-500">
                Page {orderPage} / {totalOrderPages} ({filteredOrders.length} résultats)
              </span>
              <button
                onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                disabled={orderPage === totalOrderPages}
                className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                Suivant
              </button>
            </div>
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
                    <p className="text-xs text-gray-400 mb-1">Espèces</p>
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
                <h3 className="text-sm font-semibold text-white mb-3">Activité cuisine aujourd&apos;hui</h3>
                <div className="grid grid-cols-3 gap-3">
                  <StatCardBadge icon={UtensilsCrossed} value={revenue.cookStats.prepared || 0} label="Préparées" color="orange" />
                  <StatCardBadge icon={Clock} value={revenue.cookStats.preparing || 0} label="En cuisine" color="yellow" />
                  <StatCardBadge icon={CheckCircle} value={revenue.cookStats.ready || 0} label="Prêtes" color="green" />
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
            <StatCardBadge icon={Clock} value={revenue.totals.pending} label="En attente" color="yellow" />
            <StatCardBadge icon={Truck} value={revenue.totals.activeDeliveries} label="Livraisons en cours" color="purple" />
            <StatCardBadge icon={CheckCircle} value={revenue.totals.deliveredToday} label="Livrées aujourd&apos;hui" color="green" />
            <StatCardBadge icon={ShoppingBag} value={revenue.totals.orders} label="Total commandes" color="orange" />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Dialog Ajout / Edition de repas              */}
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
            <RichTextArea
              key={editProductId || "add"}
              initialValue={form.description}
              onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
            />
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
                <option value="CASH">Espèces</option>
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
                <button type="button" onClick={() => setImageMode("upload")}
                  className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                    imageMode === "upload" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-gray-300")}>
                  <Upload className="w-3 h-3" /> Importer
                </button>
                <button type="button" onClick={() => setImageMode("link")}
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
                />
                <button type="button" onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: "" })); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Bouton soumettre */}
                    {/* Remise individuelle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Remise (%)</label>
              <input type="number" min="0" max="100" placeholder="Ex: 15" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Remise fixe (FCFA)</label>
              <input type="number" min="0" placeholder="Ex: 500" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} className={inputClass + " w-full"} />
            </div>
          </div>
          <p className="text-[10px] text-gray-600">Si les deux sont remplis, le montant fixe est prioritaire</p>

          <button onClick={handleDialogSubmit} disabled={saving || !form.name || !form.price}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dialogMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {dialogMode === "edit" ? "Enregistrer les modifications" : "Ajouter le repas"}
          </button>
        </div>
      </Dialog>
      {/* Dialog Promotion */}
      <Dialog open={showPromoDialog} onClose={() => { setShowPromoDialog(false); resetPromoForm(); }} title={promoDialogMode === "edit" ? "Modifier la promotion" : "Nouvelle promotion"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nom *</label>
            <input type="text" placeholder="Ex: Promo weekend" value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} className={inputClass + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea placeholder="Description..." value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} className={inputClass + " w-full min-h-[80px] resize-none"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type de remise</label>
              <select value={promoForm.discountType} onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })} className={inputClass + " w-full"}>
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED">Montant fixe (FCFA)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Valeur {promoForm.discountType === "PERCENTAGE" ? "(%)" : "(FCFA)"}</label>
              <input type="number" placeholder={promoForm.discountType === "PERCENTAGE" ? "15" : "500"} value={promoForm.discountValue} onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })} className={inputClass + " w-full"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date début *</label>
              <input type="datetime-local" value={promoForm.startDate} onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })} className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date fin *</label>
              <input type="datetime-local" value={promoForm.endDate} onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })} className={inputClass + " w-full"} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={promoForm.isActive} onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm text-gray-300">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={promoForm.appliesToAll} onChange={(e) => setPromoForm({ ...promoForm, appliesToAll: e.target.checked })} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm text-gray-300">Appliquer à tous les produits</span>
          </label>
          {!promoForm.appliesToAll && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Produits concernés</label>
              <div className="max-h-40 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 p-2 space-y-1">
                {products.map((pr: any) => (
                  <label key={pr.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-gray-700">
                    <input type="checkbox" checked={promoForm.productIds.includes(pr.id)} onChange={(e) => setPromoForm((prev) => ({ ...prev, productIds: e.target.checked ? [...prev.productIds, pr.id] : prev.productIds.filter((id) => id !== pr.id) }))} className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-orange-500" />
                    <span className="text-xs text-gray-300">{pr.name}</span>
                    <span className="text-[10px] text-gray-500 ml-auto">{pr.price} F</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Bannière promotionnelle</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setPromoImageMode("upload")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", promoImageMode === "upload" ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" : "bg-gray-800 text-gray-400 border border-gray-700")}>
                <Upload className="w-3 h-3" /> Upload
              </button>
              <button type="button" onClick={() => setPromoImageMode("link")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", promoImageMode === "link" ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" : "bg-gray-800 text-gray-400 border border-gray-700")}>
                <Link2 className="w-3 h-3" /> Lien URL
              </button>
            </div>
            {promoImageMode === "upload" ? (
              <div>
                <input ref={promoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setPromoImagePreview(URL.createObjectURL(file)); handlePromoFileUpload(file); } }} />
                <button type="button" onClick={() => promoFileRef.current?.click()} className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 text-xs hover:border-orange-500/50 transition-colors">
                  {uploading ? "Import en cours..." : "Cliquez pour choisir une image"}
                </button>
              </div>
            ) : (
              <input type="text" placeholder="https://..." value={promoForm.image} onChange={(e) => { setPromoForm((prev) => ({ ...prev, image: e.target.value })); if (e.target.value) setPromoImagePreview(e.target.value); }} className={inputClass + " w-full"} />
            )}
            {(promoImagePreview || promoForm.image) && (
              <img src={promoImagePreview || promoForm.image} alt="Preview" className="mt-2 w-full h-24 object-cover rounded-lg border border-gray-700" />
            )}
          </div>
          <button onClick={handlePromoSubmit} disabled={saving || !promoForm.name || !promoForm.discountValue || !promoForm.startDate || !promoForm.endDate}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : promoDialogMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {promoDialogMode === "edit" ? "Enregistrer" : "Créer la promotion"}
          </button>
        </div>
      </Dialog>

    </div>
  );
}
