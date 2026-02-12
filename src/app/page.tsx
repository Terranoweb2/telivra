"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ShoppingBag, MapPin, CreditCard,
  Search, Plus, Minus, X, Loader2,
  ClipboardList, LogIn,
  UtensilsCrossed,
  ArrowDown, Phone, User, Timer, Droplets,
  Sun, Moon, Clock, Truck,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

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
}

type OrderStep = "menu" | "extras" | "info" | "payment";

export default function LandingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderStep, setOrderStep] = useState<OrderStep>("menu");

  // Guest info
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState(0);
  const [addressLng, setAddressLng] = useState(0);
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()).catch(() => null),
    ]).then(([prods, sett]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setSettings(sett);
      setLoading(false);
    });
  }, []);

  const meals = products.filter((p) => !p.isExtra);
  const extras = products.filter((p) => p.isExtra);
  const hasExtras = extras.length > 0;

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

  // Cart computed
  const mealItems = cart.filter((i) => !i.product.isExtra);
  const extraItems = cart.filter((i) => i.product.isExtra);
  const totalMeals = mealItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = settings?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  // Step navigation
  const stepsList: { id: OrderStep; label: string }[] = [
    ...(hasExtras ? [{ id: "extras" as const, label: "Suppléments" }] : []),
    { id: "info" as const, label: "Livraison" },
    { id: "payment" as const, label: "Paiement" },
  ];
  const currentStepIndex = stepsList.findIndex((s) => s.id === orderStep);

  function nextStep() {
    if (orderStep === "menu") {
      setOrderStep(hasExtras ? "extras" : "info");
    } else if (currentStepIndex < stepsList.length - 1) {
      setOrderStep(stepsList[currentStepIndex + 1].id);
    }
  }

  function prevStep() {
    if (currentStepIndex === 0) {
      setOrderStep("menu");
    } else if (currentStepIndex > 0) {
      setOrderStep(stepsList[currentStepIndex - 1].id);
    }
  }

  // Admin payment method
  const adminMethod = settings?.defaultPaymentMethod || "CASH";

  const handleAddressSelect = useCallback((lat: number, lng: number, addr: string) => {
    setAddressLat(lat);
    setAddressLng(lng);
    setAddress(addr);
  }, []);

  const infoValid = guestName.trim() && guestPhone.trim() && address && addressLat && addressLng;

  async function placeOrder(method: "CASH" | "ONLINE") {
    if (!infoValid) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/orders/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          deliveryAddress: address,
          deliveryLat: addressLat,
          deliveryLng: addressLng,
          note,
          guestName,
          guestPhone,
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
        setCart([]);
        setOrderStep("menu");
        router.push(`/track/${order.id}`);
      }
    } finally {
      setOrdering(false);
    }
  }

  const { theme, setTheme } = useTheme();
  const restaurantName = settings?.restaurantName || "Terrano";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              {restaurantName}
            </span>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-white">
          Savourez nos plats,
          <br />
          livrés chez vous
        </h1>
        <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
          Découvrez notre menu et commandez vos repas préférés. Livraison rapide, paiement flexible.
        </p>
        <a href="#menu" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-full text-white text-sm font-semibold transition-colors">
          Voir le menu <ArrowDown className="w-4 h-4" />
        </a>

        {/* Stats rapides */}
        <div className="flex items-center justify-center gap-8 mt-10">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">15-30 min</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2 text-gray-500">
            <Truck className="w-4 h-4" />
            <span className="text-sm">Livraison rapide</span>
          </div>
          <div className="w-px h-4 bg-gray-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-gray-500">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Suivi en direct</span>
          </div>
        </div>
      </section>

      {/* Menu — Plats uniquement */}
      <section id="menu" className="max-w-6xl mx-auto px-4 pb-40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Notre Menu
          </h2>
          <span className="text-sm text-gray-500">{meals.length} plat{meals.length > 1 ? "s" : ""}</span>
        </div>

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
        </div>

        {/* Grille repas */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <UtensilsCrossed className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Aucun plat trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMeals.map((p) => {
              const count = getCartCount(p.id);
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                  <div className="relative h-32 sm:h-36 flex items-center justify-center bg-gray-800">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-12 h-12 text-gray-600" />
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded-md backdrop-blur-sm">
                      <Timer className="w-3 h-3 text-gray-400" />
                      <span className="text-[9px] text-gray-400 font-medium">~{p.cookingTimeMin} min</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">FCFA</span></p>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <>
                            <button onClick={() => removeFromCart(p.id)} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors">
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
        )}
      </section>

      {/* ============================================ */}
      {/* Barre panier fixe — seulement sur le menu   */}
      {/* ============================================ */}
      {orderStep === "menu" && totalMeals > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 lg:bottom-0 lg:pb-4 lg:max-w-2xl lg:mx-auto">
          <button onClick={nextStep}
            className="w-full flex items-center justify-between py-3.5 px-5 bg-orange-600 hover:bg-orange-700 rounded-2xl text-white transition-colors shadow-lg">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-semibold">{totalMeals} Plat{totalMeals > 1 ? "s" : ""}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold">
              Suivant <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* Overlay multi-étapes                         */}
      {/* ============================================ */}
      {orderStep !== "menu" && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOrderStep("menu")} />

          {/* Bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[92vh] flex flex-col">
            {/* Header de l'overlay */}
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

              {/* Barre de progression */}
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
            <div className="flex-1 overflow-y-auto p-4">

              {/* ——— ÉTAPE : Suppléments ——— */}
              {orderStep === "extras" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Ajoutez des boissons ou accompagnements à votre commande (optionnel)
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {extras.map((p) => {
                      const count = getCartCount(p.id);
                      return (
                        <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                          <div className="h-24 flex items-center justify-center bg-gray-800">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Droplets className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="text-sm font-semibold text-white truncate">{p.name}</h4>
                            {p.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">F</span></p>
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

              {/* ——— ÉTAPE : Informations de livraison ——— */}
              {orderStep === "info" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Votre nom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nom complet"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Téléphone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+229 00 00 00 00"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Adresse de livraison *</label>
                    <AddressPickerMap onSelect={handleAddressSelect} />
                  </div>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note pour la commande (optionnel)"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-orange-500" />
                </div>
              )}

              {/* ——— ÉTAPE : Récapitulatif & Paiement ——— */}
              {orderStep === "payment" && (
                <div className="space-y-4">
                  {/* Plats */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Plats</p>
                    {mealItems.map((i) => (
                      <div key={i.product.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{i.quantity}× {i.product.name}</span>
                        <span className="text-gray-400">{(i.product.price * i.quantity).toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>

                  {/* Suppléments */}
                  {extraItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Suppléments</p>
                      {extraItems.map((i) => (
                        <div key={i.product.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{i.quantity}× {i.product.name}</span>
                          <span className="text-gray-400">{(i.product.price * i.quantity).toLocaleString()} F</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totaux */}
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

                  {/* Infos livraison */}
                  <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Livraison</p>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span>{guestName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span>{guestPhone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{address}</span>
                    </div>
                    {note && (
                      <p className="text-xs text-gray-500 italic mt-1">&quot;{note}&quot;</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — boutons d'action */}
            <div className="p-4 border-t border-gray-800/50">

              {/* Extras : Suivant */}
              {orderStep === "extras" && (
                <button onClick={nextStep}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Info : Suivant (disabled si incomplet) */}
              {orderStep === "info" && (
                <button onClick={nextStep} disabled={!infoValid}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Paiement : bouton(s) selon config admin */}
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
                      Payer en ligne — {total.toLocaleString()} FCFA
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
                        Payer en ligne — {total.toLocaleString()} FCFA
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation mobile fixe */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 lg:hidden">
        <div className="bg-gray-900/[0.97] backdrop-blur-xl border border-gray-800 rounded-2xl shadow-lg shadow-black/20">
          <div className="flex items-stretch h-[3.2rem]">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <ClipboardList className="w-[24px] h-[24px] text-gray-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[10px] leading-none text-gray-500 font-medium">Commandes</span>
            </Link>
            <a href="#menu" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <ShoppingBag className="w-[24px] h-[24px] text-orange-500 transition-colors" strokeWidth={2.1} />
              <span className="text-[10px] leading-none text-orange-500 font-semibold">Commander</span>
            </a>
            <Link href="/login" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <LogIn className="w-[24px] h-[24px] text-gray-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[10px] leading-none text-gray-500 font-medium">Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
