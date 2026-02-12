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
      fetch("/api/settings").then((r) => r.json()).then((data) => {
        setSiteSettings(data);
        setRestaurantName(data.restaurantName || "");
        setDefaultPayment(data.defaultPaymentMethod || "BOTH");
        setFedapayPublicKey(data.fedapayPublicKey || "");
        setFedapaySecretKey(data.fedapaySecretKey || "");
        setFedapayEnv(data.fedapayEnvironment || "sandbox");
        setDeliveryFee(String(data.deliveryFee || 0));
        setCurrency(data.currency || "XOF");
      }).catch(() => {});
    }
  }, [isAdmin]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveSiteSettings() {
    setSaving(true);
    try {
      const body: any = { restaurantName, defaultPaymentMethod: defaultPayment, fedapayEnvironment: fedapayEnv, deliveryFee: parseFloat(deliveryFee) || 0, currency };
      if (fedapayPublicKey && fedapayPublicKey !== "****") body.fedapayPublicKey = fedapayPublicKey;
      if (fedapaySecretKey && fedapaySecretKey !== "****") body.fedapaySecretKey = fedapaySecretKey;
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally { setSaving(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors";
  const selectClass = "w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] focus:outline-none focus:border-orange-500/50 transition-colors appearance-none";

  const tabs = [
    { key: "profile", label: "Profil", icon: User },
    ...(isAdmin ? [{ key: "restaurant", label: "Restaurant", icon: Store }] : []),
    ...(isAdmin ? [{ key: "payment", label: "Paiement", icon: CreditCard }] : []),
    { key: "notifications", label: "Notifs", icon: Bell },
    { key: "security", label: "Securite", icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Parametres</h1>
        <p className="text-[13px] text-gray-500 mt-1">Gerez votre compte et vos preferences</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "bg-orange-600 text-white"
                  : "bg-white/[0.05] text-gray-400 active:bg-white/[0.08]"
              )}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[#1c1c1e] border border-white/[0.06] rounded-2xl p-5">
        {activeTab === "profile" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-[15px] font-semibold text-white mb-4">Informations du profil</h2>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Nom</label>
              <input type="text" defaultValue={session?.user?.name || ""} className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Email</label>
              <input type="email" defaultValue={session?.user?.email || ""} disabled className={cn(inputClass, "opacity-50")} />
              <p className="text-[11px] text-gray-600 mt-1">L email ne peut pas etre modifie</p>
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Role</label>
              <input type="text" value={role || "VIEWER"} disabled className={cn(inputClass, "opacity-50")} />
            </div>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[13px] font-semibold transition-colors">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "restaurant" && isAdmin && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-[15px] font-semibold text-white mb-4">Configuration du restaurant</h2>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Nom du restaurant</label>
              <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Frais de livraison (FCFA)</label>
              <input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Devise</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
            </div>
            <button onClick={saveSiteSettings} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "payment" && isAdmin && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-[15px] font-semibold text-white mb-4">Configuration paiement</h2>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Mode de paiement par defaut</label>
              <select value={defaultPayment} onChange={(e) => setDefaultPayment(e.target.value)} className={selectClass}>
                <option value="CASH">Especes uniquement</option>
                <option value="ONLINE">En ligne uniquement</option>
                <option value="BOTH">Especes + En ligne</option>
              </select>
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-400" /> FedaPay
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] text-gray-400 mb-1.5">Environnement</label>
                  <select value={fedapayEnv} onChange={(e) => setFedapayEnv(e.target.value)} className={selectClass}>
                    <option value="sandbox">Sandbox (test)</option>
                    <option value="live">Live (production)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] text-gray-400 mb-1.5">Cle publique</label>
                  <input type="text" value={fedapayPublicKey} onChange={(e) => setFedapayPublicKey(e.target.value)} placeholder="pk_..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-400 mb-1.5">Cle secrete</label>
                  <input type="password" value={fedapaySecretKey} onChange={(e) => setFedapaySecretKey(e.target.value)} placeholder="sk_..." className={inputClass} />
                  <p className="text-[11px] text-gray-600 mt-1">Laissez vide pour conserver la cle actuelle</p>
                </div>
              </div>
            </div>
            <button onClick={saveSiteSettings} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Sauvegarder"}
            </button>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-3 max-w-lg">
            <h2 className="text-[15px] font-semibold text-white mb-4">Notifications</h2>
            {[
              { label: "Alertes geofence", desc: "Entrees et sorties de zones" },
              { label: "Batterie faible", desc: "Quand un appareil descend sous 20%" },
              { label: "Exces de vitesse", desc: "Depassement des limites" },
              { label: "Appareil hors ligne", desc: "Perte de signal" },
              { label: "SOS", desc: "Alertes d urgence" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                <div>
                  <p className="text-[13px] text-white">{item.label}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-[15px] font-semibold text-white mb-4">Securite</h2>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Mot de passe actuel</label>
              <input type="password" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Nouveau mot de passe</label>
              <input type="password" className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Confirmer</label>
              <input type="password" className={inputClass} />
            </div>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[13px] font-semibold transition-colors">
              {saved ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {saved ? "Sauvegarde !" : "Changer le mot de passe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
