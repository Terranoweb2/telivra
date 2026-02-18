import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telivra Cuisine",
  description: "Espace cuisinier - Gérez les commandes en cuisine",
  manifest: "/manifest-kitchen.json",
  themeColor: "#f59e0b",
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
