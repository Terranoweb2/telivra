"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Shield, Bell, Save, Loader2, Check, CreditCard, Store, Phone, Upload, ImageIcon, Palette, MessageCircle, Cake, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PillTabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { invalidateSettingsCache } from "@/lib/settings-cache";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const [activeTab, setActiveTab] = useState("profile");

  // Restore tab from sessionStorage after mount
  useEffect(() => {
    const saved = sessionStorage.getItem("settings-tab");
    if (saved) setActiveTab(saved);
  }, []);
  useEffect(() => {
    sessionStorage.setItem("settings-tab", activeTab);
  }, [activeTab]);
  const [saving, setSaving] = useState(false);

  // Profil
  const [profileName, setProfileName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  useEffect(() => {
    if (session?.user?.name) setProfileName(session.user.name);
  }, [session?.user?.name]);

  // Charger la date de naissance
  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.dateOfBirth) {
          setDateOfBirth(new Date(data.dateOfBirth).toISOString().slice(0, 10));
        }
      })
      .catch(() => {});
  }, []);

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
  const [logo, setLogo] = useState("");
  const [buttonColor, setButtonColor] = useState("#ea580c");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [birthdayDiscountEnabled, setBirthdayDiscountEnabled] = useState(false);
  const [birthdayDiscountType, setBirthdayDiscountType] = useState("PERCENTAGE");
  const [birthdayDiscountValue, setBirthdayDiscountValue] = useState("10");

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/settings").then((r) => r.json()).then((data) => {
        setSiteSettings(data);
        setRestaurantName(data.restaurantName || "");
        setDefaultPayment(data.defaultPaymentMethod || "BOTH");
        setPaymentPhoneNumber(data.paymentPhoneNumber || "");
        setDeliveryFee(String(data.deliveryFee || 0));
        setCurrency(data.currency || "XOF");
        setLogo(data.logo || "");
        setButtonColor(data.buttonColor || "#ea580c");
        setHeroTitle(data.heroTitle || "");
        setHeroSubtitle(data.heroSubtitle || "");
        setChatEnabled(data.chatEnabled !== false);
        setPickupEnabled(data.pickupEnabled === true);
        setBirthdayDiscountEnabled(data.birthdayDiscountEnabled === true);
        setBirthdayDiscountType(data.birthdayDiscountType || "PERCENTAGE");
        setBirthdayDiscountValue(String(data.birthdayDiscountValue || 10));
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
      // Sauvegarder le nom
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });

      // Sauvegarder la date de naissance
      await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth: dateOfBirth || null }),
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
      const body: any = { chatEnabled, pickupEnabled, restaurantName, defaultPaymentMethod: defaultPayment, paymentPhoneNumber: paymentPhoneNumber || null, deliveryFee: parseFloat(deliveryFee) || 0, currency, logo: logo || null, buttonColor: buttonColor || null, heroTitle: heroTitle || null, heroSubtitle: heroSubtitle || null, birthdayDiscountEnabled, birthdayDiscountType, birthdayDiscountValue: parseFloat(birthdayDiscountValue) || 0 };
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
        toast.success("Paramètres sauvegardés");
        invalidateSettingsCache();
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
    ...(isAdmin ? [{ key: "branding", label: "Apparence", icon: Palette }] : []),
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
                <label className="block text-[13px] text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-orange-400" /> Date de naissance
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-600 mt-1">Recevez un cadeau le jour de votre anniversaire</p>
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
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-orange-400" /> Messagerie
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-300">Activer le chat</p>
                    <p className="text-[11px] text-gray-600">Permet aux clients et livreurs de discuter</p>
                  </div>
                  <button type="button" onClick={() => setChatEnabled(!chatEnabled)} className={cn("relative w-11 h-6 rounded-full transition-colors", chatEnabled ? "bg-orange-600" : "bg-gray-700")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform", chatEnabled ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-400" /> À emporter
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-300">Activer le mode a emporter</p>
                    <p className="text-[11px] text-gray-600">Les clients peuvent venir chercher leur commande</p>
                  </div>
                  <button type="button" onClick={() => setPickupEnabled(!pickupEnabled)} className={cn("relative w-11 h-6 rounded-full transition-colors", pickupEnabled ? "bg-orange-600" : "bg-gray-700")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform", pickupEnabled ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
                  <Cake className="w-4 h-4 text-orange-400" /> Anniversaires
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-gray-300">Réduction anniversaire</p>
                      <p className="text-[11px] text-gray-600">Offrir une réduction le jour de l&apos;anniversaire des clients</p>
                    </div>
                    <button type="button" onClick={() => setBirthdayDiscountEnabled(!birthdayDiscountEnabled)}
                      className={cn("relative w-11 h-6 rounded-full transition-colors", birthdayDiscountEnabled ? "bg-orange-600" : "bg-gray-700")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform", birthdayDiscountEnabled ? "left-[22px]" : "left-0.5")} />
                    </button>
                  </div>
                  {birthdayDiscountEnabled && (
                    <div className="space-y-3 pl-1">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[13px] text-gray-400 mb-1.5">Type</label>
                          <select value={birthdayDiscountType} onChange={(e) => setBirthdayDiscountType(e.target.value)} className={selectClass}>
                            <option value="PERCENTAGE">Pourcentage (%)</option>
                            <option value="FIXED">Montant fixe (FCFA)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[13px] text-gray-400 mb-1.5">Valeur</label>
                          <input type="number" value={birthdayDiscountValue} onChange={(e) => setBirthdayDiscountValue(e.target.value)}
                            min="0" max={birthdayDiscountType === "PERCENTAGE" ? "100" : "999999"}
                            className={inputClass} />
                        </div>
                      </div>
                      <p className="text-[11px] text-orange-400/80">
                        {birthdayDiscountType === "PERCENTAGE"
                          ? `Les clients bénéficieront de ${birthdayDiscountValue}% de réduction`
                          : `Les clients bénéficieront de ${birthdayDiscountValue} FCFA de réduction`}
                        {" "}le jour de leur anniversaire
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={saveSiteSettings} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          )}

          {activeTab === "branding" && isAdmin && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-[15px] font-semibold text-white mb-4">Apparence & Branding</h2>

              {/* Logo */}
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Logo du restaurant</label>
                <div className="flex items-center gap-4">
                  {logo && (
                    <img loading="lazy" decoding="async" src={logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-700 bg-gray-800" />
                  )}
                  <div className="flex-1">
                    <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoUploading(true);
                      try {
                        const fd = new FormData(); fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        if (res.ok) { const { url } = await res.json(); setLogo(url); }
                        else toast.error("Erreur upload");
                      } catch { toast.error("Erreur réseau"); }
                      setLogoUploading(false);
                      if (e.target) e.target.value = "";
                    }} />
                    <button onClick={() => document.getElementById("logo-upload")?.click()} disabled={logoUploading}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-[13px] text-gray-300 hover:border-orange-500/50 transition-colors">
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {logoUploading ? "Import..." : "Choisir un logo"}
                    </button>
                    {logo && <button onClick={() => setLogo("")} className="text-[11px] text-red-400 mt-1 hover:underline block">Supprimer</button>}
                  </div>
                </div>
              </div>

              {/* Couleur boutons */}
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Couleur des boutons</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-transparent" />
                  <input type="text" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)}
                    placeholder="#ea580c" className={inputClass + " flex-1"} />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">Couleur principale des boutons et accents</p>
              </div>

              {/* Hero titre */}
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Titre du héro</label>
                <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="Ex: Savourez nos plats, livrés chez vous" className={inputClass} />
                <p className="text-[11px] text-gray-600 mt-1">Titre principal affiché sur la page d&apos;accueil</p>
              </div>

              {/* Hero sous-titre */}
              <div>
                <label className="block text-[13px] text-gray-400 mb-1.5">Sous-titre du héro</label>
                <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Ex: Découvrez notre menu et commandez vos repas préférés..."
                  rows={3} className={inputClass + " resize-none"} />
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
              <div className="border-t border-gray-800 pt-4">
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
