"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { getCachedSettings } from "@/lib/settings-cache";
import { GlobalDriverChat } from "@/components/chat/global-driver-chat";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { open, toggle, close } = useSidebar();
  const [brandColor, setBrandColor] = useState("#ea580c");

  useEffect(() => {
    getCachedSettings().then((s) => {
      if (s.buttonColor) setBrandColor(s.buttonColor);
      if (s.restaurantName) document.title = s.restaurantName;
    });
  }, []);

  return (
    <div
      className="flex min-h-screen bg-gray-950 brand-theme"
      style={{ "--brand": brandColor } as React.CSSProperties}
    >
      <Sidebar open={open} onClose={close} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={toggle} />
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
      <GlobalDriverChat />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <LayoutInner>{children}</LayoutInner>
      </SidebarProvider>
    </SessionProvider>
  );
}
