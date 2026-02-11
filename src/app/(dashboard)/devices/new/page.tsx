"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewDevicePage() {
  const router = useRouter();
  const [type, setType] = useState("VEHICLE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body: any = {
      name: fd.get("name"),
      serialNumber: fd.get("serialNumber"),
      type,
    };

    if (type === "VEHICLE") {
      body.vehicle = {
        brand: fd.get("brand"),
        model: fd.get("model"),
        year: fd.get("year") ? Number(fd.get("year")) : undefined,
        licensePlate: fd.get("licensePlate"),
        color: fd.get("color") || undefined,
        fuelType: fd.get("fuelType") || "GASOLINE",
      };
    } else if (type === "PERSON") {
      body.person = {
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        phone: fd.get("phone") || undefined,
        email: fd.get("personEmail") || undefined,
        role: fd.get("personRole") || undefined,
      };
    } else {
      body.asset = {
        name: fd.get("assetName"),
        category: fd.get("category"),
        description: fd.get("description") || undefined,
        value: fd.get("value") ? Number(fd.get("value")) : undefined,
      };
    }

    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/devices");
    } else {
      const data = await res.json();
      setError(data.error?.fieldErrors ? "Verifiez les champs" : "Erreur lors de la creation");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/devices" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Nouvel appareil</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-white font-semibold">Informations generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nom de l'appareil</label>
              <input name="name" required placeholder="Ex: Tracker Toyota" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Numero de serie</label>
              <input name="serialNumber" required placeholder="Ex: TRK-001" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {["VEHICLE", "PERSON", "ASSET"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    type === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {t === "VEHICLE" ? "Vehicule" : t === "PERSON" ? "Personne" : "Asset"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {type === "VEHICLE" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
            <h2 className="text-white font-semibold">Details du vehicule</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>Marque</label><input name="brand" required placeholder="Toyota" className={inputClass} /></div>
              <div><label className={labelClass}>Modele</label><input name="model" required placeholder="Hilux" className={inputClass} /></div>
              <div><label className={labelClass}>Plaque</label><input name="licensePlate" required placeholder="AB-123-CD" className={inputClass} /></div>
              <div><label className={labelClass}>Annee</label><input name="year" type="number" placeholder="2024" className={inputClass} /></div>
              <div><label className={labelClass}>Couleur</label><input name="color" placeholder="Blanc" className={inputClass} /></div>
              <div>
                <label className={labelClass}>Carburant</label>
                <select name="fuelType" className={inputClass}>
                  <option value="GASOLINE">Essence</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="ELECTRIC">Electrique</option>
                  <option value="HYBRID">Hybride</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {type === "PERSON" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
            <h2 className="text-white font-semibold">Details de la personne</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>Prenom</label><input name="firstName" required placeholder="Jean" className={inputClass} /></div>
              <div><label className={labelClass}>Nom</label><input name="lastName" required placeholder="Dupont" className={inputClass} /></div>
              <div><label className={labelClass}>Telephone</label><input name="phone" placeholder="+33 6 12 34 56 78" className={inputClass} /></div>
              <div><label className={labelClass}>Email</label><input name="personEmail" type="email" placeholder="jean@mail.com" className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Role</label><input name="personRole" placeholder="Livreur, Technicien..." className={inputClass} /></div>
            </div>
          </div>
        )}

        {type === "ASSET" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
            <h2 className="text-white font-semibold">Details de l'asset</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>Nom</label><input name="assetName" required placeholder="Generateur" className={inputClass} /></div>
              <div><label className={labelClass}>Categorie</label><input name="category" required placeholder="Equipement" className={inputClass} /></div>
              <div><label className={labelClass}>Valeur (EUR)</label><input name="value" type="number" step="0.01" placeholder="5000" className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Description</label><input name="description" placeholder="Description..." className={inputClass} /></div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Creation..." : "Creer l'appareil"}
        </button>
      </form>
    </div>
  );
}
