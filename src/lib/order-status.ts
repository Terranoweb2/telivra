export const orderStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  ACCEPTED: { label: "Acceptée", color: "bg-orange-500/20 text-orange-400" },
  PREPARING: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400" },
  READY: { label: "Prêt", color: "bg-cyan-500/20 text-cyan-400" },
  PICKED_UP: { label: "Récupérée", color: "bg-indigo-500/20 text-indigo-400" },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400" },
  DELIVERED: { label: "Livrée", color: "bg-green-500/20 text-green-400" },
  CANCELLED: { label: "Annulée", color: "bg-red-500/20 text-red-400" },
};

export const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  ONLINE: "En ligne",
  BOTH: "Les deux",
};
