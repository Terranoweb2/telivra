"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { MapPin, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      // Connexion automatique apres inscription
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur reseau");
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-2xl mx-4 sm:mx-0">
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Terrano GPS</h1>
      </div>

      <p className="text-center text-gray-400 text-sm mb-6">Creer un compte client</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Nom complet</label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Jean Dupont"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="jean@exemple.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Mot de passe</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="6 caracteres minimum"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmer le mot de passe</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</> : "S'inscrire"}
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-5">
        Deja un compte ?{" "}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
