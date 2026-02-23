import { headers } from "next/headers";
import { tenantStorage } from "./prisma";

type RouteHandler = (...args: any[]) => Promise<Response>;

export function withTenant(handler: RouteHandler): RouteHandler {
  return async (...args: any[]) => {
    // Try ALS first (set by server.ts)
    if (tenantStorage.getStore()) {
      return handler(...args);
    }
    // Fallback: read header injected by server.ts
    try {
      const h = await headers();
      const dbUrl = h.get("x-tenant-db-url");
      if (dbUrl) {
        return tenantStorage.run(dbUrl, () => handler(...args));
      }
    } catch {}
    return handler(...args);
  };
}
