"use client";

import { useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, Loader2, Mail, KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Step = "email" | "code" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        toast.success("Code envoyé par email");
      } else {
        const data = await res.json();
        const msg = data.error || "Erreur lors de l'envoi";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError("Erreur réseau");
      toast.error("Erreur réseau");
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
        toast.success("Mot de passe réinitialisé !");
      } else {
        const msg = data.error || "Erreur lors de la réinitialisation";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError("Erreur réseau");
      toast.error("Erreur réseau");
    }
    setLoading(false);
  }

  return (
    <div className="bg-gray-950 sm:rounded-2xl p-6 sm:p-8 border-y sm:border border-gray-800 shadow-2xl shadow-black/40 w-full">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-orange-600 p-3 rounded-2xl mb-3">
          <UtensilsCrossed className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Terrano</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {step === "email" && "Réinitialiser votre mot de passe"}
          {step === "code" && "Entrez le code reçu"}
          {step === "done" && "Mot de passe réinitialisé !"}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[13px] mb-4">
          {error}
        </div>
      )}

      {/* Etape 1 : Saisie email */}
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
                className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <p className="text-[12px] text-gray-600">
            Un code de vérification sera envoyé à cette adresse.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-[14px] flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : "Envoyer le code"}
          </button>
        </form>
      )}

      {/* Etape 2 : Code + nouveau mot de passe */}
      {step === "code" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 mb-2">
            <p className="text-[13px] text-orange-400">
              Un code à 6 chiffres a été envoyé à <span className="font-semibold">{email}</span>
            </p>
          </div>

          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Code de vérification</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] text-center tracking-[0.5em] font-mono placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
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
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              placeholder="6 caractères minimum"
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
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-[14px] flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</> : "Réinitialiser le mot de passe"}
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

      {/* Etape 3 : Succes */}
      {step === "done" && (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <p className="text-[14px] text-gray-300">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-colors text-[14px] text-center"
          >
            Se connecter
          </Link>
        </div>
      )}

      {step !== "done" && (
        <p className="text-center text-gray-600 text-[13px] mt-6">
          <Link href="/login" className="text-orange-400 hover:text-orange-300">
            Retour à la connexion
          </Link>
        </p>
      )}
    </div>
  );
}
