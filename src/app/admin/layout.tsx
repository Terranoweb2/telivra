import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telivra Admin",
  description: "Administration de la plateforme Telivra",
  manifest: "/manifest-admin.json",
  themeColor: "#8b5cf6",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
