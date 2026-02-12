"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      toast.success("Connexion réussie");
      router.push("/dashboard");
    }
  }

  return (
    <div className="bg-[#1c1c1e] sm:rounded-2xl p-6 sm:p-8 border-y sm:border border-white/[0.06] shadow-2xl shadow-black/40 w-full">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-orange-600 p-3 rounded-2xl mb-3">
          <UtensilsCrossed className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Terrano</h1>
        <p className="text-[13px] text-gray-500 mt-1">Connectez-vous à votre compte</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-[13px]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[13px] text-gray-400 mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] text-gray-400">Mot de passe</label>
            <Link href="/forgot-password" className="text-[12px] text-orange-400 hover:text-orange-300 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            required
            className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-[14px] placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-[14px] flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</> : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-gray-600 text-[13px] mt-6">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-orange-400 hover:text-orange-300">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
