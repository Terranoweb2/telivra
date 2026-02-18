import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telivra Livreur",
  description: "Espace livreur - Livraisons et suivi GPS",
  manifest: "/manifest-driver.json",
  themeColor: "#22c55e",
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
