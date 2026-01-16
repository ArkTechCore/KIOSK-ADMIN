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

function centsFromDollars(s: string) {
  const n = Number(String(s || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function dollarsFromCents(c: number) {
  const n = Number(c || 0) / 100;
  return n.toFixed(2);
}

export default function MenuPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogExport | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // ---------- Load global catalog ----------
  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const data = await api.exportCatalog();
      data.categories = [...(data.categories || [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      data.products = [...(data.products || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCatalog(data);

      // keep selections stable
      setSelectedCategoryId((prev) => prev || data.categories?.[0]?.id || "");
      setSelectedProductId((prev) => prev || "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load catalog");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = catalog?.categories || [];
  const products = catalog?.products || [];
  const groups = catalog?.modifierGroups || [];
  const options = catalog?.modifierOptions || [];

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const productGroups = useMemo(() => {
    if (!selectedProductId) return [];
    return groups
      .filter((g) => g.productId === selectedProductId)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [groups, selectedProductId]);

  const optionsByGroup = useMemo(() => {
    const map: Record<string, typeof options> = {};
    for (const o of options) {
      if (!map[o.groupId]) map[o.groupId] = [];
      map[o.groupId].push(o);
    }
    for (const gid of Object.keys(map)) {
      map[gid].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }
    return map;
  }, [options]);

  async function saveCatalog(next: CatalogExport) {
    setErr(null);
    setBusy(true);
    try {
      await api.importCatalog(next);
      setCatalog(next);
      alert("Saved ✅");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function mutate(fn: (c: CatalogExport) => void) {
    if (!catalog) return;
    const next: CatalogExport = {
      categories: [...(catalog.categories || [])],
      products: [...(catalog.products || [])],
      modifierGroups: [...(catalog.modifierGroups || [])],
      modifierOptions: [...(catalog.modifierOptions || [])],
    };
    fn(next);
    setCatalog(next);
  }

  // ---------- Simple forms ----------
  const [newCatName, setNewCatName] = useState("Subs");
  const [newCatId, setNewCatId] = useState("subs");
  const [newCatSort, setNewCatSort] = useState("0");

  const [prodName, setProdName] = useState("Turkey Sub");
  const [prodId, setProdId] = useState("turkey_sub");
  const [prodDesc, setProdDesc] = useState("");
  const [prodBasePrice, setProdBasePrice] = useState("0.00"); // dollars
  const [prodImage, setProdImage] = useState("fresh_items/sub.jpg");
  const [prodUpc, setProdUpc] = useState("");

  const [groupTitle, setGroupTitle] = useState("Breads");
  const [groupId, setGroupId] = useState("breads");
  const [groupUiType, setGroupUiType] = useState<"radio" | "chips">("chips");
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMin, setGroupMin] = useState("0");
  const [groupMax, setGroupMax] = useState("10");
  const [groupSort, setGroupSort] = useState("0");

  const [optName, setOptName] = useState("Wheat");
  const [optId, setOptId] = useState("wheat");
  const [optDelta, setOptDelta] = useState("0.00"); // dollars
  const [optSort, setOptSort] = useState("0");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // When selecting product, auto pick first group
  useEffect(() => {
    if (!selectedProductId) {
      setSelectedGroupId("");
      return;
    }
    const g = productGroups[0]?.id || "";
    setSelectedGroupId((prev) => prev || g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Menu (Global)</h1>
            <p className="text-sm text-gray-700">Add Categories → Items → Groups/Options. Then Save.</p>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              onClick={load}
              disabled={busy}
            >
              {busy ? "Loading..." : "Reload"}
            </button>

            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              onClick={() => catalog && saveCatalog(catalog)}
              disabled={busy || !catalog}
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {!catalog ? (
          <div className="rounded-2xl border bg-white p-6">Loading catalog...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT: Categories */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Categories</div>
                <div className="text-xs text-gray-600">{categories.length}</div>
              </div>

              <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setSelectedProductId("");
                    }}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-2",
                      c.id === selectedCategoryId ? "border-red-600 bg-red-50" : "border-gray-200 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-600">id: {c.id}</div>
                  </button>
                ))}
                {!categories.length && <div className="text-sm text-gray-600">No categories yet.</div>}
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="text-sm font-semibold">Add category</div>
                <div className="mt-2 space-y-2">
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Name (Subs)"
                  />
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    placeholder="ID (subs)"
                  />
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={newCatSort}
                    onChange={(e) => setNewCatSort(e.target.value)}
                    placeholder="Sort (0)"
                  />

                  <button
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => {
                      const id = cleanId(newCatId);
                      const name = newCatName.trim();
                      if (!id) return setErr("Category id required");
                      if (!name) return setErr("Category name required");

                      mutate((c) => {
                        if (c.categories.some((x) => x.id === id)) throw new Error("Category id already exists");
                        c.categories.push({
                          id,
                          name,
                          sort: Number(newCatSort) || 0,
                          imageUrl: null,
                          active: true,
                        });
                        c.categories.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
                      });

                      setSelectedCategoryId(id);
                      setSelectedProductId("");
                    }}
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>

            {/* MIDDLE: Products */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Items</div>
                <div className="text-xs text-gray-600">{selectedCategory ? selectedCategory.name : "-"}</div>
              </div>

              {!selectedCategoryId ? (
                <div className="mt-3 text-sm text-gray-600">Pick a category.</div>
              ) : (
                <>
                  <div className="mt-3 space-y-2 max-h-[280px] overflow-auto pr-1">
                    {categoryProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProductId(p.id);

                          // preload form with existing product
                          setProdName(p.name || "");
                          setProdId(p.id);
                          setProdDesc(p.description || "");
                          setProdBasePrice(dollarsFromCents(p.basePriceCents || 0));
                          setProdImage(p.imageUrl || "");
                          // upc is not in schema, but you can store it inside description if needed.
                        }}
                        className={[
                          "w-full text-left rounded-xl border px-3 py-2",
                          p.id === selectedProductId ? "border-red-600 bg-red-50" : "border-gray-200 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-600">
                          {dollarsFromCents(p.basePriceCents || 0)} • id: {p.id}
                        </div>
                      </button>
                    ))}
                    {!categoryProducts.length && <div className="text-sm text-gray-600">No items yet.</div>}
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <div className="text-sm font-semibold">Add item</div>
                    <div className="mt-2 space-y-2">
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="Name (Turkey Sub)"
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodId}
                        onChange={(e) => setProdId(e.target.value)}
                        placeholder="ID (turkey_sub)"
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodBasePrice}
                        onChange={(e) => setProdBasePrice(e.target.value)}
                        placeholder="Price ($) (0.00)"
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodImage}
                        onChange={(e) => setProdImage(e.target.value)}
                        placeholder="Image path (fresh_items/sub.jpg)"
                      />
                      <textarea
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Description"
                        rows={3}
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={prodUpc}
                        onChange={(e) => setProdUpc(e.target.value)}
                        placeholder="UPC (optional, for your future POS)"
                      />

                      <button
                        className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => {
                          if (!selectedCategoryId) return setErr("Pick a category first");
                          const id = cleanId(prodId);
                          const name = prodName.trim();
                          if (!id) return setErr("Item id required");
                          if (!name) return setErr("Item name required");

                          mutate((c) => {
                            if (c.products.some((x) => x.id === id)) throw new Error("Item id already exists");
                            c.products.push({
                              id,
                              categoryId: selectedCategoryId,
                              name,
                              description: prodDesc || "",
                              basePriceCents: centsFromDollars(prodBasePrice),
                              imageUrl: prodImage || null,
                              active: true,
                            });
                            c.products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                          });

                          setSelectedProductId(id);
                        }}
                      >
                        Add Item
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Tip: Use Price $0.00 when you want pricing to come from the Size options.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: Groups + Options */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">Item build (Groups/Options)</div>

              {!selectedProductId ? (
                <div className="mt-3 text-sm text-gray-600">Pick an item first.</div>
              ) : (
                <>
                  <div className="mt-3 text-sm text-gray-700">
                    Selected: <span className="font-medium">{selectedProduct?.name}</span>
                  </div>

                  {/* Groups list */}
                  <div className="mt-3 space-y-2 max-h-[160px] overflow-auto pr-1">
                    {productGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={[
                          "w-full text-left rounded-xl border px-3 py-2",
                          g.id === selectedGroupId ? "border-red-600 bg-red-50" : "border-gray-200 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-gray-600">
                          {g.uiType} • {g.required ? "required" : "optional"} • min {g.minSelect} max {g.maxSelect}
                        </div>
                      </button>
                    ))}
                    {!productGroups.length && <div className="text-sm text-gray-600">No groups yet.</div>}
                  </div>

                  {/* Add group */}
                  <div className="mt-4 border-t pt-4">
                    <div className="text-sm font-semibold">Add group (Example: Breads)</div>
                    <div className="mt-2 space-y-2">
                      <input className="w-full rounded-lg border px-3 py-2 text-sm" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="Title (Breads)" />
                      <input className="w-full rounded-lg border px-3 py-2 text-sm" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="ID (breads)" />

                      <div className="grid grid-cols-2 gap-2">
                        <select className="rounded-lg border px-3 py-2 text-sm" value={groupUiType} onChange={(e) => setGroupUiType(e.target.value as any)}>
                          <option value="radio">radio (pick one)</option>
                          <option value="chips">chips (multi)</option>
                        </select>
                        <input className="rounded-lg border px-3 py-2 text-sm" value={groupSort} onChange={(e) => setGroupSort(e.target.value)} placeholder="Sort (0)" />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="checkbox" checked={groupRequired} onChange={(e) => setGroupRequired(e.target.checked)} />
                        Required
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <input className="rounded-lg border px-3 py-2 text-sm" value={groupMin} onChange={(e) => setGroupMin(e.target.value)} placeholder="Min (0)" />
                        <input className="rounded-lg border px-3 py-2 text-sm" value={groupMax} onChange={(e) => setGroupMax(e.target.value)} placeholder="Max (10)" />
                      </div>

                      <button
                        className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => {
                          const id = cleanId(groupId);
                          const title = groupTitle.trim();
                          if (!id) return setErr("Group id required");
                          if (!title) return setErr("Group title required");

                          const min = Number(groupMin) || 0;
                          const max = Number(groupMax) || 0;
                          if (max < min) return setErr("Max must be >= min");

                          mutate((c) => {
                            if (c.modifierGroups.some((x) => x.id === id && x.productId === selectedProductId))
                              throw new Error("Group id already exists for this item");

                            c.modifierGroups.push({
                              id,
                              productId: selectedProductId,
                              title,
                              required: !!groupRequired,
                              minSelect: min,
                              maxSelect: max,
                              uiType: groupUiType,
                              active: true,
                              sort: Number(groupSort) || 0,
                            });
                          });

                          setSelectedGroupId(id);
                        }}
                      >
                        Add Group
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Options</div>
                      <div className="text-xs text-gray-600">{selectedGroupId ? `Group: ${selectedGroupId}` : "Pick a group"}</div>
                    </div>

                    {!selectedGroupId ? (
                      <div className="mt-2 text-sm text-gray-600">Pick a group.</div>
                    ) : (
                      <>
                        <div className="mt-2 space-y-2 max-h-[180px] overflow-auto pr-1">
                          {(optionsByGroup[selectedGroupId] || []).map((o) => (
                            <div key={o.id} className="rounded-xl border px-3 py-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{o.name}</div>
                                <div className="text-xs text-gray-600">
                                  {dollarsFromCents(o.deltaCents || 0)} • sort {o.sort ?? 0}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">id: {o.id}</div>
                            </div>
                          ))}
                          {!(optionsByGroup[selectedGroupId] || []).length && <div className="text-sm text-gray-600">No options yet.</div>}
                        </div>

                        <div className="mt-3 space-y-2">
                          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={optName} onChange={(e) => setOptName(e.target.value)} placeholder="Name (Wheat)" />
                          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={optId} onChange={(e) => setOptId(e.target.value)} placeholder="ID (wheat)" />

                          <div className="grid grid-cols-2 gap-2">
                            <input className="rounded-lg border px-3 py-2 text-sm" value={optDelta} onChange={(e) => setOptDelta(e.target.value)} placeholder="Price delta ($) (0.00)" />
                            <input className="rounded-lg border px-3 py-2 text-sm" value={optSort} onChange={(e) => setOptSort(e.target.value)} placeholder="Sort (0)" />
                          </div>

                          <button
                            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                            disabled={busy}
                            onClick={() => {
                              const id = cleanId(optId);
                              const name = optName.trim();
                              if (!id) return setErr("Option id required");
                              if (!name) return setErr("Option name required");

                              mutate((c) => {
                                if (c.modifierOptions.some((x) => x.id === id && x.groupId === selectedGroupId))
                                  throw new Error("Option id already exists for this group");

                                c.modifierOptions.push({
                                  id,
                                  groupId: selectedGroupId,
                                  name,
                                  deltaCents: centsFromDollars(optDelta),
                                  active: true,
                                  sort: Number(optSort) || 0,
                                });
                              });

                              // quick reset
                              setOptId("");
                              setOptName("");
                              setOptDelta("0.00");
                              setOptSort("0");
                            }}
                          >
                            Add Option
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
