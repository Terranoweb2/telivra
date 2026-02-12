"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, ShoppingBag, UtensilsCrossed,
  Plus, Minus, Search, X, Timer, Droplets, CreditCard, ChefHat,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

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

export default function CommanderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrder, setShowOrder] = useState(false);
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
        toast.success("Commande passée avec succès !");
        setCart([]);
        setShowOrder(false);
        router.push(`/livraison/order/${order.id}`);
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
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Commander"
        subtitle="Choisissez vos repas et passez commande"
      >
        <ChefHat className="w-6 h-6 text-orange-400" />
      </PageHeader>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un plat..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
      </div>

      {/* Grille repas */}
      {filteredMeals.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} message="Aucun plat trouve" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredMeals.map((p) => {
            const count = getCartCount(p.id);
            return (
              <Card key={p.id} className="overflow-hidden" hover>
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
                <CardContent className="p-3">
                  <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></p>
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
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Droplets className="w-8 h-8 opacity-40 text-orange-400" />
                    )}
                  </div>
                  <CardContent className="p-2">
                    <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs font-bold text-orange-400">{p.price.toLocaleString()} F</p>
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

      {/* Barre panier fixe */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 lg:bottom-0 lg:left-64 lg:pb-4">
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
            <Card className="rounded-2xl p-4 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">Confirmer la commande</p>
                <button onClick={() => setShowOrder(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-xs text-gray-400">
                    <span>{i.quantity}x {i.product.name}</span>
                    <span>{(i.product.price * i.quantity).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Frais de livraison</span><span>{deliveryFee.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white border-t border-gray-800 pt-2">
                <span>Total</span><span>{total.toLocaleString()} FCFA</span>
              </div>

              {/* Carte adresse */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Adresse de livraison *</label>
                <AddressPickerMap onSelect={handleAddressSelect} />
              </div>

              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note pour la commande (optionnel)"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-orange-500" />

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
                          paymentChoice === "ONLINE" ? "bg-orange-600/20 border-orange-500/50 text-orange-400" : "bg-gray-800 border-gray-700 text-gray-400")}>
                        <CreditCard className="w-4 h-4" /> Payer en ligne
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button onClick={placeOrder} disabled={ordering || !address || !addressLat || !addressLng}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                {paymentChoice === "ONLINE" ? "Payer en ligne" : "Commander"} - {total.toLocaleString()} FCFA
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
