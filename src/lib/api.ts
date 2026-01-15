const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

function normalizeBase(raw?: string) {
  if (!raw) return null;
  const base = raw.replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

const BASE = normalizeBase(RAW_BASE);

// ---------------- TOKEN ----------------
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

// ---------------- REQUEST ----------------
async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  if (!BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as any),
  };

  // Only set Content-Type when sending a body
  const hasBody = typeof opts.body !== "undefined" && opts.body !== null;
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    cache: "no-store",
  });

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

    if (res.status === 401) clearToken();
    throw new Error(msg);
  }

  return json as T;
}

// ---------------- TYPES ----------------
export type AdminStore = {
  store_id: string;
  name: string;
  active: boolean;
};

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

// ---------------- API ----------------
export const api = {
  // -------- AUTH --------
  adminLogin: async (email: string, password: string) => {
    if (!BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

    // use fetch directly so we can read response headers
    const res = await fetch(`${BASE}/admin/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const authHeader = res.headers.get("authorization") || res.headers.get("Authorization");

    const text = await res.text();
    let out: any = null;
    try {
      out = text ? JSON.parse(text) : null;
    } catch {
      out = text || null;
    }

    if (!res.ok) {
      const msg =
        (out && typeof out === "object" && (out.detail || out.message)) ||
        (typeof out === "string" ? out : null) ||
        `Login failed (${res.status})`;
      throw new Error(msg);
    }

    // 1) token in JSON body (many shapes)
    let token =
      out?.access_token ||
      out?.accessToken ||
      out?.token ||
      out?.jwt ||
      out?.data?.access_token ||
      out?.data?.token ||
      out?.data?.jwt;

    // 2) token in Authorization header: "Bearer xxx"
    if (!token && authHeader) {
      const m = authHeader.match(/Bearer\s+(.+)/i);
      token = (m?.[1] || authHeader).trim();
    }

    if (!token) {
      throw new Error(
        "Login did not return a token (body or Authorization header). Backend response: " +
          (typeof out === "string" ? out : JSON.stringify(out))
      );
    }

    return { access_token: token };
  },

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

  // -------- CATALOG --------
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
