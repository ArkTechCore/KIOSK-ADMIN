"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, AdminStore, CatalogExport } from "@/lib/api";

type StoreOverridesIn = {
  categories: Array<{ categoryId: string; active: boolean; sortOverride?: number | null }>;
  products: Array<{ productId: string; active: boolean; priceCentsOverride?: number | null }>;
  options: Array<{ optionId: string; active: boolean; deltaCentsOverride?: number | null }>;
};

function dollarsToCents(s: string) {
  const n = Number(String(s || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
function centsToDollars(c?: number | null) {
  if (c === null || c === undefined) return "";
  return (c / 100).toFixed(2);
}

export default function StoreMenuPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [catalog, setCatalog] = useState<CatalogExport | null>(null);
  const [ovr, setOvr] = useState<StoreOverridesIn>({
    categories: [],
    products: [],
    options: [],
  });

  async function loadStores() {
    const s = await api.listStores();
    setStores(s);
    setStoreId((prev) => prev || s?.[0]?.store_id || "");
  }

  async function loadCatalog() {
    const c = await api.exportCatalog();
    setCatalog(c);
  }

  async function loadOverrides(sid: string) {
    // you added this GET in backend; now we call it
    const out = await api.getStoreOverrides(sid);
    setOvr(out);
  }

  async function loadAll() {
    setErr(null);
    setBusy(true);
    try {
      await Promise.all([loadStores(), loadCatalog()]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!storeId) return;
    setErr(null);
    setBusy(true);
    loadOverrides(storeId)
      .catch((e: any) => setErr(e?.message || "Failed to load overrides"))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const catMap = useMemo(() => {
    const m: Record<string, { active: boolean; sortOverride?: number | null }> = {};
    for (const x of ovr.categories) m[x.categoryId] = x;
    return m;
  }, [ovr.categories]);

  const prodMap = useMemo(() => {
    const m: Record<string, { active: boolean; priceCentsOverride?: number | null }> = {};
    for (const x of ovr.products) m[x.productId] = x;
    return m;
  }, [ovr.products]);

  const categories = catalog?.categories || [];
  const products = catalog?.products || [];

  function setCategoryActive(categoryId: string, active: boolean) {
    setOvr((prev) => {
      const next = { ...prev, categories: [...prev.categories] };
      const i = next.categories.findIndex((x) => x.categoryId === categoryId);
      if (i >= 0) next.categories[i] = { ...next.categories[i], active };
      else next.categories.push({ categoryId, active, sortOverride: null });
      return next;
    });
  }

  function setProductActive(productId: string, active: boolean) {
    setOvr((prev) => {
      const next = { ...prev, products: [...prev.products] };
      const i = next.products.findIndex((x) => x.productId === productId);
      if (i >= 0) next.products[i] = { ...next.products[i], active };
      else next.products.push({ productId, active, priceCentsOverride: null });
      return next;
    });
  }

  function setProductPriceOverride(productId: string, centsOrNull: number | null) {
    setOvr((prev) => {
      const next = { ...prev, products: [...prev.products] };
      const i = next.products.findIndex((x) => x.productId === productId);
      if (i >= 0) next.products[i] = { ...next.products[i], priceCentsOverride: centsOrNull };
      else next.products.push({ productId, active: true, priceCentsOverride: centsOrNull });
      return next;
    });
  }

  async function save() {
    if (!storeId) return;
    setErr(null);
    setBusy(true);
    try {
      await api.setStoreOverrides(storeId, ovr);
      alert("Saved ✅");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Store Menu (Overrides)</h1>
            <p className="text-sm text-gray-700">Turn categories/items ON/OFF per store + optional price override.</p>
          </div>

          <div className="flex gap-2">
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60" disabled={busy} onClick={loadAll}>
              Reload
            </button>
            <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={busy || !storeId} onClick={save}>
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="rounded-2xl border bg-white p-4">
          <label className="text-sm font-semibold text-gray-800">Store</label>
          <select
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                {s.name} ({s.store_id})
              </option>
            ))}
          </select>
        </div>

        {!catalog ? (
          <div className="rounded-2xl border bg-white p-6">Loading catalog…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Categories toggle */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">Categories</div>
              <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                {categories.map((c) => {
                  const active = catMap[c.id]?.active ?? true; // default ON
                  return (
                    <div key={c.id} className="rounded-xl border px-3 py-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-600">id: {c.id}</div>
                      </div>
                      <button
                        className={[
                          "rounded-lg px-3 py-2 text-sm font-semibold",
                          active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900",
                        ].join(" ")}
                        onClick={() => setCategoryActive(c.id, !active)}
                      >
                        {active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Products toggle + price override */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">Items</div>
              <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                {products.map((p) => {
                  const active = prodMap[p.id]?.active ?? true; // default ON
                  const priceOverride = prodMap[p.id]?.priceCentsOverride ?? null;

                  return (
                    <div key={p.id} className="rounded-xl border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-600">
                            id: {p.id} • category: {p.categoryId}
                          </div>
                        </div>

                        <button
                          className={[
                            "rounded-lg px-3 py-2 text-sm font-semibold",
                            active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900",
                          ].join(" ")}
                          onClick={() => setProductActive(p.id, !active)}
                        >
                          {active ? "Active" : "Inactive"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                        <div>
                          <div className="text-xs font-semibold text-gray-700">Global price</div>
                          <div className="text-sm text-gray-900">${(Number(p.basePriceCents || 0) / 100).toFixed(2)}</div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700">Store price override (optional)</div>
                          <div className="flex gap-2">
                            <input
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="leave empty"
                              value={centsToDollars(priceOverride)}
                              onChange={(e) => {
                                const v = e.target.value.trim();
                                if (!v) return setProductPriceOverride(p.id, null);
                                const cents = dollarsToCents(v);
                                setProductPriceOverride(p.id, cents);
                              }}
                            />
                            <button
                              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                              onClick={() => setProductPriceOverride(p.id, null)}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Default behavior: if no override exists, items/categories are Active.
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
