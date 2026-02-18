"use client";

import { useState, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { getCachedSettings } from "@/lib/settings-cache";
import { usePush } from "@/hooks/use-push";
import { BirthdayConfetti } from "@/components/birthday-confetti";
import { BirthdayDialog } from "@/components/birthday-dialog";

function PushRegistration() {
  const { isSupported, permission, subscribe } = usePush();

  return isSupported && permission === "default" ? (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 z-50 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl">
      <p className="text-[13px] text-gray-300 mb-2">Activez les notifications pour ne rien manquer</p>
      <button
        onClick={subscribe}
        className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[13px] font-medium transition-colors"
      >
        Activer les notifications
      </button>
    </div>
  ) : null;
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { open, toggle, close } = useSidebar();
  const { data: session } = useSession();
  const [brandColor, setBrandColor] = useState("#ea580c");
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    getCachedSettings().then((s) => {
      if (s.buttonColor) setBrandColor(s.buttonColor);
      if (s.restaurantName) document.title = s.restaurantName;
    });
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-900 brand-theme"
      style={{ "--brand": brandColor } as React.CSSProperties}
    >
      <div className="no-print"><Sidebar open={open} onClose={close} /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print shrink-0"><TopBar onMenuToggle={toggle} /></div>
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 overflow-y-auto">{children}</main>
      </div>
      <div className="no-print"><MobileNav /></div>
      <div className="no-print"><PushRegistration /></div>
      <div className="no-print"><BirthdayConfetti /></div>
      <div className="no-print">{isAdmin && <BirthdayDialog />}</div>
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
