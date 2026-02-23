"use client";
import { useMemo } from "react";

export function useTenant() {
  const slug = useMemo(() => {
    if (typeof window === "undefined") return null;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
    if (!baseDomain) return null;
    const hostname = window.location.hostname;
    if (hostname.endsWith("." + baseDomain)) {
      return hostname.replace("." + baseDomain, "");
    }
    return null;
  }, []);

  return { slug, isTenant: !!slug };
}
