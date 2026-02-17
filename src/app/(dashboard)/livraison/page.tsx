"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, ShoppingBag, UtensilsCrossed,
  Plus, Minus, Search, X, Timer, Droplets, CreditCard, ChefHat,
  ChevronLeft, ChevronRight, MapPin, Truck, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCachedSettings } from "@/lib/settings-cache";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const AddressPickerMap = dynamic(() => import("@/components/map/address-picker-map"), { ssr: false });

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  shopName: string | null;
  image: string | null;
  cookingTimeMin: number;
  isExtra: boolean;
  effectivePrice?: number;
  originalPrice?: number;
  hasDiscount?: boolean;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SiteSettings {
  restaurantName: string;
  defaultPaymentMethod: string;
  deliveryFee: number;
  currency: string;
  buttonColor: string | null;
}

export default function CommanderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderStep, setOrderStep] = useState<"menu" | "extras" | "address" | "payment">("menu");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState(0);
  const [addressLng, setAddressLng] = useState(0);
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [imgCounter, setImgCounter] = useState(0);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      getCachedSettings(),
      fetch("/api/promotions").then((r) => r.json()).catch(() => []),
    ]).then(([prods, sett, promos]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setSettings(sett);
      const activePromos = Array.isArray(promos) ? promos : [];
      setPromotions(activePromos);
      setLoading(false);
      if (activePromos.length > 0) {
        try {
          const dismissed = sessionStorage.getItem("promo-dialog-dismissed");
          if (!dismissed) { setTimeout(() => setShowPromoDialog(true), 500); }
        } catch { setTimeout(() => setShowPromoDialog(true), 500); }
      }
    });
  }, []);

  // Auto-rotate promo images (3s)
  useEffect(() => {
    const interval = setInterval(() => setImgCounter((c) => c + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const meals = products.filter((p) => !p.isExtra);
  const extras = products.filter((p) => p.isExtra);

  const filteredMeals = meals.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (existing && existing.quantity > 1) return prev.map((i) => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter((i) => i.product.id !== productId);
    });
  }

  function getCartCount(productId: string) {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  }

  const mealItems = cart.filter((i) => !i.product.isExtra);
  const extraItems = cart.filter((i) => i.product.isExtra);
  const totalMeals = mealItems.reduce((s, i) => s + i.quantity, 0);
  const hasExtras = extras.length > 0;
  const deliveryFee = settings?.deliveryFee || 0;
  const subtotal = cart.reduce((s, i) => s + (i.product.effectivePrice ?? i.product.price) * i.quantity, 0);
  const total = subtotal + deliveryFee;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const adminMethod = settings?.defaultPaymentMethod || "CASH";

  type StepId = "extras" | "address" | "payment";
  const stepsList: { id: StepId; label: string }[] = [
    ...(hasExtras ? [{ id: "extras" as const, label: "Extras" }] : []),
    { id: "address" as const, label: "Adresse de livraison" },
    { id: "payment" as const, label: "Récapitulatif & Paiement" },
  ];
  const currentStepIndex = stepsList.findIndex((s) => s.id === orderStep);

  function nextStep() {
    if (orderStep === "menu") {
      setOrderStep(hasExtras ? "extras" : "address");
    } else if (currentStepIndex < stepsList.length - 1) {
      setOrderStep(stepsList[currentStepIndex + 1].id);
    }
  }
  function prevStep() {
    if (currentStepIndex <= 0) {
      setOrderStep("menu");
    } else {
      setOrderStep(stepsList[currentStepIndex - 1].id);
    }
  }

  const handleAddressSelect = useCallback((lat: number, lng: number, addr: string) => {
    setAddressLat(lat);
    setAddressLng(lng);
    setAddress(addr);
  }, []);

  async function placeOrder(method: "CASH" | "ONLINE") {
    if (!address || !addressLat || !addressLng) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          deliveryAddress: address,
          deliveryLat: addressLat,
          deliveryLng: addressLng,
          note,
          paymentMethod: method,
        }),
      });
      if (res.ok) {
        const order = await res.json();
        if (method === "ONLINE") {
          const payRes = await fetch("/api/payments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
          if (payRes.ok) {
            const { paymentUrl } = await payRes.json();
            if (paymentUrl) { window.location.href = paymentUrl; return; }
          }
        }
        toast.success("Commande passée avec succès !");
        setCart([]);
        setOrderStep("menu");
        router.push(`/track/${order.id}`);
      } else {
        toast.error("Erreur lors de la commande");
      }
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pb-24 brand-theme" style={{ "--brand": settings?.buttonColor || "#ea580c" } as React.CSSProperties}>
      <div className="sticky top-14 z-20 bg-gray-950 pb-3 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Commander</h2>
              <p className="text-xs text-gray-500">{meals.length} plat{meals.length > 1 ? "s" : ""} disponible{meals.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          <ChefHat className="w-6 h-6 text-orange-400" />
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>
      </div>

      {/* Grille repas */}
      {filteredMeals.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} message="Aucun plat trouvé" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredMeals.map((p) => {
            const count = getCartCount(p.id);
            return (
              <Card key={p.id} className="overflow-hidden" hover>
                <div className="relative h-32 sm:h-36 flex items-center justify-center bg-orange-600/20">
                  {p.image ? (
                    <img loading="lazy" decoding="async" src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="w-12 h-12 opacity-40 text-orange-400" />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                    <Timer className="w-3 h-3 text-orange-300" />
                    <span className="text-[9px] text-orange-300 font-medium">~{p.cookingTimeMin} min</span>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                  {p.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 [&_*]:!m-0 [&_*]:!p-0" dangerouslySetInnerHTML={{ __html: p.description }} />}
                  <div className="flex items-center justify-between mt-2">
                    {p.hasDiscount ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-green-400">{(p.effectivePrice ?? p.price).toLocaleString()} <span className="text-[9px] font-normal">FCFA</span></span>
                        <span className="text-[10px] text-gray-500 line-through">{p.price.toLocaleString()}</span>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></p>
                    )}
                    <div className="flex items-center gap-1.5">
                      {count > 0 && (
                        <>
                          <button onClick={() => removeFromCart(p.id)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-white font-bold w-4 text-center">{count}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(p)}
                        className="w-6 h-6 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Section Extras */}
      {extras.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-orange-400" /> Boissons & Extras
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {extras.map((p) => {
              const count = getCartCount(p.id);
              return (
                <Card key={p.id} className="flex-shrink-0 w-36 overflow-hidden" hover>
                  <div className="h-24 flex items-center justify-center bg-orange-600/10">
                    {p.image ? (
                      <img loading="lazy" decoding="async" src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Droplets className="w-8 h-8 opacity-40 text-orange-400" />
                    )}
                  </div>
                  <CardContent className="p-2">
                    <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                    <div className="flex items-center justify-between mt-1.5">
                      {p.hasDiscount ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-green-400">{(p.effectivePrice ?? p.price).toLocaleString()} F</span>
                          <span className="text-[9px] text-gray-500 line-through">{p.price.toLocaleString()}</span>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-orange-400">{p.price.toLocaleString()} F</p>
                      )}
                      <div className="flex items-center gap-1">
                        {count > 0 && (
                          <>
                            <button onClick={() => removeFromCart(p.id)} className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white">
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-[10px] text-white font-bold w-3 text-center">{count}</span>
                          </>
                        )}
                        <button onClick={() => addToCart(p)} className="w-5 h-5 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Barre panier fixe — seulement sur le menu */}
      {orderStep === "menu" && totalMeals > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 lg:bottom-0 lg:left-64 lg:pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCart([]); toast.info("Panier vidé"); }}
              className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl text-gray-400 transition-colors shadow-lg shrink-0"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={nextStep}
              className="flex-1 flex items-center justify-between py-3.5 px-5 bg-orange-600 hover:bg-orange-700 rounded-2xl text-white transition-colors shadow-lg">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm font-semibold">{totalMeals} Plat{totalMeals > 1 ? "s" : ""}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold">
                Suivant <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay multi-étapes */}
      {orderStep !== "menu" && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOrderStep("menu")} />

          <div className={cn("absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 flex flex-col", orderStep === "address" ? "h-[92vh]" : "max-h-[92vh]")}>
            {/* Header */}
            <div className="p-4 pb-3 border-b border-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevStep} className="flex items-center gap-1 text-gray-400 hover:text-gray-300 text-sm transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
                <p className="text-xs text-gray-500">
                  Étape {currentStepIndex + 1}/{stepsList.length}
                </p>
                <button onClick={() => setOrderStep("menu")} className="text-gray-400 hover:text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-1.5">
                {stepsList.map((step, i) => (
                  <div key={step.id} className={cn(
                    "h-1 rounded-full flex-1 transition-colors",
                    i <= currentStepIndex ? "bg-orange-500" : "bg-gray-700"
                  )} />
                ))}
              </div>
              <p className="text-white font-semibold text-sm mt-3">
                {stepsList[currentStepIndex]?.label}
              </p>
            </div>

            {/* Contenu scrollable */}
            <div className={cn("flex-1 min-h-0", orderStep === "address" ? "overflow-hidden relative" : "overflow-y-auto p-4")}>

              {/* Extras */}
              {orderStep === "extras" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Ajoutez des boissons ou accompagnements à votre commande (optionnel)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {extras.map((p) => {
                      const count = getCartCount(p.id);
                      return (
                        <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                          <div className="h-24 flex items-center justify-center bg-gray-800">
                            {p.image ? (
                              <img loading="lazy" decoding="async" src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Droplets className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-sm font-semibold text-white truncate">{p.name}</h4>
                            {p.description && <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 [&_*]:!m-0 [&_*]:!p-0" dangerouslySetInnerHTML={{ __html: p.description }} />}
                            <div className="flex items-center justify-between mt-2">
                              {p.hasDiscount ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-green-400">{(p.effectivePrice ?? p.price).toLocaleString()} <span className="text-[9px] font-normal">F</span></span>
                                  <span className="text-[9px] text-gray-500 line-through">{p.price.toLocaleString()}</span>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">F</span></p>
                              )}
                              <div className="flex items-center gap-1.5">
                                {count > 0 && (
                                  <>
                                    <button onClick={() => removeFromCart(p.id)} className="w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs text-white font-bold w-4 text-center">{count}</span>
                                  </>
                                )}
                                <button onClick={() => addToCart(p)} className="w-6 h-6 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Adresse (carte plein écran) */}
              {orderStep === "address" && (
                <div className="absolute inset-0">
                  <AddressPickerMap onSelect={handleAddressSelect} fullHeight />
                </div>
              )}

              {/* Récapitulatif & Paiement */}
              {orderStep === "payment" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Plats</p>
                    {mealItems.map((i) => (
                      <div key={i.product.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{i.quantity}× {i.product.name}</span>
                        <span className="text-gray-400">{((i.product.effectivePrice ?? i.product.price) * i.quantity).toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>

                  {extraItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Extras</p>
                      {extraItems.map((i) => (
                        <div key={i.product.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{i.quantity}× {i.product.name}</span>
                          <span className="text-gray-400">{((i.product.effectivePrice ?? i.product.price) * i.quantity).toLocaleString()} F</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-gray-800 pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Sous-total</span>
                      <span>{subtotal.toLocaleString()} F</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Livraison</span>
                        <span>{deliveryFee.toLocaleString()} F</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-white pt-1">
                      <span>Total</span>
                      <span>{total.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  {address && (
                    <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Livraison</p>
                      <div className="flex items-start gap-2 text-sm text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{address}</span>
                      </div>
                      {note && (
                        <p className="text-xs text-gray-500 italic mt-1">&quot;{note}&quot;</p>
                      )}
                    </div>
                  )}

                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note pour la commande (optionnel)"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-orange-500" />
                </div>
              )}
            </div>

            {/* Footer — boutons d'action */}
            <div className="p-4 border-t border-gray-800/50">
              {orderStep === "extras" && (
                <button onClick={nextStep}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {orderStep === "address" && (
                <button onClick={nextStep} disabled={!address || !addressLat || !addressLng}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Confirmer l&apos;adresse <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {orderStep === "payment" && (
                <div className="space-y-2">
                  {adminMethod === "CASH" && (
                    <button onClick={() => placeOrder("CASH")} disabled={ordering}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                      {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                      Commander — {total.toLocaleString()} FCFA
                    </button>
                  )}
                  {adminMethod === "ONLINE" && (
                    <button onClick={() => placeOrder("ONLINE")} disabled={ordering}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                      {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Payer via MTN MoMo — {total.toLocaleString()} FCFA
                    </button>
                  )}
                  {adminMethod === "BOTH" && (
                    <>
                      <button onClick={() => placeOrder("CASH")} disabled={ordering}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                        {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                        Payer à la livraison — {total.toLocaleString()} FCFA
                      </button>
                      <button onClick={() => placeOrder("ONLINE")} disabled={ordering}
                        className="w-full py-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                        {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Payer via MTN MoMo — {total.toLocaleString()} FCFA
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog Promotions */}
      {showPromoDialog && promotions.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => { setShowPromoDialog(false); try { sessionStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowPromoDialog(false); try { sessionStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-0">
              {promotions.map((promo: any, idx: number) => {
                const promoImgs = (() => { if (!promo.image) return []; try { const p = JSON.parse(promo.image); return Array.isArray(p) ? p : [promo.image]; } catch { return [promo.image]; } })();
              const fallbackImg = !promo.appliesToAll && promo.products?.length === 1 ? promo.products[0]?.product?.image : null;
              const allImgs = promoImgs.length > 0 ? promoImgs : fallbackImg ? [fallbackImg] : [];
              const currentImg = allImgs.length > 0 ? allImgs[imgCounter % allImgs.length] : null;
                return (
                  <div key={promo.id} className={cn(idx > 0 && "border-t border-gray-800")}>
                    {currentImg && (
                      <div className="relative">
                        <img loading="lazy" decoding="async" src={currentImg} alt={promo.name} className="w-full aspect-[16/9] object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                        {allImgs.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {allImgs.map((_: any, i: number) => (
                              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors", i === imgCounter % allImgs.length ? "bg-orange-500" : "bg-white/40")} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn("px-5 pb-5", currentImg ? "-mt-8 relative z-10" : "pt-5")}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                          -{promo.discountValue}{promo.discountType === "PERCENTAGE" ? "%" : " FCFA"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Jusqu&apos;au {new Date(promo.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">{promo.name}</h3>
                      {promo.description && (
                        <div className="text-sm text-gray-400 [&_*]:!m-0 [&_*]:!p-0" dangerouslySetInnerHTML={{ __html: promo.description }} />
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {promo.appliesToAll ? "Sur tous les repas et extras" : `Sur ${promo.products?.length || 0} repas`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-800">
              <button onClick={() => { setShowPromoDialog(false); try { sessionStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors">
                C&apos;est compris !
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
