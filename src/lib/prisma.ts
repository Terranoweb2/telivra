import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

// === AsyncLocalStorage pour le contexte tenant ===
export const tenantStorage = new AsyncLocalStorage<string>();

// === Cache des PrismaClient par databaseUrl ===
interface CacheEntry {
  client: PrismaClient;
  pool: pg.Pool;
  lastUsed: number;
}

const clientCache = new Map<string, CacheEntry>();
const MAX_CLIENTS = 20;
const CLIENT_IDLE_MS = 10 * 60 * 1000; // 10 minutes

function createClientForUrl(databaseUrl: string): CacheEntry {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return { client, pool, lastUsed: Date.now() };
}

function getOrCreateClient(databaseUrl: string): PrismaClient {
  let entry = clientCache.get(databaseUrl);
  if (entry) {
    entry.lastUsed = Date.now();
    return entry.client;
  }

  // Éviction LRU si cache plein
  if (clientCache.size >= MAX_CLIENTS) {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [url, e] of clientCache) {
      if (e.lastUsed < oldestTime) {
        oldestTime = e.lastUsed;
        oldest = url;
      }
    }
    if (oldest) {
      const old = clientCache.get(oldest)!;
      old.client.$disconnect().catch(() => {});
      old.pool.end().catch(() => {});
      clientCache.delete(oldest);
      console.log("[Prisma] Evicted idle tenant client");
    }
  }

  entry = createClientForUrl(databaseUrl);
  clientCache.set(databaseUrl, entry);
  return entry.client;
}

// === Client par défaut (DATABASE_URL) ===
const globalForPrisma = globalThis as unknown as { __defaultPrisma?: PrismaClient };

if (!globalForPrisma.__defaultPrisma) {
  const entry = createClientForUrl(process.env.DATABASE_URL!);
  globalForPrisma.__defaultPrisma = entry.client;
}

const defaultClient = globalForPrisma.__defaultPrisma!;

// === Helper: tente de lire le header tenant injecté par server.ts ===
function getTenantDbUrlFromHeaders(): string | undefined {
  try {
    // Dynamic import inline pour éviter l'erreur hors contexte requête
    const { headers } = require("next/headers");
    const h = headers();
    // headers() peut retourner un Promise en Next.js 15+ — on gère les deux cas
    if (h && typeof h.get === "function") {
      return h.get("x-tenant-db-url") || undefined;
    }
  } catch {
    // Pas dans un contexte de requête Next.js (cron, socket, etc.)
  }
  return undefined;
}

// === Proxy transparent : redirige vers le bon client selon le contexte tenant ===
export const prisma: PrismaClient = new Proxy(defaultClient, {
  get(target, prop, receiver) {
    // 1. AsyncLocalStorage (server.ts wrapping)
    let tenantDbUrl = tenantStorage.getStore();
    // 2. Fallback: header injecté par server.ts, lu via next/headers
    if (!tenantDbUrl) {
      tenantDbUrl = getTenantDbUrlFromHeaders();
    }
    const client = tenantDbUrl ? getOrCreateClient(tenantDbUrl) : target;
    return Reflect.get(client, prop, receiver);
  },
}) as PrismaClient;

// === Nettoyage périodique des clients idle ===
export function cleanupIdleClients() {
  const now = Date.now();
  for (const [url, entry] of clientCache) {
    if (now - entry.lastUsed > CLIENT_IDLE_MS) {
      entry.client.$disconnect().catch(() => {});
      entry.pool.end().catch(() => {});
      clientCache.delete(url);
      console.log("[Prisma] Cleaned up idle tenant client");
    }
  }
}
