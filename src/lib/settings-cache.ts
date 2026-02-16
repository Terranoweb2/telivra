export interface SiteSettings {
  restaurantName: string;
  defaultPaymentMethod: string;
  paymentPhoneNumber: string | null;
  deliveryFee: number;
  currency: string;
  logo: string | null;
  buttonColor: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
}

const CACHE_KEY = "site-settings-v1";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

const DEFAULTS: SiteSettings = {
  restaurantName: "Mon Restaurant",
  defaultPaymentMethod: "BOTH",
  paymentPhoneNumber: null,
  deliveryFee: 0,
  currency: "XOF",
  logo: null,
  buttonColor: null,
  heroTitle: null,
  heroSubtitle: null,
};

export async function getCachedSettings(): Promise<SiteSettings> {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) return { ...DEFAULTS, ...data };
      }
    } catch {}
  }

  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return DEFAULTS;
    const data = await res.json();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      } catch {}
    }

    return { ...DEFAULTS, ...data };
  } catch {
    return DEFAULTS;
  }
}

export function invalidateSettingsCache() {
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }
}
