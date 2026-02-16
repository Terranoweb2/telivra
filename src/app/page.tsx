"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import {
  ShoppingBag, MapPin, CreditCard,
  Search, Plus, Minus, X, Loader2,
  ClipboardList, LogIn, UserPlus,
  UtensilsCrossed,
  ArrowDown, Phone, User, Timer, Droplets,
  Sun, Moon, Clock, Truck,
  ChevronLeft, ChevronRight,
  HandMetal, MousePointerClick, MapPinned, CookingPot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
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
  appliesToAll: boolean;
  products?: { product?: { id: string; image: string | null } }[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SiteSettings {
  restaurantName: string;
  defaultPaymentMethod: string;
  paymentPhoneNumber: string | null;
  deliveryFee: number;
  currency: string;
}

type OrderStep = "menu" | "extras" | "address" | "info" | "payment";

const MEALS_PER_LOAD = 12;

export default function LandingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(MEALS_PER_LOAD);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderStep, setOrderStep] = useState<OrderStep>("menu");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Guest info
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState(0);
  const [addressLng, setAddressLng] = useState(0);
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);

  // Détail produit
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Onboarding tour
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const tourSteps = [
    {
      icon: <HandMetal className="w-7 h-7 text-orange-400" />,
      title: "Bienvenue !",
      desc: "Découvrez comment commander vos repas en quelques étapes simples.",
    },
    {
      icon: <UtensilsCrossed className="w-7 h-7 text-orange-400" />,
      title: "1. Choisissez vos plats",
      desc: "Parcourez le menu et utilisez la recherche pour trouver vos plats favoris.",
    },
    {
      icon: <MousePointerClick className="w-7 h-7 text-orange-400" />,
      title: "2. Ajoutez au panier",
      desc: "Appuyez sur le bouton + pour ajouter un plat. Ajustez les quantités avec + et −.",
    },
    {
      icon: <MapPinned className="w-7 h-7 text-orange-400" />,
      title: "3. Livraison",
      desc: "Renseignez vos informations et sélectionnez votre adresse sur la carte interactive.",
    },
    {
      icon: <CookingPot className="w-7 h-7 text-orange-400" />,
      title: "4. Validez et savourez !",
      desc: "Choisissez votre mode de paiement, validez et suivez votre commande en temps réel. Bon appétit !",
    },
  ];

  function nextTourStep() {
    if (tourStep < tourSteps.length - 1) {
      setTourStep((s) => s + 1);
    } else {
      completeTour();
    }
  }

  function completeTour() {
    setShowTour(false);
    setTourStep(0);
    try { localStorage.setItem("onboarding-tour-seen", "1"); } catch {}
  }

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const result = await signIn("credentials", {
      email: authEmail,
      password: authPassword,
      redirect: false,
    });
    if (result?.error) {
      setAuthError("Email ou mot de passe incorrect");
      setAuthLoading(false);
    } else {
      toast.success("Connexion réussie");
      router.push("/dashboard");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword, phone: authPhone }),
      });
      if (res.ok) {
        const result = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
        if (result?.error) {
          setAuthError("Compte créé. Erreur de connexion automatique.");
        } else {
          toast.success("Compte créé avec succès !");
          router.push("/dashboard");
        }
      } else {
        const data = await res.json();
        setAuthError(data.error || "Erreur lors de l'inscription");
      }
    } catch {
      setAuthError("Erreur réseau");
    }
    setAuthLoading(false);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/promotions").then((r) => r.json()).catch(() => []),
    ]).then(([prods, sett, promos]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setSettings(sett);
      const activePromos = Array.isArray(promos) ? promos : [];
      setPromotions(activePromos);
      setLoading(false);
      // Afficher le dialog promo si des promos actives et pas encore vu
      if (activePromos.length > 0) {
        try {
          const dismissed = localStorage.getItem("promo-dialog-dismissed");
          if (!dismissed) {
            setTimeout(() => setShowPromoDialog(true), 800);
          } else {
            setPromoDismissed(true);
          }
        } catch {
          setTimeout(() => setShowPromoDialog(true), 800);
        }
      }
      // Auto-scroll vers le menu après chargement
      setTimeout(() => {
        const el = document.getElementById("menu");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
      // Afficher le tour d'onboarding pour les premiers visiteurs
      try {
        if (!localStorage.getItem("onboarding-tour-seen")) {
          setTimeout(() => setShowTour(true), 1200);
        }
      } catch {}
    });
  }, []);

  // Auto-rotate promo carousel
  useEffect(() => {
    if (promotions.length <= 1) return;
    const iv = setInterval(() => setPromoIndex((i) => (i + 1) % promotions.length), 5000);
    return () => clearInterval(iv);
  }, [promotions.length]);

  const meals = products.filter((p) => !p.isExtra);
  const extras = products.filter((p) => p.isExtra);
  const hasExtras = extras.length > 0;

  const filteredMeals = meals.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Reset visible count quand recherche change
  useEffect(() => { setVisibleCount(MEALS_PER_LOAD); }, [search]);

  const paginatedMeals = filteredMeals.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMeals.length;

  // Infinite scroll avec IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + MEALS_PER_LOAD);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredMeals.length]);

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
  const subtotal = cart.reduce((s, i) => s + (i.product.effectivePrice ?? i.product.price) * i.quantity, 0);
  const deliveryFee = settings?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  // Step navigation
  const stepsList: { id: OrderStep; label: string }[] = [
    ...(hasExtras ? [{ id: "extras" as const, label: "Suppléments" }] : []),
    { id: "address" as const, label: "Adresse" },
    { id: "info" as const, label: "Vos infos" },
    { id: "payment" as const, label: "Paiement" },
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
    if (currentStepIndex === 0) {
      setOrderStep("menu");
    } else if (currentStepIndex > 0) {
      setOrderStep(stepsList[currentStepIndex - 1].id);
    }
  }

  // Admin payment method
  const adminMethod = settings?.defaultPaymentMethod || "CASH";
  const paymentPhone = settings?.paymentPhoneNumber || "";

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
        if (method === "ONLINE" && paymentPhone) {
          const ref = order.orderNumber;
          const ussd = "*880*1*1*" + paymentPhone + "*" + paymentPhone + "*" + total + "*" + ref + "#";
          window.location.href = "tel:" + encodeURIComponent(ussd);
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAuth(true); setAuthMode("login"); setAuthError(""); }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
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
      <section id="menu" className="max-w-6xl mx-auto px-4 pb-40 scroll-mt-16">
        <div className="flex items-center justify-between mb-5 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Notre Menu
              </h2>
              <p className="text-xs text-gray-500">{meals.length} plat{meals.length > 1 ? "s" : ""} disponible{meals.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* Bandeau promo en bas (visible après fermeture du dialog) */}
        {promoDismissed && promotions.length > 0 && (
          <button onClick={() => { setShowPromoDialog(true); }}
            className="w-full mb-4 py-2.5 px-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl flex items-center justify-between gap-3 hover:from-orange-500 hover:to-orange-400 transition-all">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold text-white">{promotions.length} promo{promotions.length > 1 ? "s" : ""} en cours !</span>
            </div>
            <span className="text-xs text-orange-100 font-medium">Voir →</span>
          </button>
        )}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paginatedMeals.map((p) => {
              const count = getCartCount(p.id);
              return (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors">
                  <div className="relative h-32 sm:h-36 flex items-center justify-center bg-gray-800 cursor-pointer" onClick={() => setSelectedProduct(p)}>
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
                    <h3 className="text-sm font-semibold text-white truncate cursor-pointer hover:text-orange-400 transition-colors" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                    {p.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 [&_*]:!m-0 [&_*]:!p-0" dangerouslySetInnerHTML={{ __html: p.description }} />}
                    <div className="flex items-center justify-between mt-2">
                      {p.hasDiscount ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-green-400">{(p.effectivePrice ?? p.price).toLocaleString()} <span className="text-[9px] font-normal">FCFA</span></span>
                          <span className="text-[10px] text-gray-500 line-through">{p.price.toLocaleString()}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-orange-400">{p.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">FCFA</span></p>
                      )}
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

        {/* Sentinel pour charger plus au scroll */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
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
          <div className={cn("absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 flex flex-col", orderStep === "address" ? "h-[92vh]" : "max-h-[92vh]")}>
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
            <div className={cn("flex-1 min-h-0", orderStep === "address" ? "overflow-hidden relative" : "overflow-y-auto p-4")}>

              {/* ——— ÉTAPE : Suppléments ——— */}
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
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
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

              {/* ——— ÉTAPE : Adresse (carte plein écran) ——— */}
              {orderStep === "address" && (
                <div className="absolute inset-0">
                  <AddressPickerMap onSelect={handleAddressSelect} fullHeight />
                </div>
              )}

              {/* ——— ÉTAPE : Informations personnelles ——— */}
              {orderStep === "info" && (
                <div className="space-y-3">
                  {address && (
                    <div className="flex items-start gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                      <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-300 line-clamp-2">{address}</p>
                    </div>
                  )}
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
                        className={cn("w-full pl-10 pr-3 py-2.5 bg-gray-800 border rounded-xl text-white text-sm focus:outline-none",
                          guestPhone.trim() && (guestPhone.replace(/\D/g, "").length < 8 || /^0+$/.test(guestPhone.replace(/\D/g, "")))
                            ? "border-red-500/50 focus:border-red-500" : "border-gray-700 focus:border-orange-500"
                        )} />
                    </div>
                    {guestPhone.trim() && guestPhone.replace(/\D/g, "").length < 8 && (
                      <p className="text-[11px] text-red-400 mt-1">Le numéro doit contenir au moins 8 chiffres</p>
                    )}
                    {guestPhone.trim() && guestPhone.replace(/\D/g, "").length >= 8 && /^0+$/.test(guestPhone.replace(/\D/g, "")) && (
                      <p className="text-[11px] text-red-400 mt-1">Numéro de téléphone invalide</p>
                    )}
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
                        <span className="text-gray-400">{((i.product.effectivePrice ?? i.product.price) * i.quantity).toLocaleString()} F</span>
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
                          <span className="text-gray-400">{((i.product.effectivePrice ?? i.product.price) * i.quantity).toLocaleString()} F</span>
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

              {/* Address : Confirmer l'adresse */}
              {orderStep === "address" && (
                <button onClick={nextStep} disabled={!address || !addressLat || !addressLng}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Confirmer l&apos;adresse <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Info : Suivant (disabled si incomplet ou téléphone invalide) */}
              {orderStep === "info" && (() => {
                const digits = guestPhone.replace(/\D/g, "");
                const phoneValid = digits.length >= 8 && !/^0+$/.test(digits);
                return (
                  <button onClick={nextStep} disabled={!guestName.trim() || !phoneValid}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                );
              })()}

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

      {/* ============================================ */}
      {/* Modal Connexion / Inscription                 */}
      {/* ============================================ */}
      {showAuth && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAuth(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[85vh] flex flex-col">
            <div className="p-4 pb-3 border-b border-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-base font-bold text-white">{restaurantName}</span>
                </div>
                <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Tabs login / register */}
              <div className="flex gap-1 mt-3 bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors", authMode === "login" ? "bg-orange-600 text-white" : "text-gray-400")}
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors", authMode === "register" ? "bg-orange-600 text-white" : "text-gray-400")}
                >
                  Inscription
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[13px] mb-3">
                  {authError}
                </div>
              )}

              {authMode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="votre@email.com"
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
                    <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <button type="submit" disabled={authLoading}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Se connecter
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Nom complet</label>
                    <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} required placeholder="Votre nom"
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="votre@email.com"
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Téléphone</label>
                    <input type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="+229 00 00 00 00"
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
                    <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" minLength={6}
                      className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <button type="submit" disabled={authLoading}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Créer mon compte
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Modal détail produit                          */}
      {/* ============================================ */}
      {selectedProduct && (() => {
        const p = selectedProduct;
        const count = getCartCount(p.id);
        return (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedProduct(null)} />
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 max-h-[90vh] flex flex-col">
              {/* Image */}
              <div className="relative h-52 sm:h-64 bg-gray-800 rounded-t-3xl overflow-hidden shrink-0">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 rounded-lg backdrop-blur-sm">
                  <Timer className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs text-white font-medium">~{p.cookingTimeMin} min</span>
                </div>
              </div>

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-xl font-bold text-white">{p.name}</h2>
                {p.shopName && (
                  <p className="text-xs text-gray-500 mt-1">{p.shopName}</p>
                )}
                <p className="text-lg font-bold text-orange-400 mt-2">
                  {p.hasDiscount ? (
                    <><span className="text-green-400">{(p.effectivePrice ?? p.price).toLocaleString()}</span> <span className="text-sm font-normal text-gray-500 line-through ml-2">{p.price.toLocaleString()}</span> <span className="text-sm font-normal text-gray-500">FCFA</span></>
                  ) : (
                    <>{p.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">FCFA</span></>
                  )}
                </p>

                {p.description && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                    <div className="text-sm text-gray-400 leading-relaxed [&_*]:!m-0 [&_*]:!p-0 [&_p]:!mb-1" dangerouslySetInnerHTML={{ __html: p.description }} />
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">Temps de préparation : ~{p.cookingTimeMin} min</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800/50 shrink-0">
                {count === 0 ? (
                  <button
                    onClick={() => { addToCart(p); toast.success(`${p.name} ajouté au panier`); }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Commander
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Quantité +/- */}
                    <div className="flex items-center justify-center gap-4">
                      <button onClick={() => removeFromCart(p.id)} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors border border-gray-700">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xl text-white font-bold w-8 text-center">{count}</span>
                      <button onClick={() => addToCart(p)} className="w-10 h-10 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Actions */}
                    <button
                      onClick={() => { setSelectedProduct(null); nextStep(); }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Payer maintenant — {(cart.reduce((s, i) => s + (i.product.effectivePrice ?? i.product.price) * i.quantity, 0)).toLocaleString()} FCFA
                    </button>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un autre repas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================ */}
      {/* Tour d'onboarding                             */}
      {/* ============================================ */}
      {showTour && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={completeTour} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 p-5 pb-8 animate-in slide-in-from-bottom duration-300">
            {/* Progress dots */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-1.5">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i <= tourStep ? "bg-orange-500 w-6" : "bg-gray-700 w-4"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={completeTour}
                className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
              >
                Passer
              </button>
            </div>

            {/* Step content */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-orange-600/15 rounded-2xl flex items-center justify-center shrink-0">
                {tourSteps[tourStep].icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {tourSteps[tourStep].title}
                </h3>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  {tourSteps[tourStep].desc}
                </p>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={nextTourStep}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {tourStep === tourSteps.length - 1 ? (
                <>C&apos;est parti ! <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Suivant <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
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
            <button onClick={() => { setShowAuth(true); setAuthError(""); }} className="flex flex-col items-center justify-center flex-1 gap-[3px]">
              <LogIn className="w-[24px] h-[24px] text-gray-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[10px] leading-none text-gray-500 font-medium">Connexion</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Dialog Promotions */}
      {showPromoDialog && promotions.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => { setShowPromoDialog(false); setPromoDismissed(true); try { localStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowPromoDialog(false); setPromoDismissed(true); try { localStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0">
              {promotions.map((promo: any, idx: number) => {
                const bannerImg = promo.image || (!promo.appliesToAll && promo.products?.length === 1 ? promo.products[0]?.product?.image : null);
                return (
                  <div key={promo.id} className={cn(idx > 0 && "border-t border-gray-800")}>
                    {bannerImg && (
                      <div className="relative h-44">
                        <img src={bannerImg} alt={promo.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      </div>
                    )}
                    <div className={cn("px-5 pb-5", bannerImg ? "-mt-12 relative z-10" : "pt-5")}>
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
                        {promo.appliesToAll ? "Sur tous les repas et extras" : `Sur ${promo.products?.length || 0} article(s)`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-800">
              <button onClick={() => { setShowPromoDialog(false); setPromoDismissed(true); try { localStorage.setItem("promo-dialog-dismissed", "1"); } catch {} }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Commander maintenant
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
