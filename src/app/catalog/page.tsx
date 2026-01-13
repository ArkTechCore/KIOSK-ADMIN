"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogCategory, CatalogProduct, ModifierGroup, ModifierOption } from "@/lib/api";

function cents(n: number) {
  return Math.round(Number(n) || 0);
}

export default function CatalogPage() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [options, setOptions] = useState<Record<string, ModifierOption[]>>({});

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // ---- Create forms
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );
  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  async function loadCategories() {
    const data = await api.listCategories();
    data.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    setCategories(data);
    if (!selectedCategoryId && data.length) setSelectedCategoryId(data[0].id);
  }

  async function loadProducts(categoryId: string) {
    const data = await api.listProducts(categoryId);
    setProducts(data);
    if (data.length) setSelectedProductId(prev => (data.some(p => p.id === prev) ? prev : data[0].id));
    else setSelectedProductId("");
  }

  async function loadGroups(productId: string) {
    const data = await api.listGroups(productId);
    data.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    setGroups(data);
    if (data.length) {
      setSelectedGroupId(prev => (data.some(g => g.id === prev) ? prev : data[0].id));
    } else {
      setSelectedGroupId("");
    }

    // load options for each group
    const optMap: Record<string, ModifierOption[]> = {};
    for (const g of data) {
      const opts = await api.listOptions(g.id);
      opts.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      optMap[g.id] = opts;
    }
    setOptions(optMap);
  }

  async function refreshAll() {
    setErr(null);
    setBusy(true);
    try {
      await loadCategories();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    (async () => {
      setErr(null);
      try {
        await loadProducts(selectedCategoryId);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedProductId) {
      setGroups([]);
      setOptions({});
      return;
    }
    (async () => {
      setErr(null);
      try {
        await loadGroups(selectedProductId);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [selectedProductId]);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Catalog</h1>
            <p className="text-sm text-gray-600">Manage categories, products, modifier groups, and options.</p>
          </div>
          <button
            onClick={refreshAll}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Categories */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Categories</h2>
              <span className="text-xs text-gray-500">{categories.length}</span>
            </div>

            <div className="mt-3 space-y-2">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2",
                    c.id === selectedCategoryId ? "border-black" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">id: {c.id} • sort: {c.sort ?? 0}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t pt-4">
              <div className="text-sm font-semibold">Add category</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input className="rounded-lg border px-3 py-2" value={newCatId} onChange={e => setNewCatId(e.target.value)} placeholder="id (e.g. subs)" />
                <input className="rounded-lg border px-3 py-2" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="name" />
                <input className="rounded-lg border px-3 py-2" value={newCatSort} onChange={e => setNewCatSort(e.target.value)} placeholder="sort (0..)" />
                <button
                  className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
                  onClick={async () => {
                    setErr(null);
                    setBusy(true);
                    try {
                      await api.createCategory({
                        id: newCatId.trim(),
                        name: newCatName.trim(),
                        sort: Number(newCatSort) || 0,
                        active: true,
                      });
                      await loadCategories();
                      setSelectedCategoryId(newCatId.trim());
                    } catch (e: any) {
                      setErr(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Products</h2>
              <div className="text-xs text-gray-500">{selectedCategory ? selectedCategory.name : "-"}</div>
            </div>

            <div className="mt-3 space-y-2">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2",
                    p.id === selectedProductId ? "border-black" : "border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    id: {p.id} • base: {p.basePriceCents ?? 0}¢
                  </div>
                </button>
              ))}
              {!products.length && (
                <div className="text-sm text-gray-500 border rounded-xl p-3">No products in this category yet.</div>
              )}
            </div>

            <div className="mt-5 border-t pt-4">
              <div className="text-sm font-semibold">Add product</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input className="rounded-lg border px-3 py-2" value={newProdId} onChange={e => setNewProdId(e.target.value)} placeholder="id (e.g. chicken_sub)" />
                <input className="rounded-lg border px-3 py-2" value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="name" />
                <input className="rounded-lg border px-3 py-2" value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} placeholder="description" />
                <input className="rounded-lg border px-3 py-2" value={newProdBaseCents} onChange={e => setNewProdBaseCents(e.target.value)} placeholder="base price cents (0 if size pricing)" />
                <button
                  className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
                  onClick={async () => {
                    if (!selectedCategoryId) return;
                    setErr(null);
                    setBusy(true);
                    try {
                      await api.createProduct({
                        id: newProdId.trim(),
                        categoryId: selectedCategoryId,
                        name: newProdName.trim(),
                        description: newProdDesc,
                        basePriceCents: cents(Number(newProdBaseCents)),
                        active: true,
                      });
                      await loadProducts(selectedCategoryId);
                      setSelectedProductId(newProdId.trim());
                    } catch (e: any) {
                      setErr(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy || !selectedCategoryId}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Modifier groups + options */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Build options</h2>
              <div className="text-xs text-gray-500">{selectedProduct ? selectedProduct.name : "Select a product"}</div>
            </div>

            {!selectedProductId ? (
              <div className="mt-4 text-sm text-gray-500 border rounded-xl p-3">Choose a product to manage modifier groups.</div>
            ) : (
              <>
                <div className="mt-3 space-y-2">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2",
                        g.id === selectedGroupId ? "border-black" : "border-gray-200 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="font-medium">{g.title}</div>
                      <div className="text-xs text-gray-500">
                        id: {g.id} • sort: {g.sort ?? 0} • {g.required ? "required" : "optional"} • {g.uiType} • min {g.minSelect} max {g.maxSelect}
                      </div>
                    </button>
                  ))}
                  {!groups.length && (
                    <div className="text-sm text-gray-500 border rounded-xl p-3">No modifier groups yet (add Size / Bread / Add-ons).</div>
                  )}
                </div>

                {/* Add group */}
                <div className="mt-5 border-t pt-4">
                  <div className="text-sm font-semibold">Add modifier group</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <input className="rounded-lg border px-3 py-2" value={newGroupId} onChange={e => setNewGroupId(e.target.value)} placeholder="group id (e.g. size)" />
                    <input className="rounded-lg border px-3 py-2" value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="title (e.g. Size)" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="rounded-lg border px-3 py-2" value={newGroupSort} onChange={e => setNewGroupSort(e.target.value)} placeholder="sort" />
                      <select className="rounded-lg border px-3 py-2" value={newGroupUi} onChange={e => setNewGroupUi(e.target.value as any)}>
                        <option value="radio">radio</option>
                        <option value="chips">chips</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newGroupRequired}
                        onChange={e => setNewGroupRequired(e.target.checked)}
                      />
                      <span>Required</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input className="rounded-lg border px-3 py-2" value={newGroupMin} onChange={e => setNewGroupMin(e.target.value)} placeholder="min" />
                      <input className="rounded-lg border px-3 py-2" value={newGroupMax} onChange={e => setNewGroupMax(e.target.value)} placeholder="max" />
                    </div>

                    <button
                      className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
                      onClick={async () => {
                        setErr(null);
                        setBusy(true);
                        try {
                          await api.createGroup(selectedProductId, {
                            id: newGroupId.trim(),
                            title: newGroupTitle.trim(),
                            required: !!newGroupRequired,
                            minSelect: Number(newGroupMin) || 0,
                            maxSelect: Number(newGroupMax) || 1,
                            uiType: newGroupUi,
                            sort: Number(newGroupSort) || 0,
                            active: true,
                          });
                          await loadGroups(selectedProductId);
                          setSelectedGroupId(newGroupId.trim());
                        } catch (e: any) {
                          setErr(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy}
                    >
                      Add group
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="mt-5 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Options</div>
                    <div className="text-xs text-gray-500">{selectedGroupId ? `Group: ${selectedGroupId}` : "Select a group"}</div>
                  </div>

                  {selectedGroupId && (
                    <>
                      <div className="mt-3 space-y-2">
                        {(options[selectedGroupId] || []).map(o => (
                          <div key={o.id} className="rounded-xl border border-gray-200 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{o.name}</div>
                              <div className="text-xs text-gray-500">{o.deltaCents}¢ • sort {o.sort ?? 0}</div>
                            </div>
                            <div className="text-xs text-gray-500">id: {o.id}</div>
                          </div>
                        ))}
                        {(!(options[selectedGroupId] || []).length) && (
                          <div className="text-sm text-gray-500 border rounded-xl p-3">No options yet. Add choices below.</div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <input className="rounded-lg border px-3 py-2" value={newOptId} onChange={e => setNewOptId(e.target.value)} placeholder="option id (e.g. six_inch)" />
                        <input className="rounded-lg border px-3 py-2" value={newOptName} onChange={e => setNewOptName(e.target.value)} placeholder="name (e.g. 6 inch)" />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="rounded-lg border px-3 py-2" value={newOptDelta} onChange={e => setNewOptDelta(e.target.value)} placeholder="delta cents (e.g. 0 or 200)" />
                          <input className="rounded-lg border px-3 py-2" value={newOptSort} onChange={e => setNewOptSort(e.target.value)} placeholder="sort" />
                        </div>

                        <button
                          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
                          onClick={async () => {
                            if (!selectedGroupId) return;
                            setErr(null);
                            setBusy(true);
                            try {
                              await api.createOption(selectedGroupId, {
                                id: newOptId.trim(),
                                name: newOptName.trim(),
                                deltaCents: cents(Number(newOptDelta)),
                                sort: Number(newOptSort) || 0,
                                active: true,
                              });

                              // reload options for just this group
                              const fresh = await api.listOptions(selectedGroupId);
                              fresh.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
                              setOptions(prev => ({ ...prev, [selectedGroupId]: fresh }));

                            } catch (e: any) {
                              setErr(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                          disabled={busy || !selectedGroupId}
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
