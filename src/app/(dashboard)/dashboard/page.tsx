import { Cpu, Car, Route, Bell, MapPin, Activity, Gauge, Battery } from "lucide-react";

const stats = [
  { label: "Appareils actifs", value: "0", icon: Cpu, color: "bg-blue-600" },
  { label: "Vehicules", value: "0", icon: Car, color: "bg-green-600" },
  { label: "Trajets aujourd'hui", value: "0", icon: Route, color: "bg-purple-600" },
  { label: "Alertes non lues", value: "0", icon: Bell, color: "bg-red-600" },
  { label: "Positions recues", value: "0", icon: MapPin, color: "bg-yellow-600" },
  { label: "Appareils en ligne", value: "0", icon: Activity, color: "bg-cyan-600" },
  { label: "Vitesse moy.", value: "0 km/h", icon: Gauge, color: "bg-orange-600" },
  { label: "Batterie faible", value: "0", icon: Battery, color: "bg-pink-600" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre flotte</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 truncate">{stat.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg shrink-0`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Derniers trajets</h3>
          <p className="text-gray-500 text-sm">Aucun trajet enregistre</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Alertes recentes</h3>
          <p className="text-gray-500 text-sm">Aucune alerte</p>
        </div>
      </div>
    </div>
  );
}
