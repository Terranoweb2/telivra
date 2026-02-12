"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, User, Shield, Bell, Save, Loader2, Check, CreditCard, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Site settings (admin)
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [defaultPayment, setDefaultPayment] = useState("BOTH");
  const [fedapayPublicKey, setFedapayPublicKey] = useState("");
  const [fedapaySecretKey, setFedapaySecretKey] = useState("");
  const [fedapayEnv, setFedapayEnv] = useState("sandbox");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [currency, setCurrency] = useState("XOF");

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          setSiteSettings(data);
          setRestaurantName(data.restaurantName || "");
          setDefaultPayment(data.defaultPaymentMethod || "BOTH");
          setFedapayPublicKey(data.fedapayPublicKey || "");
          setFedapaySecretKey(data.fedapaySecretKey || "");
          setFedapayEnv(data.fedapayEnvironment || "sandbox");
          setDeliveryFee(String(data.deliveryFee || 0));
          setCurrency(data.currency || "XOF");
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveSiteSettings() {
    setSaving(true);
    try {
      const body: any = {
        restaurantName,
        defaultPaymentMethod: defaultPayment,
        fedapayEnvironment: fedapayEnv,
        deliveryFee: parseFloat(deliveryFee) || 0,
        currency,
      };
      if (fedapayPublicKey && fedapayPublicKey !== "****") body.fedapayPublicKey = fedapayPublicKey;
      if (fedapaySecretKey && fedapaySecretKey !== "****") body.fedapaySecretKey = fedapaySecretKey;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { key: "profile", label: "Profil", icon: User },
    ...(isAdmin ? [{ key: "restaurant", label: "Restaurant", icon: Store }] : []),
    ...(isAdmin ? [{ key: "payment", label: "Paiement", icon: CreditCard }] : []),
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Securite", icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Parametres</h1>
        <p className="text-gray-400 text-sm mt-1">Gerez votre compte et vos preferences</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              )}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {activeTab === "profile" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Informations du profil</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom</label>
              <input type="text" defaultValue={session?.user?.name || ""}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" defaultValue={session?.user?.email || ""} disabled
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <p className="text-xs text-gray-600 mt-1">L email ne peut pas etre modifie</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <input type="text" value={role || "VIEWER"} disabled
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm" />
            </div>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "restaurant" && isAdmin && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration du restaurant</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom du restaurant</label>
              <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Frais de livraison (FCFA)</label>
              <input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Devise</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={saveSiteSettings} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "payment" && isAdmin && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration paiement</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Mode de paiement par defaut</label>
              <select value={defaultPayment} onChange={(e) => setDefaultPayment(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 appearance-none">
                <option value="CASH">Especes uniquement</option>
                <option value="ONLINE">En ligne uniquement</option>
                <option value="BOTH">Especes + En ligne</option>
              </select>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" /> FedaPay
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Environnement</label>
                  <select value={fedapayEnv} onChange={(e) => setFedapayEnv(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="sandbox">Sandbox (test)</option>
                    <option value="live">Live (production)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cle publique</label>
                  <input type="text" value={fedapayPublicKey} onChange={(e) => setFedapayPublicKey(e.target.value)}
                    placeholder="pk_..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cle secrete</label>
                  <input type="password" value={fedapaySecretKey} onChange={(e) => setFedapaySecretKey(e.target.value)}
                    placeholder="sk_..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                  <p className="text-xs text-gray-600 mt-1">Laissez vide pour conserver la cle actuelle</p>
                </div>
              </div>
            </div>
            <button onClick={saveSiteSettings} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Preferences de notifications</h2>
            {[
              { label: "Alertes geofence", desc: "Entrees et sorties de zones" },
              { label: "Batterie faible", desc: "Quand un appareil descend sous 20%" },
              { label: "Exces de vitesse", desc: "Depassement des limites configurees" },
              { label: "Appareil hors ligne", desc: "Perte de signal d un appareil" },
              { label: "SOS", desc: "Alertes d urgence" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Securite</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Mot de passe actuel</label>
              <input type="password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nouveau mot de passe</label>
              <input type="password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirmer le mot de passe</label>
              <input type="password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              {saved ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Changer le mot de passe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
