"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bell,
  Settings,
  X,
  ShoppingBag,
  ClipboardList,
  Users,
  Truck,
  Package,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: null },
  { label: "Cuisine", href: "/cuisine", icon: ChefHat, roles: ["COOK", "ADMIN"] },
  { label: "Commander", href: "/livraison", icon: ShoppingBag, roles: ["ADMIN", "CLIENT"] },
  { label: "Commandes", href: "/livraison/order", icon: ClipboardList, roles: ["ADMIN", "CLIENT", "DRIVER", "COOK"] },
  { label: "Alertes", href: "/alerts", icon: Bell, roles: ["ADMIN", "MANAGER", "VIEWER"] },
];

const adminItems = [
  { label: "Produits", href: "/products", icon: Package },
  { label: "Utilisateurs", href: "/users", icon: Users },
  { label: "Livreurs", href: "/drivers", icon: Truck },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";

  const filteredItems = navItems.filter(
    (item) => item.roles === null || item.roles.includes(role)
  );

  const isAdmin = role === "ADMIN";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-[#1c1c1e] border-r border-white/[0.06] flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="bg-orange-600 p-2 rounded-xl">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Terrano</span>
          </Link>
          <button onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = item.href === "/livraison"
              ? pathname === "/livraison"
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-orange-600/15 text-orange-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}>
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-5 pb-2 px-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Administration</p>
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-orange-600/15 text-orange-400"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}>
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          <div className="pt-4">
            <Link href="/settings" onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-orange-600/15 text-orange-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}>
              <Settings className="w-[18px] h-[18px] shrink-0" />
              Parametres
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
