"use client";

import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
