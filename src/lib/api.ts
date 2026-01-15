const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Expect NEXT_PUBLIC_API_BASE_URL like:
 *   https://kiosk-backend-c0ba.onrender.com
 * or
 *   https://kiosk-backend-c0ba.onrender.com/api/v1
 */
function normalizeBase(raw?: string) {
  if (!raw) return null;
  const base = raw.replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

const BASE = normalizeBase(RAW_BASE);

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin_token");
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  if (!BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, cache: "no-store" });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text || null;
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && (json.detail || json.message)) ||
      (typeof json === "string" ? json : null) ||
      `Request failed (${res.status})`;

    // If token is bad, clear it so UI can relogin cleanly.
    if (res.status === 401) clearToken();

    throw new Error(msg);
  }

  return json as T;
}

// ---------- Types (match backend) ----------
export type AdminLoginOut = { access_token: string; token_type?: string };
export type AdminStore = { store_id: string; name: string; active: boolean };

export type CatalogExport = {
  categories: Array<{ id: string; name: string; sort: number; imageUrl?: string | null; active: boolean }>;
  products: Array<{
    id: string;
    categoryId: string;
    name: string;
    description: string;
    basePriceCents: number;
    imageUrl?: string | null;
    active: boolean;
  }>;
  modifierGroups: Array<{
    id: string;
    productId: string;
    title: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    uiType: "radio" | "chips";
    active: boolean;
    sort: number;
  }>;
  modifierOptions: Array<{
    id: string;
    groupId: string;
    name: string;
    deltaCents: number;
    active: boolean;
    sort: number;
  }>;
};

export const api = {
  // -------- AUTH --------
  adminLogin: (email: string, password: string) =>
    request<AdminLoginOut>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // -------- STORES --------
  listStores: () => request<AdminStore[]>("/admin/stores"),
  createStore: (store_id: string, name: string, password: string, tax_rate: number) =>
    request("/admin/stores", {
      method: "POST",
      body: JSON.stringify({ store_id, name, password, tax_rate }),
    }),
  resetStorePassword: (store_id: string, password: string) =>
    request(`/admin/stores/${encodeURIComponent(store_id)}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  // -------- CATALOG (one global catalog) --------
  exportCatalog: () => request<CatalogExport>("/admin/catalog/export"),
  importCatalog: (body: CatalogExport) =>
    request("/admin/catalog/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // -------- REPORTS --------
  adminDailyReport: (date?: string) =>
    request(`/admin/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`),
};
