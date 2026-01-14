const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

async function request(path: string, opts: RequestInit = {}) {
  if (!BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env.local");

  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts.headers as any),
  };

  if (!headers["Content-Type"] && opts.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/v1${path}`, { ...opts, headers, cache: "no-store" });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = json?.detail || json?.message || text || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

/** ===== Types ===== */
export type AdminStore = {
  store_id: string;
  name: string;
  active: boolean;
};

export type CatalogImportPayload = {
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
    sort: number;
    active: boolean;
  }>;
  modifierOptions: Array<{
    id: string;
    groupId: string;
    name: string;
    deltaCents: number;
    sort: number;
    active: boolean;
  }>;
};

export const api = {
  // -------- AUTH --------
  adminLogin: (email: string, password: string) =>
    request("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // -------- STORES --------
  listStores: (): Promise<AdminStore[]> => request("/admin/stores"),

  // NOTE: Your Swagger shows AdminCreateStoreIn object.
  // If it doesn't have tax_rate, remove it from payload.
  createStore: (store_id: string, name: string, password: string, tax_rate?: number) =>
    request("/admin/stores", {
      method: "POST",
      body: JSON.stringify({
        store_id,
        name,
        password,
        // only send tax_rate if you actually use it backend-side
        ...(typeof tax_rate === "number" ? { tax_rate } : {}),
      }),
    }),

  // Swagger: POST /admin/stores/{store_id}/reset-password
  // Your backend *likely* generates a new password and returns it.
  // So frontend should NOT ask for newPass unless your API accepts it.
  resetStorePassword: (store_id: string) =>
    request(`/admin/stores/${encodeURIComponent(store_id)}/reset-password`, {
      method: "POST",
    }),

  // -------- REPORTS --------
  // Swagger: GET /admin/reports/daily (no date param shown in your list)
  // If your backend supports ?date=YYYY-MM-DD we'll send it.
  adminDailyReport: (date?: string) =>
    request(`/admin/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`),

  // -------- CATALOG --------
  exportCatalog: (): Promise<CatalogImportPayload> => request("/admin/catalog/export"),
  importCatalog: (payload: CatalogImportPayload) =>
    request("/admin/catalog/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
