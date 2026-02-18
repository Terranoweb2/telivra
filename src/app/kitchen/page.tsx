"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { ChefHat, Loader2, Eye, EyeOff, Flame } from "lucide-react";

function KitchenLoginInner() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Identifiants incorrects");
      setLoading(false);
    } else {
      router.push("/cuisine");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_60%)]" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Telivra <span className="text-amber-400">Cuisine</span></h1>
          <p className="text-gray-500 text-sm mt-1">Espace cuisinier</p>
        </div>

        {/* Stats mini */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Commandes en direct</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="cuisinier@telivra.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
            Accéder à la cuisine
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Pas cuisinier ? <a href="/" className="text-amber-500 hover:underline">Retour à l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <SessionProvider>
      <KitchenLoginInner />
    </SessionProvider>
  );
}
