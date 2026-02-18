"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { Bike, Loader2, Eye, EyeOff, MapPin, Navigation } from "lucide-react";

function DriverLoginInner() {
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
      router.push("/livraison/driver");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.08),transparent_60%)]" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20 mb-4">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Telivra <span className="text-green-400">Livreur</span></h1>
          <p className="text-gray-500 text-sm mt-1">Espace livreur</p>
        </div>

        {/* Stats mini */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-xs">Suivi GPS</span>
          </div>
          <div className="w-px h-3 bg-gray-800" />
          <div className="flex items-center gap-2 text-gray-500">
            <Navigation className="w-4 h-4 text-green-500" />
            <span className="text-xs">Navigation</span>
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
              placeholder="livreur@telivra.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
            Commencer les livraisons
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Pas livreur ? <a href="/" className="text-green-500 hover:underline">Retour à l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}

export default function DriverPage() {
  return (
    <SessionProvider>
      <DriverLoginInner />
    </SessionProvider>
  );
}
