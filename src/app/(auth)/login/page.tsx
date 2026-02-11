"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin } from "lucide-react";

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
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-800 shadow-2xl mx-4 sm:mx-0">
      <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
        <div className="bg-blue-600 p-2 rounded-lg">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Terrano GPS</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@terranogps.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Mot de passe</label>
          <input
            name="password"
            type="password"
            required
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
