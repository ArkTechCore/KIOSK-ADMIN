"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, AdminStore, CatalogExport } from "@/lib/api";

type StoreOverridesIn = {
  categories: Array<{ categoryId: string; active: boolean; sortOverride?: number | null }>;
  products: Array<{ productId: string; active: boolean; priceCentsOverride?: number | null }>;
  options: Array<{ optionId: string; active: boolean; deltaCentsOverride?: number | null }>;
};

function centsToMoney(c: number) {
  return ((Number(c || 0) / 100) || 0).toFixed(2);
}

function moneyToCents(v: string) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function StoreMenuPage() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [catalog, setCatalog] = useState<CatalogExport | null>(null);
  const [overrides, setOverrides] = useState<StoreOverridesIn>({
    categories: [],
    products: [],
    options: [],
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // quick lookup maps
  const catOverrideMap = useMemo(() => {
    const m = new Map<string, StoreOverridesIn["categories"][number]>();
    overrides.categories.forEach((x) => m.set(x.categoryId, x));
    return m;
  }, [overrides.categories]);

  const prodOverrideMap = useMemo(() => {
    const m = new Map<string, StoreOverridesIn["products"][number]>();
    overrides.products.forEach((x) => m.set(x.productId, x));
    return m;
  }, [overrides.products]);

  const optOverrideMap = useMemo(() => {
    const m = new Map<string, StoreOverridesIn["options"][number]>();
    overrides.options.forEach((x) => m.set(x.optionId, x));
    return m;
  }, [overrides.options]);

  async function loadAll() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const s = await api.listStores();
      setStores(s);
      const first = s[0]?.store_id || "";
      setStoreId((prev) => prev || first);

      const cat = await api.exportCatalog();
      setCatalog(cat);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  async function loadOverrides(id: string) {
    setErr(null);
    setOk(null);

    // If your backend doesn't support GET, this might 404. That's OK.
    try {
      const out = await api.getStoreOverrides(id);
      // Expecting it returns same shape: {categories:[], products:[], options:[]}
      setOverrides({
        categories: out?.categories || [],
        products: out?.products || [],
        options: out?.options || [],
      });
    } catch {
      // fallback: start empty
      setOverrides({ categories: [], products: [], options: [] });
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!storeId) return;
    loadOverrides(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  if (!catalog) {
    return (
      <RequireAuth>
        <div className="text-sm text-gray-700">Loading...</div>
      </RequireAuth>
    );
  }

  const categoriesSorted = catalog.categories
    .slice()
    .sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));

  function setCategoryActive(categoryId: string, active: boolean) {
    setOverrides((prev) => {
      const next = prev.categories.slice();
      const idx = next.findIndex((x) => x.categoryId === categoryId);
      if (idx >= 0) next[idx] = { ...next[idx], active };
      else next.push({ categoryId, active, sortOverride: null });
      return { ...prev, categories: next };
    });
  }

  function setProductActive(productId: string, active: boolean) {
    setOverrides((prev) => {
      const next = prev.products.slice();
      const idx = next.findIndex((x) => x.productId === productId);
      if (idx >= 0) next[idx] = { ...next[idx], active };
      else next.push({ productId, active, priceCentsOverride: null });
      return { ...prev, products: next };
    });
  }

  function setProductPriceOverride(productId: string, cents: number | null) {
    setOverrides((prev) => {
      const next = prev.products.slice();
      const idx = next.findIndex((x) => x.productId === productId);
      if (idx >= 0) next[idx] = { ...next[idx], priceCentsOverride: cents };
      else next.push({ productId, active: true, priceCentsOverride: cents });
      return { ...prev, products: next };
    });
  }

  async function save() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api.setStoreOverrides(storeId, overrides);
      setOk("Saved store overrides.");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Store Menu</h1>
            <p className="text-sm text-gray-700">
              Turn categories/items ON or OFF per store. Optional: store-specific price.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={loadAll}
            >
              Refresh
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={busy || !storeId}
              onClick={save}
            >
              {busy ? "Saving..." : "Save store overrides"}
            </button>
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {ok && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{ok}</div>}

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-800">Store</label>
          <select
            className="mt-1 w-full max-w-md rounded-lg border px-3 py-2 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                {s.name} ({s.store_id})
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-gray-500">
            Global menu stays same. This screen is only per-store overrides.
          </div>
        </div>

        <div className="space-y-4">
          {categoriesSorted.map((c) => {
            const catActive = catOverrideMap.get(c.id)?.active ?? true;

            const products = catalog.products
              .filter((p) => p.categoryId === c.id)
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={c.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-gray-600">Category ID: {c.id}</div>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={catActive}
                      onChange={(e) => setCategoryActive(c.id, e.target.checked)}
                    />
                    Active in this store
                  </label>
                </div>

                <div className="mt-3 space-y-2">
                  {products.map((p) => {
                    const prodOverride = prodOverrideMap.get(p.id);
                    const prodActive = prodOverride?.active ?? true;
                    const priceOverride = prodOverride?.priceCentsOverride ?? null;

                    return (
                      <div key={p.id} className="rounded-xl border px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-gray-600">Product ID: {p.id}</div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={prodActive}
                                onChange={(e) => setProductActive(p.id, e.target.checked)}
                              />
                              Active
                            </label>

                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-600">Price override ($)</div>
                              <input
                                className="w-28 rounded-lg border px-3 py-2 text-sm"
                                value={priceOverride === null ? "" : centsToMoney(priceOverride)}
                                placeholder="(global)"
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  if (!v) setProductPriceOverride(p.id, null);
                                  else setProductPriceOverride(p.id, moneyToCents(v));
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Global base price: ${centsToMoney(p.basePriceCents)} • Leave override empty to use global.
                        </div>
                      </div>
                    );
                  })}

                  {!products.length && (
                    <div className="text-sm text-gray-600 border rounded-xl p-3">No items in this category.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RequireAuth>
  );
}
