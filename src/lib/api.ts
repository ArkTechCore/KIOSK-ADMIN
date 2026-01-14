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
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/v1${path}`, { ...opts, headers, cache: "no-store" });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = json?.detail || json?.message || text || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export type AdminStore = { store_id: string; name: string; active: boolean };

export type CatalogCategory = { id: string; name: string; sort: number; imageUrl?: string | null; active?: boolean };
export type CatalogProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceCents: number;
  imageUrl?: string | null;
  active?: boolean;
};
export type ModifierGroup = {
  id: string;
  productId: string;
  title: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  uiType: "radio" | "chips";
  sort: number;
  active?: boolean;
};
export type ModifierOption = {
  id: string;
  groupId: string;
  name: string;
  deltaCents: number;
  sort: number;
  active?: boolean;
};

export type CatalogImportPayload = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  modifierGroups: ModifierGroup[];
  modifierOptions: ModifierOption[];
};

export type CatalogExportPayload = CatalogImportPayload;

export const api = {
  adminLogin: (email: string, password: string) =>
    request("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  listStores: (): Promise<AdminStore[]> => request("/admin/stores"),

  createStore: (store_id: string, name: string, password: string, tax_rate: number) =>
    request("/admin/stores", { method: "POST", body: JSON.stringify({ store_id, name, password, tax_rate }) }),

  resetStorePassword: (store_id: string, password: string) =>
    request(`/admin/stores/${encodeURIComponent(store_id)}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  catalogExport: (): Promise<CatalogExportPayload> => request("/admin/catalog/export"),

  catalogImport: (payload: CatalogImportPayload): Promise<{ ok: boolean; counts: any }> =>
    request("/admin/catalog/import", { method: "POST", body: JSON.stringify(payload) }),

  adminDailyReport: (date: string) => request(`/admin/reports/daily?date=${encodeURIComponent(date)}`),
};
