"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut, Menu, User, Settings, ChevronDown } from "lucide-react";
import { AlertBell } from "./alert-bell";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const userName = session?.user?.name || "Utilisateur";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="h-14 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Gauche : toggle sidebar desktop uniquement */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg hidden lg:block"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-sm lg:hidden">Terrano</span>
      </div>

      {/* Droite : alertes + avatar dropdown */}
      <div className="flex items-center gap-3">
        <AlertBell />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-800/60 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Parametres
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Deconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
