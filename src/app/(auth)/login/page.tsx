"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed, Loader2, KeyRound, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getCachedSettings } from "@/lib/settings-cache";

type Step = "login" | "verify" | "done";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const emailVal = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email: emailVal,
      password,
      redirect: false,
    });

    if (result?.error) {
      try {
        const checkRes = await fetch("/api/auth/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal }),
        });
        const checkData = await checkRes.json();

        if (checkData.blocked) {
          const msg = "Votre compte a ete desactive. Vous ne faites plus partie du staff du restaurant.";
          setError(msg);
          toast.error(msg);
        } else if (checkData.emailNotVerified) {
          setEmail(emailVal);
          try {
            await fetch("/api/auth/verify-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: emailVal, resend: true }),
            });
          } catch {}
          setStep("verify");
          toast.info("Veuillez verifier votre email");
        } else {
          setError("Email ou mot de passe incorrect");
          toast.error("Email ou mot de passe incorrect");
        }
      } catch {
        setError("Email ou mot de passe incorrect");
        toast.error("Email ou mot de passe incorrect");
      }
      setLoading(false);
    } else {
      toast.success("Connexion reussie");
      router.push("/dashboard");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("done");
        toast.success("Email verifie !");
      } else {
        setError(data.error || "Code invalide");
        toast.error(data.error || "Code invalide");
      }
    } catch {
      setError("Erreur reseau");
      toast.error("Erreur reseau");
    }
    setLoading(false);
  }

  async function handleResend() {
    setLoading(true);
    try {
      await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resend: true }),
      });
      toast.success("Nouveau code envoye");
    } catch {
      toast.error("Erreur reseau");
    }
    setLoading(false);
  }

  const c = brand.color;

  return (
    <div className="bg-gray-950 sm:rounded-2xl p-6 sm:p-8 border-y sm:border border-gray-800 shadow-2xl shadow-black/40 w-full">
      <div className="flex flex-col items-center mb-8">
        {brand.logo ? (
          <Image src={brand.logo} alt={brand.name} width={56} height={56} className="rounded-2xl mb-3 object-cover" />
        ) : (
          <div className="p-3 rounded-2xl mb-3" style={{ backgroundColor: c }}>
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
        )}
        <h1 className="text-xl font-bold text-white">{brand.name}</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {step === "login" && "Connectez-vous a votre compte"}
          {step === "verify" && "Verifiez votre email"}
          {step === "done" && "Email verifie !"}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[13px] mb-4">
          {error}
        </div>
      )}

      {step === "login" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-400 mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
              style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] text-gray-400">Mot de passe</label>
              <Link href="/forgot-password" className="text-[12px] hover:brightness-125 transition-all" style={{ color: c }}>
                Mot de passe oublie ?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors"
              style={{ "--tw-ring-color": `${c}80` } as React.CSSProperties}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-[14px] flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : "Se connecter"}
          </button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="rounded-xl px-4 py-3 mb-2" style={{ backgroundColor: `${c}1a`, borderWidth: 1, borderColor: `${c}33` }}>
            <p className="text-[13px]" style={{ color: c }}>
              Votre email n&apos;est pas encore verifie. Un code a ete envoye a <span className="font-semibold">{email}</span>
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

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-[14px] flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verification...</> : "Verifier"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="w-full py-2 text-gray-500 hover:text-gray-400 text-[13px] flex items-center justify-center gap-1.5 transition-colors"
          >
            Renvoyer le code
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
            Votre email a ete verifie. Vous pouvez maintenant vous connecter.
          </p>
          <button
            onClick={() => { setStep("login"); setCode(""); setError(""); }}
            className="block w-full py-2.5 text-white font-semibold rounded-xl transition-all text-[14px] text-center hover:brightness-110"
            style={{ backgroundColor: c }}
          >
            Se connecter
          </button>
        </div>
      )}

      {step === "login" && (
        <p className="text-center text-gray-600 text-[13px] mt-6">
          Pas encore de compte ?{" "}
          <Link href="/register" className="hover:brightness-125 transition-all" style={{ color: c }}>
            S&apos;inscrire
          </Link>
        </p>
      )}
    </div>
  );
}
