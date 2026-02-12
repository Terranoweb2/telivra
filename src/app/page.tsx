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

export default function LandingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrder, setShowOrder] = useState(false);

  // Guest info
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState(0);
  const [addressLng, setAddressLng] = useState(0);
  const [note, setNote] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<"CASH" | "ONLINE">("CASH");
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

  const deliveryFee = settings?.deliveryFee || 0;
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total = subtotal + deliveryFee;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const canPayOnline = settings?.defaultPaymentMethod === "ONLINE" || settings?.defaultPaymentMethod === "BOTH";
  const canPayCash = settings?.defaultPaymentMethod === "CASH" || settings?.defaultPaymentMethod === "BOTH" || !settings?.defaultPaymentMethod;

  const handleAddressSelect = useCallback((lat: number, lng: number, addr: string) => {
    setAddressLat(lat);
    setAddressLng(lng);
    setAddress(addr);
  }, []);

  async function placeOrder() {
    if (!guestName || !guestPhone || !address || !addressLat || !addressLng) return;
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
          paymentMethod: paymentChoice,
        }),
      });
      if (res.ok) {
        const order = await res.json();
        if (paymentChoice === "ONLINE") {
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
        setShowOrder(false);
        router.push(`/track/${order.id}`);
      }
    } finally {
      setOrdering(false);
    }
  }

  const { theme, setTheme } = useTheme();
  const restaurantName = settings?.restaurantName || "Terrano";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {restaurantName}
            </span>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-gray-900 dark:text-white">
          Savourez nos plats,
          <br />
          livres chez vous
        </h1>
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
          Decouvrez notre menu et commandez vos repas preferes. Livraison rapide, paiement flexible.
        </p>
        <a href="#menu" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-full text-sm font-semibold transition-colors">
          Voir le menu <ArrowDown className="w-4 h-4" />
        </a>

        {/* Stats rapides */}
        <div className="flex items-center justify-center gap-8 mt-10">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">15-30 min</span>
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Truck className="w-4 h-4" />
            <span className="text-sm">Livraison rapide</span>
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Suivi en direct</span>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="max-w-6xl mx-auto px-4 pb-40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Notre Menu
          </h2>
          <span className="text-sm text-gray-400">{meals.length} plat{meals.length > 1 ? "s" : ""}</span>
        </div>

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        {/* Grille repas */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <UtensilsCrossed className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Aucun plat trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMeals.map((p) => {
              const count = getCartCount(p.id);
              return (
                <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                  <div className="relative h-32 sm:h-36 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white/80 dark:bg-black/60 rounded-md backdrop-blur-sm">
                      <Timer className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">~{p.cookingTimeMin} min</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{p.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">FCFA</span></p>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <>
                            <button onClick={() => removeFromCart(p.id)} className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-white transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-gray-900 dark:text-white font-bold w-4 text-center">{count}</span>
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

        {/* Section Extras */}
        {extras.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-gray-400" /> Boissons & Extras
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {extras.map((p) => {
                const count = getCartCount(p.id);
                return (
                  <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 flex-shrink-0 w-36 transition-colors">
                    <div className="h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Droplets className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                    <div className="p-2">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</h4>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{p.price.toLocaleString()} F</p>
                        <div className="flex items-center gap-1">
                          {count > 0 && (
                            <>
                              <button onClick={() => removeFromCart(p.id)} className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-white transition-colors">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] text-gray-900 dark:text-white font-bold w-3 text-center">{count}</span>
                            </>
                          )}
                          <button onClick={() => addToCart(p)} className="w-5 h-5 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white transition-colors">
                            <Plus className="w-2.5 h-2.5" />
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
      </section>

      {/* Barre panier fixe */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 lg:bottom-0 lg:pb-4 lg:max-w-2xl lg:mx-auto">
          {!showOrder ? (
            <button onClick={() => setShowOrder(true)}
              className="w-full flex items-center justify-between py-3.5 px-5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-2xl transition-colors shadow-lg">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm font-semibold">{totalItems} Article{totalItems > 1 ? "s" : ""}</span>
              </span>
              <span className="text-sm font-bold">{total.toLocaleString()} FCFA</span>
            </button>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 dark:text-white font-semibold text-sm">Finaliser la commande</p>
                  <button onClick={() => setShowOrder(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                {/* Resume panier */}
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {cart.map((i) => (
                    <div key={i.product.id} className="flex justify-between text-xs text-gray-500">
                      <span>{i.quantity}x {i.product.name}</span>
                      <span>{(i.product.price * i.quantity).toLocaleString()} FCFA</span>
                    </div>
                  ))}
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Frais de livraison</span><span>{deliveryFee.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-2">
                  <span>Total</span><span>{total.toLocaleString()} FCFA</span>
                </div>

                {/* Infos client */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Votre nom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nom complet"
                        className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telephone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+229 00 00 00 00"
                        className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-400" />
                    </div>
                  </div>

                  {/* Carte adresse */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Adresse de livraison *</label>
                    <AddressPickerMap onSelect={handleAddressSelect} />
                  </div>

                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note pour la commande (optionnel)"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:border-orange-500 placeholder-gray-400" />
                </div>

                {/* Choix de paiement */}
                {(canPayOnline || canPayCash) && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 block">Mode de paiement</label>
                    <div className="flex gap-2">
                      {canPayCash && (
                        <button onClick={() => setPaymentChoice("CASH")}
                          className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border",
                            paymentChoice === "CASH" ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500")}>
                          A la livraison
                        </button>
                      )}
                      {canPayOnline && (
                        <button onClick={() => setPaymentChoice("ONLINE")}
                          className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-1.5",
                            paymentChoice === "ONLINE" ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500")}>
                          <CreditCard className="w-4 h-4" /> En ligne
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={placeOrder}
                  disabled={ordering || !guestName || !guestPhone || !address || !addressLat || !addressLng}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  {paymentChoice === "ONLINE" ? "Payer en ligne" : "Commander"} - {total.toLocaleString()} FCFA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation mobile fixe — flottant arrondi */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 lg:hidden">
        <div className="bg-white/[0.97] dark:bg-gray-900/[0.97] backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg">
          <div className="flex items-stretch h-[3.2rem]">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <ClipboardList className="w-[24px] h-[24px] text-gray-400 dark:text-gray-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[10px] leading-none text-gray-400 dark:text-gray-500 font-medium">Commandes</span>
            </Link>
            <a href="#menu" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <ShoppingBag className="w-[24px] h-[24px] text-orange-600 dark:text-orange-500 transition-colors" strokeWidth={2.1} />
              <span className="text-[10px] leading-none text-orange-600 dark:text-orange-500 font-semibold">Commander</span>
            </a>
            <Link href="/login" className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <LogIn className="w-[24px] h-[24px] text-gray-400 dark:text-gray-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[10px] leading-none text-gray-400 dark:text-gray-500 font-medium">Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
