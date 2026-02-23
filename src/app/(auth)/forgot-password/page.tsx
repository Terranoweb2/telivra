"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed, Loader2, Mail, KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getCachedSettings } from "@/lib/settings-cache";

type Step = "email" | "code" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState({ name: "Restaurant", color: "#ea580c", logo: null as string | null });

  useEffect(() => {
    getCachedSettings().then((s) => {
      setBrand({
        name: s.restaurantName || "Restaurant",
        color: s.buttonColor || "#ea580c",
        logo: s.logo,
      });
    });
  }, []);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStep("code");
        toast.success("Code envoye par email");
      } else {
        const data = await res.json();
        const msg = data.error || "Erreur lors de l'envoi";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError("Erreur reseau");
      toast.error("Erreur reseau");
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep("done");
        toast.success("Mot de passe reinitialise !");
      } else {
        const msg = data.error || "Erreur lors de la reinitialisation";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError("Erreur reseau");
      toast.error("Erreur reseau");
    }
    setLoading(false);
  }

  const c = brand.color;

  return (
    <div className="bg-gray-950 sm:rounded-2xl p-6 sm:p-8 border-y sm:border border-gray-800 shadow-2xl shadow-black/40 w-full">
      <div className="flex flex-col items-center mb-6">
        {brand.logo ? (
          <Image src={brand.logo} alt={brand.name} width={56} height={56} className="rounded-2xl mb-3 object-cover" />
        ) : (
          <div className="p-3 rounded-2xl mb-3" style={{ backgroundColor: c }}>
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
        )}
        <h1 className="text-xl font-bold text-white">{brand.name}</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {step === "email" && "Reinitialiser votre mot de passe"}
          {step === "code" && "Entrez le code recu"}
          {step === "done" && "Mot de passe reinitialise !"}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[13px] mb-4">
          {error}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Email du compte</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
                style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <p className="text-[12px] text-gray-600">
            Un code de verification sera envoye a cette adresse.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-[14px] flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : "Envoyer le code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="rounded-xl px-4 py-3 mb-2" style={{ backgroundColor: `${c}1a`, borderWidth: 1, borderColor: `${c}33` }}>
            <p className="text-[13px]" style={{ color: c }}>
              Un code a 6 chiffres a ete envoye a <span className="font-semibold">{email}</span>
            </p>
          </div>

          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Code de verification</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] text-center tracking-[0.5em] font-mono placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
                style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
                placeholder="000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
              style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
              placeholder="6 caracteres minimum"
            />
          </div>

          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Confirmer</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
              style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-[14px] flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verification...</> : "Reinitialiser le mot de passe"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
            className="w-full py-2 text-gray-500 hover:text-gray-400 text-[13px] flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Changer d&apos;email
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <p className="text-[14px] text-gray-300">
            Votre mot de passe a ete reinitialise avec succes.
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 text-white font-semibold rounded-xl transition-all text-[14px] text-center hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            Se connecter
          </Link>
        </div>
      )}

      {step !== "done" && (
        <p className="text-center text-gray-600 text-[13px] mt-6">
          <Link href="/login" className="hover:brightness-125 transition-all" style={{ color: c }}>
            Retour a la connexion
          </Link>
        </p>
      )}
    </div>
  );
}
