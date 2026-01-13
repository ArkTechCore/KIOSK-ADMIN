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

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, cache: "no-store" });
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = json?.detail || json?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

// ---------- Types (lightweight) ----------
export type CatalogCategory = {
  id: string;
  name: string;
  sort: number;
  imageUrl?: string | null;
  active?: boolean;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
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

export const api = {
  // -------- AUTH --------
  adminLogin: (email: string, password: string) =>
    request("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // -------- STORES --------
  listStores: () => request("/admin/stores"),

  createStore: (store_id: string, name: string, password: string, tax_rate: number) =>
    request("/admin/stores", {
      method: "POST",
      body: JSON.stringify({ store_id, name, password, tax_rate }),
    }),

  // -------- CATALOG (Admin) --------
  // These paths must match your backend. If Swagger shows different ones, we’ll edit these strings.
  listCategories: (): Promise<CatalogCategory[]> => request("/admin/catalog/categories"),
  createCategory: (body: { id: string; name: string; sort?: number; imageUrl?: string | null; active?: boolean }) =>
    request("/admin/catalog/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<{ name: string; sort: number; imageUrl: string | null; active: boolean }>) =>
    request(`/admin/catalog/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listProducts: (categoryId?: string): Promise<CatalogProduct[]> =>
    request(categoryId ? `/admin/catalog/products?categoryId=${encodeURIComponent(categoryId)}` : "/admin/catalog/products"),
  createProduct: (body: {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    basePriceCents?: number;
    imageUrl?: string | null;
    active?: boolean;
  }) => request("/admin/catalog/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Partial<{
    categoryId: string;
    name: string;
    description: string;
    basePriceCents: number;
    imageUrl: string | null;
    active: boolean;
  }>) => request(`/admin/catalog/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listGroups: (productId: string): Promise<ModifierGroup[]> =>
    request(`/admin/catalog/products/${productId}/modifier-groups`),
  createGroup: (productId: string, body: {
    id: string;
    title: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    uiType: "radio" | "chips";
    sort?: number;
    active?: boolean;
  }) => request(`/admin/catalog/products/${productId}/modifier-groups`, { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (groupId: string, body: Partial<{
    title: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    uiType: "radio" | "chips";
    sort: number;
    active: boolean;
  }>) => request(`/admin/catalog/modifier-groups/${groupId}`, { method: "PATCH", body: JSON.stringify(body) }),

  listOptions: (groupId: string): Promise<ModifierOption[]> =>
    request(`/admin/catalog/modifier-groups/${groupId}/options`),
  createOption: (groupId: string, body: {
    id: string;
    name: string;
    deltaCents: number;
    sort?: number;
    active?: boolean;
  }) => request(`/admin/catalog/modifier-groups/${groupId}/options`, { method: "POST", body: JSON.stringify(body) }),
  updateOption: (optionId: string, body: Partial<{
    name: string;
    deltaCents: number;
    sort: number;
    active: boolean;
  }>) => request(`/admin/catalog/modifier-options/${optionId}`, { method: "PATCH", body: JSON.stringify(body) }),
};
