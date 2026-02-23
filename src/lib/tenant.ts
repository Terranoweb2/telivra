import pg from "pg";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface TenantInfo {
  slug: string;
  databaseUrl: string;
  isBlocked: boolean;
  blockReason: string | null;
  maintenanceMode: boolean;
  name: string;
}

export interface BlockedPageSettings {
  blockedPageTitle: string;
  blockedPageSubtitle: string | null;
  blockedPageContent: string | null;
  blockedPageFeatures: { icon: string; title: string; desc: string }[];
  blockedPageButtonText: string | null;
  blockedPageButtonUrl: string | null;
  blockedPageEmail: string | null;
  blockedPageLogo: string | null;
}

// Cache mémoire des tenants
let tenantCache = new Map<string, TenantInfo>();
let lastRefresh = 0;
const REFRESH_INTERVAL = 15_000; // 15 secondes (était 60s)

// Cache platform settings
let blockedPageCache: BlockedPageSettings | null = null;

// Flag pour éviter les refreshes concurrents
let refreshInProgress: Promise<void> | null = null;

const MASTER_DB_URL = process.env.MASTER_DATABASE_URL || "";
const ENCRYPTION_KEY = process.env.TENANT_ENCRYPTION_KEY || "";

// Chiffrement AES-256-GCM
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text;
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + tag + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY || !encryptedText.includes(":")) return encryptedText;
  try {
    const [ivHex, tagHex, encrypted] = encryptedText.split(":");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(ENCRYPTION_KEY, "hex"),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encryptedText;
  }
}

// Pool master partagé (lazy)
let masterPool: pg.Pool | null = null;

function getMasterPool(): pg.Pool {
  if (!masterPool) {
    masterPool = new pg.Pool({
      connectionString: MASTER_DB_URL,
      max: 3,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 60000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return masterPool;
}

// Pause utilitaire pour retry
function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function doRefresh(): Promise<void> {
  if (!MASTER_DB_URL) return;

  const MAX_RETRIES = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const pool = getMasterPool();

      // Refresh tenants
      const result = await pool.query(
        'SELECT slug, "databaseUrl", "isBlocked", "blockReason", "maintenanceMode", name FROM tenants'
      );
      const newCache = new Map<string, TenantInfo>();
      for (const row of result.rows) {
        newCache.set(row.slug, {
          slug: row.slug,
          databaseUrl: decrypt(row.databaseUrl),
          isBlocked: row.isBlocked,
          blockReason: row.blockReason,
          maintenanceMode: row.maintenanceMode ?? false,
          name: row.name,
        });
      }
      tenantCache = newCache;

      // Refresh platform settings (blocked page)
      const settingsResult = await pool.query(
        `SELECT "blockedPageTitle", "blockedPageSubtitle", "blockedPageContent",
                "blockedPageFeatures", "blockedPageButtonText", "blockedPageButtonUrl",
                "blockedPageEmail", "blockedPageLogo"
         FROM platform_settings WHERE id = 'default'`
      );
      if (settingsResult.rows.length > 0) {
        const s = settingsResult.rows[0];
        blockedPageCache = {
          blockedPageTitle: s.blockedPageTitle || "Restaurant indisponible",
          blockedPageSubtitle: s.blockedPageSubtitle || null,
          blockedPageContent: s.blockedPageContent || null,
          blockedPageFeatures: Array.isArray(s.blockedPageFeatures) ? s.blockedPageFeatures : [],
          blockedPageButtonText: s.blockedPageButtonText || null,
          blockedPageButtonUrl: s.blockedPageButtonUrl || null,
          blockedPageEmail: s.blockedPageEmail || null,
          blockedPageLogo: s.blockedPageLogo || null,
        };
        console.log(`[Tenant] Blocked page settings loaded: "${s.blockedPageTitle}", ${(blockedPageCache.blockedPageFeatures || []).length} features`);
      } else {
        console.log("[Tenant] No platform_settings row found");
      }

      lastRefresh = Date.now();
      console.log(`[Tenant] Cache refreshed: ${newCache.size} tenant(s)`);
      return; // Succès, on sort
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`[Tenant] Cache refresh attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${attempt}s...`);
        // Recréer le pool si erreur de connexion
        if (masterPool) {
          try { masterPool.end(); } catch {}
          masterPool = null;
        }
        await sleep(attempt * 1000);
      }
    }
  }
  console.error(`[Tenant] Cache refresh failed after ${MAX_RETRIES} attempts:`, lastErr);
}

// Refresh public avec protection anti-concurrent
export async function refreshTenantCache(): Promise<void> {
  if (refreshInProgress) return refreshInProgress;
  refreshInProgress = doRefresh().finally(() => { refreshInProgress = null; });
  return refreshInProgress;
}

export function getTenant(slug: string): TenantInfo | undefined {
  return tenantCache.get(slug);
}

export function getAllTenants(): TenantInfo[] {
  return Array.from(tenantCache.values());
}

export function getBlockedPageSettings(): BlockedPageSettings | null {
  return blockedPageCache;
}

export function shouldRefreshCache(): boolean {
  return Date.now() - lastRefresh > REFRESH_INTERVAL;
}

export function getTenantCount(): number {
  return tenantCache.size;
}
