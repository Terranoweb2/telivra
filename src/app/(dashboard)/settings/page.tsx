"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Shield, Bell, Save, Loader2, Check, CreditCard, Store, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PillTabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // Profil
  const [profileName, setProfileName] = useState("");
  useEffect(() => {
    if (session?.user?.name) setProfileName(session.user.name);
  }, [session?.user?.name]);

  // Sécurité
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Site settings
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [defaultPayment, setDefaultPayment] = useState("BOTH");
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [currency, setCurrency] = useState("XOF");

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/settings").then((r) => r.json()).then((data) => {
        setSiteSettings(data);
        setRestaurantName(data.restaurantName || "");
        setDefaultPayment(data.defaultPaymentMethod || "BOTH");
        setPaymentPhoneNumber(data.paymentPhoneNumber || "");
        setDeliveryFee(String(data.deliveryFee || 0));
        setCurrency(data.currency || "XOF");
      }).catch(() => {});
    }
  }, [isAdmin]);

  async function saveProfile() {
    if (!profileName.trim() || profileName.trim().length < 2) {
      toast.error("Le nom doit faire au moins 2 caractères");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      if (res.ok) {
        toast.success("Profil mis à jour");
        await updateSession();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!currentPassword) {
      toast.error("Entrez votre mot de passe actuel");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success("Mot de passe modifié");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Erreur lors du changement");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveSiteSettings() {
    setSaving(true);
    try {
      const body: any = { restaurantName, defaultPaymentMethod: defaultPayment, paymentPhoneNumber: paymentPhoneNumber || null, deliveryFee: parseFloat(deliveryFee) || 0, currency };
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
        toast.success("Paramètres sauvegardés");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } finally { setSaving(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors";
  const selectClass = "w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-[14px] focus:outline-none focus:border-orange-500/50 transition-colors appearance-none";

  const tabs = [
    { key: "profile", label: "Profil", icon: User },
    ...(isAdmin ? [{ key: "restaurant", label: "Restaurant", icon: Store }] : []),
    ...(isAdmin ? [{ key: "payment", label: "Paiement", icon: CreditCard }] : []),
    { key: "security", label: "Sécurité", icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Paramètres" subtitle="Gérez votre compte et vos préférences" />

      <PillTabGroup tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <Card>
        <CardContent className="p-5">
          {activeTab === "profile" && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-[15px] font-semibold text-white mb-4">Informations du profil</h2>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Nom</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Email</label>
                <input type="email" defaultValue={session?.user?.email || ""} disabled className={cn(inputClass, "opacity-50")} />
                <p className="text-[11px] text-gray-600 mt-1">L&apos;email ne peut pas être modifié</p>
              </div>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Role</label>
                <input type="text" value={role || "VIEWER"} disabled className={cn(inputClass, "opacity-50")} />
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          )}

          {activeTab === "payment" && isAdmin && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-[15px] font-semibold text-white mb-4">Configuration paiement</h2>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Mode de paiement par défaut</label>
                <select value={defaultPayment} onChange={(e) => setDefaultPayment(e.target.value)} className={selectClass}>
                  <option value="CASH">Espèces uniquement</option>
                  <option value="ONLINE">En ligne uniquement</option>
                  <option value="BOTH">Espèces + En ligne</option>
                </select>
              </div>
              <div className="border-t border-white/[0.06] pt-4">
                <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-400" /> MTN Mobile Money
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[13px] text-gray-400 mb-1.5">Numéro de paiement</label>
                    <input type="tel" value={paymentPhoneNumber} onChange={(e) => setPaymentPhoneNumber(e.target.value)} placeholder="Ex: 97000000" className={inputClass} />
                    <p className="text-[11px] text-gray-600 mt-1">Les clients paieront sur ce numéro via MTN MoMo</p>
                  </div>
                </div>
              </div>
              <button onClick={saveSiteSettings} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-[15px] font-semibold text-white mb-4">Changer le mot de passe</h2>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Mot de passe actuel</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 caractères minimum" className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Confirmer</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <button onClick={changePassword} disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Changer le mot de passe
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
