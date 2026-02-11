"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Map,
  Cpu,
  Car,
  Users,
  Package,
  Route,
  Shield,
  Bell,
  Navigation,
  Settings,
  MapPin,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Carte", href: "/map", icon: Map },
  { label: "Appareils", href: "/devices", icon: Cpu },
  { label: "Vehicules", href: "/vehicles", icon: Car },
  { label: "Personnes", href: "/persons", icon: Users },
  { label: "Assets", href: "/assets", icon: Package },
  { label: "Trajets", href: "/trips", icon: Route },
  { label: "Geofences", href: "/geofences", icon: Shield },
  { label: "Alertes", href: "/alerts", icon: Bell },
  { label: "Navigation", href: "/navigate", icon: Navigation },
  { label: "Parametres", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Terrano GPS</span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
