"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogExport } from "@/lib/api";

function cleanId(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function moneyToCents(v: string) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToMoney(c: number) {
  return ((Number(c || 0) / 100) || 0).toFixed(2);
}

export default function MenuPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [data, setData] = useState<CatalogExport>({
    categories: [],
    products: [],
    modifierGroups: [],
    modifierOptions: [],
  });

  const [catId, setCatId] = useState<string>("");
  const [prodId, setProdId] = useState<string>("");

  // product form fields (simple like your example)
  const selectedProduct = useMemo(
    () => data.products.find((p) => p.id === prodId) || null,
    [data.products, prodId]
  );

  const selectedCategory = useMemo(
    () => data.categories.find((c) => c.id === catId) || null,
    [data.categories, catId]
  );

  const productsInCategory = useMemo(() => {
    return data.products.filter((p) => p.categoryId === catId);
  }, [data.products, catId]);

  const groupsForProduct = useMemo(() => {
    return data.modifierGroups
      .filter((g) => g.productId === prodId)
      .sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id));
  }, [data.modifierGroups, prodId]);

  const optionsForGroup = (groupId: string) =>
    data.modifierOptions
      .filter((o) => o.groupId === groupId)
      .sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id));

  async function load() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const exp = await api.exportCatalog();
      setData(exp);

      const firstCat = exp.categories.sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id))[0]?.id || "";
      setCatId(firstCat);

      const firstProd = exp.products.find((p) => p.categoryId === firstCat)?.id || "";
      setProdId(firstProd);
    } catch (e: any) {
      setErr(e?.message || "Failed to load menu");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // when category changes, pick first product
  useEffect(() => {
    if (!catId) return;
    const first = data.products.find((p) => p.categoryId === catId)?.id || "";
    setProdId(first);
  }, [catId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveToBackend(next: CatalogExport) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api.importCatalog(next);
      setOk("Saved. Kiosk will show it now.");
      setData(next);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function updateProductField(field: keyof CatalogExport["products"][number], value: any) {
    if (!selectedProduct) return;
    const next: CatalogExport = {
      ...data,
      products: data.products.map((p) => (p.id === selectedProduct.id ? { ...p, [field]: value } : p)),
    };
    setData(next);
  }

  return (
    <RequireAuth>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Menu</h1>
            <p className="text-sm text-gray-700">
              Simple menu builder. Edit → Save → Kiosk shows it (menu-v2).
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={load}
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={busy}
              onClick={() => saveToBackend(data)}
            >
              {busy ? "Saving..." : "Save to backend"}
            </button>
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {ok && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{ok}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Categories */}
          <div className="lg:col-span-3 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Categories</div>
              <div className="text-xs text-gray-600">{data.categories.length}</div>
            </div>

            <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
              {data.categories
                .slice()
                .sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCatId(c.id)}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-2",
                      c.id === catId ? "border-red-600 bg-red-50" : "border-gray-200 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-600">GLOBAL • id: {c.id}</div>
                  </button>
                ))}
              {!data.categories.length && (
                <div className="text-sm text-gray-600 border rounded-xl p-3">No categories yet.</div>
              )}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="text-sm font-semibold">Add category</div>
              <AddCategory
                disabled={busy}
                onAdd={(id, name) => {
                  const next: CatalogExport = {
                    ...data,
                    categories: [
                      ...data.categories,
                      { id, name, sort: data.categories.length, imageUrl: null, active: true },
                    ],
                  };
                  setData(next);
                  setCatId(id);
                }}
              />
            </div>
          </div>

          {/* Products list */}
          <div className="lg:col-span-3 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Items</div>
              <div className="text-xs text-gray-600">{productsInCategory.length}</div>
            </div>

            <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
              {productsInCategory.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProdId(p.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2",
                    p.id === prodId ? "border-red-600 bg-red-50" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">
                    {p.active ? "Active" : "Inactive"} • ${centsToMoney(p.basePriceCents)}
                  </div>
                </button>
              ))}
              {!productsInCategory.length && (
                <div className="text-sm text-gray-600 border rounded-xl p-3">No items yet.</div>
              )}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="text-sm font-semibold">Add item</div>
              <AddProduct
                disabled={busy || !catId}
                onAdd={(id, name) => {
                  const next: CatalogExport = {
                    ...data,
                    products: [
                      ...data.products,
                      {
                        id,
                        categoryId: catId,
                        name,
                        description: "",
                        basePriceCents: 0,
                        imageUrl: null,
                        active: true,
                      },
                    ],
                  };
                  setData(next);
                  setProdId(id);
                }}
              />
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-6 rounded-2xl border bg-white p-5 shadow-sm">
            {!selectedProduct ? (
              <div className="text-sm text-gray-600">Select an item to edit.</div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="text-xs text-gray-600">Store: GLOBAL (all stores)</div>
                  <div className="mt-1 text-lg font-semibold">{selectedProduct.name}</div>
                  <div className="text-xs text-gray-600">
                    Category: {selectedCategory?.name || selectedProduct.categoryId}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={selectedProduct.name}
                      onChange={(e) => updateProductField("name", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">UPC (optional)</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Put UPC in Description or keep separate later"
                      value={""}
                      onChange={() => {}}
                      disabled
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Your backend doesn’t store UPC yet. If you want UPC for POS, we add it in backend schema next.
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      rows={4}
                      value={selectedProduct.description || ""}
                      onChange={(e) => updateProductField("description", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Price ($)</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={centsToMoney(selectedProduct.basePriceCents)}
                      onChange={(e) => updateProductField("basePriceCents", moneyToCents(e.target.value))}
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      If Size options decide price, keep this 0 and put price in Size option deltas.
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!selectedProduct.active}
                        onChange={(e) => updateProductField("active", e.target.checked)}
                      />
                      Active
                    </label>
                    <div className="text-xs text-gray-500">Inactive items won’t show in kiosk.</div>
                  </div>
                </div>

                {/* Quick groups */}
                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">Build options</div>
                      <div className="text-xs text-gray-600">Size, Bread, Add-ons…</div>
                    </div>

                    <button
                      className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
                      onClick={() => {
                        // quick create common groups if missing
                        const pid = selectedProduct.id;
                        const mkGroup = (id: string, title: string, required: boolean, min: number, max: number, uiType: "radio"|"chips", sort: number) => ({
                          id,
                          productId: pid,
                          title,
                          required,
                          minSelect: min,
                          maxSelect: max,
                          uiType,
                          active: true,
                          sort,
                        });

                        const g1 = `size_${pid}`;
                        const g2 = `bread_${pid}`;
                        const g3 = `addons_${pid}`;

                        const nextGroups = data.modifierGroups.slice();
                        if (!nextGroups.some(g => g.id === g1)) nextGroups.push(mkGroup(g1, "Size", true, 1, 1, "radio", 0));
                        if (!nextGroups.some(g => g.id === g2)) nextGroups.push(mkGroup(g2, "Bread", true, 1, 1, "chips", 1));
                        if (!nextGroups.some(g => g.id === g3)) nextGroups.push(mkGroup(g3, "Add-ons", false, 0, 10, "chips", 2));

                        setData({ ...data, modifierGroups: nextGroups });
                      }}
                    >
                      + Quick add Size/Bread/Add-ons
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {groupsForProduct.map((g) => (
                      <div key={g.id} className="rounded-xl border bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{g.title}</div>
                            <div className="text-xs text-gray-600">
                              {g.required ? "Required" : "Optional"} • min {g.minSelect} max {g.maxSelect} • {g.uiType}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {optionsForGroup(g.id).map((o) => (
                            <div key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                              <div>{o.name}</div>
                              <div className="text-gray-600">+${centsToMoney(o.deltaCents)}</div>
                            </div>
                          ))}

                          <AddOption
                            onAdd={(name, delta) => {
                              const oid = cleanId(`${g.id}_${name}`);
                              const next: CatalogExport = {
                                ...data,
                                modifierOptions: [
                                  ...data.modifierOptions,
                                  {
                                    id: oid,
                                    groupId: g.id,
                                    name,
                                    deltaCents: delta,
                                    active: true,
                                    sort: optionsForGroup(g.id).length,
                                  },
                                ],
                              };
                              setData(next);
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {!groupsForProduct.length && (
                      <div className="text-sm text-gray-600 border rounded-xl p-3 bg-white">
                        No build options yet. Use “Quick add Size/Bread/Add-ons”.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    After you finish, click <b>Save to backend</b>. Then kiosk menu-v2 will show it.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function AddCategory({ disabled, onAdd }: { disabled?: boolean; onAdd: (id: string, name: string) => void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="mt-2 grid grid-cols-1 gap-2">
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="id (subs)" value={id} onChange={(e) => setId(e.target.value)} disabled={disabled} />
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="name (Subs)" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      <button
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
        disabled={disabled}
        onClick={() => {
          const cid = cleanId(id || name);
          const n = name.trim();
          if (!cid || !n) return;
          onAdd(cid, n);
          setId("");
          setName("");
        }}
      >
        Add category
      </button>
    </div>
  );
}

function AddProduct({ disabled, onAdd }: { disabled?: boolean; onAdd: (id: string, name: string) => void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="mt-2 grid grid-cols-1 gap-2">
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="id (turkey_sub)" value={id} onChange={(e) => setId(e.target.value)} disabled={disabled} />
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="name (Turkey Sub)" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      <button
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
        disabled={disabled}
        onClick={() => {
          const pid = cleanId(id || name);
          const n = name.trim();
          if (!pid || !n) return;
          onAdd(pid, n);
          setId("");
          setName("");
        }}
      >
        Add item
      </button>
    </div>
  );
}

function AddOption({ onAdd }: { onAdd: (name: string, deltaCents: number) => void }) {
  const [name, setName] = useState("");
  const [delta, setDelta] = useState("0");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
      <input className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" placeholder="Option name (6 inch)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="+$ (6.49)" value={delta} onChange={(e) => setDelta(e.target.value)} />
      <button
        className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 sm:col-span-3"
        onClick={() => {
          const n = name.trim();
          if (!n) return;
          onAdd(n, Math.round(Number(delta || 0) * 100));
          setName("");
          setDelta("0");
        }}
      >
        + Add option
      </button>
    </div>
  );
}
