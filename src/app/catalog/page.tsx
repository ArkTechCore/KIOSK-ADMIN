"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogCategory, CatalogProduct, ModifierGroup, ModifierOption, CatalogExport } from "@/lib/api";

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function cleanId(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

type OptMap = Record<string, ModifierOption[]>;

function sortAll(data: CatalogExport): CatalogExport {
  const categories = [...(data.categories || [])].sort((a, b) => (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
  const products = [...(data.products || [])].sort((a, b) => (a.categoryId.localeCompare(b.categoryId)) || a.name.localeCompare(b.name));
  const modifierGroups = [...(data.modifierGroups || [])].sort((a, b) => (a.productId.localeCompare(b.productId)) || (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
  const modifierOptions = [...(data.modifierOptions || [])].sort((a, b) => (a.groupId.localeCompare(b.groupId)) || (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
  return { categories, products, modifierGroups, modifierOptions };
}

export default function CatalogPage() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // full catalog in-memory
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [options, setOptions] = useState<ModifierOption[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [catQuery, setCatQuery] = useState("");
  const [prodQuery, setProdQuery] = useState("");

  // Create forms
  const [newCatId, setNewCatId] = useState("subs");
  const [newCatName, setNewCatName] = useState("Subs");
  const [newCatSort, setNewCatSort] = useState("0");

  const [newProdId, setNewProdId] = useState("chicken_sub");
  const [newProdName, setNewProdName] = useState("Chicken Sub");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdBaseCents, setNewProdBaseCents] = useState("0");

  const [newGroupId, setNewGroupId] = useState("size");
  const [newGroupTitle, setNewGroupTitle] = useState("Size");
  const [newGroupSort, setNewGroupSort] = useState("0");
  const [newGroupUi, setNewGroupUi] = useState<"radio" | "chips">("radio");
  const [newGroupRequired, setNewGroupRequired] = useState(true);
  const [newGroupMin, setNewGroupMin] = useState("1");
  const [newGroupMax, setNewGroupMax] = useState("1");

  const [newOptId, setNewOptId] = useState("six_inch");
  const [newOptName, setNewOptName] = useState("6 inch");
  const [newOptDelta, setNewOptDelta] = useState("0");
  const [newOptSort, setNewOptSort] = useState("0");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [categories, catQuery]);

  const productsInCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return productsInCategory;
    return productsInCategory.filter((p) => (p.name || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [productsInCategory, prodQuery]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const groupsForProduct = useMemo(() => {
    if (!selectedProductId) return [];
    return groups
      .filter((g) => g.productId === selectedProductId)
      .sort((a, b) => (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
  }, [groups, selectedProductId]);

  const optionsForGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    return options
      .filter((o) => o.groupId === selectedGroupId)
      .sort((a, b) => (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
  }, [options, selectedGroupId]);

  async function safeRun(fn: () => Promise<void>) {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function loadFromBackend() {
    await safeRun(async () => {
      const raw = await api.exportCatalog();
      const data = sortAll(raw);

      setCategories(data.categories || []);
      setProducts(data.products || []);
      setGroups(data.modifierGroups || []);
      setOptions(data.modifierOptions || []);

      // stable selections
      const firstCat = data.categories?.[0]?.id || "";
      setSelectedCategoryId((prev) => (prev && data.categories.some((c) => c.id === prev) ? prev : firstCat));

      const catId = (selectedCategoryId && data.categories.some((c) => c.id === selectedCategoryId)) ? selectedCategoryId : firstCat;
      const firstProd = (data.products || []).find((p) => p.categoryId === catId)?.id || "";
      setSelectedProductId((prev) => (prev && data.products.some((p) => p.id === prev) ? prev : firstProd));

      const prodId = (selectedProductId && data.products.some((p) => p.id === selectedProductId)) ? selectedProductId : firstProd;
      const firstGroup = (data.modifierGroups || []).find((g) => g.productId === prodId)?.id || "";
      setSelectedGroupId((prev) => (prev && data.modifierGroups.some((g) => g.id === prev) ? prev : firstGroup));

      setDirty(false);
    });
  }

  async function saveToBackend() {
    await safeRun(async () => {
      const payload = sortAll({
        categories,
        products,
        modifierGroups: groups,
        modifierOptions: options,
      });

      await api.importCatalog(payload);
      setDirty(false);

      // reload to confirm DB state
      await loadFromBackend();
    });
  }

  useEffect(() => {
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep selected product/group valid when category/product changes
  useEffect(() => {
    if (!selectedCategoryId) {
      setSelectedProductId("");
      setSelectedGroupId("");
      return;
    }
    const list = products.filter((p) => p.categoryId === selectedCategoryId);
    const first = list[0]?.id || "";
    setSelectedProductId((prev) => (prev && list.some((p) => p.id === prev) ? prev : first));
  }, [selectedCategoryId, products]);

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedGroupId("");
      return;
    }
    const list = groups.filter((g) => g.productId === selectedProductId).sort((a, b) => (toInt(a.sort) - toInt(b.sort)) || a.id.localeCompare(b.id));
    const first = list[0]?.id || "";
    setSelectedGroupId((prev) => (prev && list.some((g) => g.id === prev) ? prev : first));
  }, [selectedProductId, groups]);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Catalog</h1>
            <p className="text-sm text-gray-700">
              Edit here → click <span className="font-medium">Save to backend</span> → Flutter kiosk loads from <span className="font-medium">/menu-v2</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFromBackend}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              title="Reload catalog from backend (discard unsaved edits)"
            >
              {busy ? "Working..." : "Reload"}
            </button>

            <button
              onClick={saveToBackend}
              className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
              disabled={busy || !dirty}
              title="Saves entire catalog to backend"
            >
              Save to backend{dirty ? " *" : ""}
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {!dirty ? (
          <div className="text-xs text-gray-600">
            Status: synced ✅
          </div>
        ) : (
          <div className="text-xs text-amber-700">
            Status: unsaved changes (click Save to backend)
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Categories */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Categories</h2>
              <span className="text-xs text-gray-600">{categories.length}</span>
            </div>

            <input
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Search categories..."
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
            />

            <div className="mt-3 space-y-2 max-h-[360px] overflow-auto pr-1">
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2 transition",
                    c.id === selectedCategoryId ? "border-black bg-gray-50" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-700">id: {c.id} • sort: {toInt(c.sort)}</div>
                </button>
              ))}
              {!filteredCategories.length && (
                <div className="text-sm text-gray-600 border rounded-xl p-3">No matches.</div>
              )}
            </div>

            <div className="mt-5 border-t pt-4">
              <div className="text-sm font-semibold text-gray-900">Add category</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input className="rounded-lg border px-3 py-2 text-sm" value={newCatId} onChange={(e) => setNewCatId(e.target.value)} placeholder="id (e.g. subs)" />
                <input className="rounded-lg border px-3 py-2 text-sm" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="name" />
                <input className="rounded-lg border px-3 py-2 text-sm" value={newCatSort} onChange={(e) => setNewCatSort(e.target.value)} placeholder="sort (0..)" />

                <button
                  className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => {
                    const id = cleanId(newCatId);
                    const name = newCatName.trim();
                    if (!id) return setErr("Category id is required");
                    if (!name) return setErr("Category name is required");

                    setCategories((prev) => [...prev, { id, name, sort: toInt(newCatSort), active: true }]);
                    setSelectedCategoryId(id);
                    setDirty(true);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Products</h2>
              <div className="text-xs text-gray-700">{selectedCategory ? selectedCategory.name : "-"}</div>
            </div>

            <input
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Search products..."
              value={prodQuery}
              onChange={(e) => setProdQuery(e.target.value)}
              disabled={!selectedCategoryId}
            />

            <div className="mt-3 space-y-2 max-h-[360px] overflow-auto pr-1">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2 transition",
                    p.id === selectedProductId ? "border-black bg-gray-50" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-700">
                    id: {p.id} • base: {toInt(p.basePriceCents)}¢
                  </div>
                </button>
              ))}

              {!productsInCategory.length && (
                <div className="text-sm text-gray-600 border rounded-xl p-3">
                  No products in this category yet.
                </div>
              )}
            </div>

            <div className="mt-5 border-t pt-4">
              <div className="text-sm font-semibold text-gray-900">Add product</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input className="rounded-lg border px-3 py-2 text-sm" value={newProdId} onChange={(e) => setNewProdId(e.target.value)} placeholder="id (e.g. chicken_sub)" disabled={!selectedCategoryId} />
                <input className="rounded-lg border px-3 py-2 text-sm" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} placeholder="name" disabled={!selectedCategoryId} />
                <input className="rounded-lg border px-3 py-2 text-sm" value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} placeholder="description" disabled={!selectedCategoryId} />
                <input className="rounded-lg border px-3 py-2 text-sm" value={newProdBaseCents} onChange={(e) => setNewProdBaseCents(e.target.value)} placeholder="base price cents (0 if size pricing)" disabled={!selectedCategoryId} />

                <button
                  className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                  disabled={busy || !selectedCategoryId}
                  onClick={() => {
                    if (!selectedCategoryId) return setErr("Pick a category first");
                    const id = cleanId(newProdId);
                    const name = newProdName.trim();
                    if (!id) return setErr("Product id is required");
                    if (!name) return setErr("Product name is required");

                    setProducts((prev) => [
                      ...prev,
                      {
                        id,
                        categoryId: selectedCategoryId,
                        name,
                        description: newProdDesc || "",
                        basePriceCents: toInt(newProdBaseCents),
                        active: true,
                      },
                    ]);

                    setSelectedProductId(id);
                    setDirty(true);
                  }}
                >
                  Add
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Tip: For subs, keep base price 0 and put pricing in Size options.
              </div>
            </div>
          </div>

          {/* Build options */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Build options</h2>
              <div className="text-xs text-gray-700">{selectedProduct ? selectedProduct.name : "Select a product"}</div>
            </div>

            {!selectedProductId ? (
              <div className="mt-4 text-sm text-gray-600 border rounded-xl p-3">
                Choose a product to manage modifier groups (Size, Bread, Add-ons).
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-2 max-h-[220px] overflow-auto pr-1">
                  {groupsForProduct.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2 transition",
                        g.id === selectedGroupId ? "border-black bg-gray-50" : "border-gray-200 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="font-medium text-gray-900">{g.title}</div>
                      <div className="text-xs text-gray-700">
                        id: {g.id} • sort {toInt(g.sort)} • {g.required ? "required" : "optional"} • {g.uiType} • min {toInt(g.minSelect)} max {toInt(g.maxSelect)}
                      </div>
                    </button>
                  ))}

                  {!groupsForProduct.length && (
                    <div className="text-sm text-gray-600 border rounded-xl p-3">
                      No modifier groups yet. Add Size / Bread / Add-ons.
                    </div>
                  )}
                </div>

                {/* Add group */}
                <div className="mt-5 border-t pt-4">
                  <div className="text-sm font-semibold text-gray-900">Add modifier group</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <input className="rounded-lg border px-3 py-2 text-sm" value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)} placeholder="group id (e.g. size_chicken_sub)" />
                    <input className="rounded-lg border px-3 py-2 text-sm" value={newGroupTitle} onChange={(e) => setNewGroupTitle(e.target.value)} placeholder="title (e.g. Size)" />

                    <div className="grid grid-cols-2 gap-2">
                      <input className="rounded-lg border px-3 py-2 text-sm" value={newGroupSort} onChange={(e) => setNewGroupSort(e.target.value)} placeholder="sort" />
                      <select className="rounded-lg border px-3 py-2 text-sm" value={newGroupUi} onChange={(e) => setNewGroupUi(e.target.value as any)}>
                        <option value="radio">radio (one)</option>
                        <option value="chips">chips (multi)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input type="checkbox" checked={newGroupRequired} onChange={(e) => setNewGroupRequired(e.target.checked)} />
                      Required
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <input className="rounded-lg border px-3 py-2 text-sm" value={newGroupMin} onChange={(e) => setNewGroupMin(e.target.value)} placeholder="min" />
                      <input className="rounded-lg border px-3 py-2 text-sm" value={newGroupMax} onChange={(e) => setNewGroupMax(e.target.value)} placeholder="max" />
                    </div>

                    <button
                      className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        const id = cleanId(newGroupId);
                        const title = newGroupTitle.trim();
                        if (!id) return setErr("Group id is required");
                        if (!title) return setErr("Group title is required");

                        const min = toInt(newGroupMin);
                        const max = toInt(newGroupMax);
                        if (max < min) return setErr("Max must be >= Min");
                        if (newGroupRequired && min < 1) return setErr("Required groups should have min >= 1");

                        setGroups((prev) => [
                          ...prev,
                          {
                            id,
                            productId: selectedProductId,
                            title,
                            required: !!newGroupRequired,
                            minSelect: min,
                            maxSelect: max,
                            uiType: newGroupUi,
                            sort: toInt(newGroupSort),
                            active: true,
                          },
                        ]);

                        setSelectedGroupId(id);
                        setDirty(true);
                      }}
                    >
                      Add group
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="mt-5 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Options</div>
                    <div className="text-xs text-gray-700">{selectedGroupId ? `Group: ${selectedGroupId}` : "Select a group"}</div>
                  </div>

                  {!selectedGroupId ? (
                    <div className="mt-3 text-sm text-gray-600 border rounded-xl p-3">Select a group first.</div>
                  ) : (
                    <>
                      <div className="mt-3 space-y-2 max-h-[200px] overflow-auto pr-1">
                        {optionsForGroup.map((o) => (
                          <div key={o.id} className="rounded-xl border border-gray-200 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-gray-900">{o.name}</div>
                              <div className="text-xs text-gray-700">{toInt(o.deltaCents)}¢ • sort {toInt(o.sort)}</div>
                            </div>
                            <div className="text-xs text-gray-700">id: {o.id}</div>
                          </div>
                        ))}

                        {!optionsForGroup.length && (
                          <div className="text-sm text-gray-600 border rounded-xl p-3">No options yet. Add below.</div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <input className="rounded-lg border px-3 py-2 text-sm" value={newOptId} onChange={(e) => setNewOptId(e.target.value)} placeholder="option id (e.g. size_chicken_sub_6)" />
                        <input className="rounded-lg border px-3 py-2 text-sm" value={newOptName} onChange={(e) => setNewOptName(e.target.value)} placeholder="name (e.g. 6 inch)" />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="rounded-lg border px-3 py-2 text-sm" value={newOptDelta} onChange={(e) => setNewOptDelta(e.target.value)} placeholder="delta cents (e.g. 0 or 200)" />
                          <input className="rounded-lg border px-3 py-2 text-sm" value={newOptSort} onChange={(e) => setNewOptSort(e.target.value)} placeholder="sort" />
                        </div>

                        <button
                          className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                          disabled={busy || !selectedGroupId}
                          onClick={() => {
                            const id = cleanId(newOptId);
                            const name = newOptName.trim();
                            if (!id) return setErr("Option id is required");
                            if (!name) return setErr("Option name is required");

                            setOptions((prev) => [
                              ...prev,
                              {
                                id,
                                groupId: selectedGroupId,
                                name,
                                deltaCents: toInt(newOptDelta),
                                sort: toInt(newOptSort),
                                active: true,
                              },
                            ]);

                            setDirty(true);
                          }}
                        >
                          Add option
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
