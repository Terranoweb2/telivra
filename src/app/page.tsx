"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag, Zap, MapPin, CreditCard, UserCheck,
  Search, Plus, Minus, X, Loader2,
  ClipboardList, Map, LogIn,
  UtensilsCrossed, ShoppingCart,
  ArrowDown, Phone, User, Timer, Droplets, ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const advantages = [
  { icon: ChefHat, title: "Cuisine maison", desc: "Plats prepares avec soin par nos cuisiniers", color: "from-orange-500 to-red-500" },
  { icon: Zap, title: "Livraison rapide", desc: "Recevez vos commandes en un temps record", color: "from-yellow-500 to-orange-500" },
  { icon: MapPin, title: "Suivi en direct", desc: "Suivez votre livreur en temps reel sur la carte", color: "from-blue-500 to-cyan-500" },
  { icon: UserCheck, title: "Sans inscription", desc: "Commandez sans creer de compte, simple et rapide", color: "from-purple-500 to-pink-500" },
];

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
  const [addressLat, setAddressLat] = useState("");
  const [addressLng, setAddressLng] = useState("");
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

  // Separer repas et extras
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

  function useMyPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setAddressLat(String(pos.coords.latitude));
      setAddressLng(String(pos.coords.longitude));
      setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
    }, () => {}, { enableHighAccuracy: true });
  }

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
          deliveryLat: parseFloat(addressLat),
          deliveryLng: parseFloat(addressLng),
          note,
          guestName,
          guestPhone,
          paymentMethod: paymentChoice,
        }),
      });
      if (res.ok) {
        const order = await res.json();

        // Si paiement en ligne, rediriger vers FedaPay
        if (paymentChoice === "ONLINE") {
          const payRes = await fetch("/api/payments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
          if (payRes.ok) {
            const { paymentUrl } = await payRes.json();
            if (paymentUrl) {
              window.location.href = paymentUrl;
              return;
            }
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

  const restaurantName = settings?.restaurantName || "Terrano";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            {restaurantName}
          </span>
          <Link href="/login" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors">
            <LogIn className="w-4 h-4" /> Connexion
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-red-600/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Savourez nos plats,
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
              livres chez vous
            </span>
          </h1>
          <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
            Decouvrez notre menu et commandez vos repas preferes. Livraison rapide, paiement flexible.
          </p>
          <a href="#menu" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl text-sm font-semibold transition-colors shadow-lg shadow-orange-600/20">
            Voir le menu <ArrowDown className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Avantages */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {advantages.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.title} className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-4 sm:p-5 hover:border-gray-700 transition-colors">
                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", a.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="max-w-6xl mx-auto px-4 pb-40">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-orange-400" /> Notre Menu
        </h2>

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
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">Aucun plat trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMeals.map((p) => {
              const count = getCartCount(p.id);
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                  <div className="relative h-32 sm:h-36 flex items-center justify-center bg-orange-600/20">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-12 h-12 opacity-40 text-orange-400" />
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded-md">
                      <Timer className="w-3 h-3 text-orange-300" />
                      <span className="text-[9px] text-orange-300 font-medium">~{p.cookingTimeMin} min</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></p>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <>
                            <button onClick={() => removeFromCart(p.id)} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-white font-bold w-4 text-center">{count}</span>
                          </>
                        )}
                        <button onClick={() => addToCart(p)} className="w-6 h-6 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white">
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

        {/* Section Extras (boissons, eau, jus) */}
        {extras.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" /> Boissons & Extras
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {extras.map((p) => {
                const count = getCartCount(p.id);
                return (
                  <div key={p.id} className="flex-shrink-0 w-36 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                    <div className="h-24 flex items-center justify-center bg-blue-600/10">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Droplets className="w-8 h-8 opacity-40 text-blue-400" />
                      )}
                    </div>
                    <div className="p-2">
                      <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs font-bold text-blue-400">{p.price.toLocaleString()} F</p>
                        <div className="flex items-center gap-1">
                          {count > 0 && (
                            <>
                              <button onClick={() => removeFromCart(p.id)} className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] text-white font-bold w-3 text-center">{count}</span>
                            </>
                          )}
                          <button onClick={() => addToCart(p)} className="w-5 h-5 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full text-white">
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
              className="w-full flex items-center justify-between py-3.5 px-5 bg-orange-600 hover:bg-orange-700 rounded-2xl text-white transition-colors shadow-lg shadow-orange-600/20">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm font-semibold">Commander {totalItems} Article{totalItems > 1 ? "s" : ""}</span>
              </span>
              <span className="text-sm font-bold">{total.toLocaleString()} FCFA</span>
            </button>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">Finaliser la commande</p>
                <button onClick={() => setShowOrder(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {/* Resume panier */}
              <div className="max-h-28 overflow-y-auto space-y-1">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-xs text-gray-400">
                    <span>{i.quantity}x {i.product.name}</span>
                    <span>{(i.product.price * i.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Frais de livraison</span>
                  <span>{deliveryFee.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white border-t border-gray-800 pt-2">
                <span>Total</span><span>{total.toLocaleString()} FCFA</span>
              </div>

              {/* Infos client */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Votre nom *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nom complet"
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Telephone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+229 00 00 00 00"
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Adresse de livraison *</label>
                  <div className="flex gap-2">
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500" />
                    <button onClick={useMyPosition} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-orange-400" title="Ma position">
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" value={addressLat} onChange={(e) => setAddressLat(e.target.value)} placeholder="Latitude"
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500" />
                  <input type="number" step="any" value={addressLng} onChange={(e) => setAddressLng(e.target.value)} placeholder="Longitude"
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500" />
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note pour la commande (optionnel)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-orange-500" />
              </div>

              {/* Choix de paiement */}
              {(canPayOnline || canPayCash) && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 block">Mode de paiement</label>
                  <div className="flex gap-2">
                    {canPayCash && (
                      <button onClick={() => setPaymentChoice("CASH")}
                        className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border",
                          paymentChoice === "CASH" ? "bg-green-600/20 border-green-500/50 text-green-400" : "bg-gray-800 border-gray-700 text-gray-400")}>
                        A la livraison
                      </button>
                    )}
                    {canPayOnline && (
                      <button onClick={() => setPaymentChoice("ONLINE")}
                        className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-1.5",
                          paymentChoice === "ONLINE" ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-gray-800 border-gray-700 text-gray-400")}>
                        <CreditCard className="w-4 h-4" /> Payer en ligne
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
          )}
        </div>
      )}

      {/* Navigation mobile fixe */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800/50">
          <div className="flex items-center justify-around h-16 px-2">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl">
                <ClipboardList className="w-5 h-5 text-gray-500 group-active:text-gray-300 transition-colors" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Commandes</span>
            </Link>
            <Link href="/map" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl">
                <Map className="w-5 h-5 text-gray-500 group-active:text-gray-300 transition-colors" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Carte</span>
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
