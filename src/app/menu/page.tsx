"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogExport } from "@/lib/api";

function toId(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function centsFromDollars(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function dollarsFromCents(c: number) {
  return (Number(c || 0) / 100).toFixed(2);
}

function splitCSV(v: string) {
  return (v || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

export default function MenuPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogExport | null>(null);

  // Left list search
  const [q, setQ] = useState("");

  // “Editor” fields (single product)
  const [store, setStore] = useState("GLOBAL"); // UI only for now
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [basePrice, setBasePrice] = useState("0.00");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);

  // Build groups as simple comma lists
  const [breads, setBreads] = useState("white, wheat");
  const [cheeses, setCheeses] = useState("");
  const [meats, setMeats] = useState("");
  const [toppings, setToppings] = useState("");

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const data = await api.exportCatalog();
      // if backend returns empty, normalize
      const normalized: CatalogExport = {
        categories: data.categories || [],
        products: data.products || [],
        modifierGroups: data.modifierGroups || [],
        modifierOptions: data.modifierOptions || [],
      };
      setCatalog(normalized);

      if (!categoryId && normalized.categories.length) {
        setCategoryId(normalized.categories[0].id);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load catalog");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = catalog?.categories || [];
  const products = catalog?.products || [];
  const groups = catalog?.modifierGroups || [];
  const options = catalog?.modifierOptions || [];

  const categoryName = useMemo(() => {
    return categories.find(c => c.id === categoryId)?.name || "";
  }, [categories, categoryId]);

  const filteredProducts = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const inCat = products.filter(p => (categoryId ? p.categoryId === categoryId : true));
    if (!qq) return inCat;
    return inCat.filter(p =>
      (p.name || "").toLowerCase().includes(qq) || p.id.toLowerCase().includes(qq)
    );
  }, [products, q, categoryId]);

  function loadProductToEditor(pid: string) {
    const p = products.find(x => x.id === pid);
    if (!p) return;

    setProductId(p.id);
    setCategoryId(p.categoryId);
    setName(p.name || "");
    setDesc(p.description || "");
    setBasePrice(dollarsFromCents(p.basePriceCents || 0));
    setImageUrl(p.imageUrl || "");
    setActive(!!p.active);

    // read groups -> comma lists
    const pGroups = groups.filter(g => g.productId === p.id);
    const findGroup = (title: string) =>
      pGroups.find(g => (g.title || "").toLowerCase() === title.toLowerCase());

    const groupCsv = (title: string) => {
      const g = findGroup(title);
      if (!g) return "";
      const opts = options
        .filter(o => o.groupId === g.id)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map(o => o.name);
      return opts.join(", ");
    };

    setBreads(groupCsv("Breads"));
    setCheeses(groupCsv("Cheeses"));
    setMeats(groupCsv("Meats"));
    setToppings(groupCsv("Toppings"));
  }

  async function saveProduct() {
    if (!catalog) return;

    const catId = toId(categoryId);
    if (!catId) throw new Error("Pick a category");

    const pid = toId(productId || name);
    if (!pid) throw new Error("Product id is required (or name)");

    const next: CatalogExport = JSON.parse(JSON.stringify(catalog));

    // ensure category exists
    if (!next.categories.some(c => c.id === catId)) {
      next.categories.push({
        id: catId,
        name: categoryName || catId,
        sort: next.categories.length,
        imageUrl: null,
        active: true,
      });
    }

    // upsert product
    const baseCents = centsFromDollars(basePrice);
    const existingIndex = next.products.findIndex(p => p.id === pid);
    const prodRow = {
      id: pid,
      categoryId: catId,
      name: name.trim(),
      description: desc || "",
      basePriceCents: baseCents,
      imageUrl: imageUrl?.trim() ? imageUrl.trim() : null,
      active: !!active,
    };

    if (existingIndex >= 0) next.products[existingIndex] = prodRow;
    else next.products.push(prodRow);

    // helper to upsert a modifier group + its options from CSV
    const upsertGroup = (title: string, csv: string, required: boolean, uiType: "radio" | "chips", sort: number) => {
      const list = splitCSV(csv);
      // if empty, remove group + its options
      const groupId = `${title.toLowerCase()}_${pid}`;

      // delete old
      next.modifierGroups = next.modifierGroups.filter(g => g.id !== groupId);
      next.modifierOptions = next.modifierOptions.filter(o => o.groupId !== groupId);

      if (!list.length) return;

      next.modifierGroups.push({
        id: groupId,
        productId: pid,
        title,
        required,
        minSelect: required ? 1 : 0,
        maxSelect: required ? 1 : Math.max(10, list.length),
        uiType,
        active: true,
        sort,
      });

      list.forEach((optName, i) => {
        next.modifierOptions.push({
          id: `${groupId}_${toId(optName)}`,
          groupId,
          name: optName,
          deltaCents: 0,
          active: true,
          sort: i,
        });
      });
    };

    // Build sections like your example
    upsertGroup("Breads", breads, true, "chips", 0);
    upsertGroup("Cheeses", cheeses, false, "chips", 1);
    upsertGroup("Meats", meats, false, "chips", 2);
    upsertGroup("Toppings", toppings, false, "chips", 3);

    setErr(null);
    setBusy(true);
    try {
      await api.importCatalog(next);
      await load();
      setProductId(pid);
      loadProductToEditor(pid);
      alert("Saved ✅");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    if (!catalog) return;
    const pid = productId;
    if (!pid) return;

    const next: CatalogExport = JSON.parse(JSON.stringify(catalog));

    next.products = next.products.filter(p => p.id !== pid);

    // remove groups/options for this product
    const groupIds = next.modifierGroups.filter(g => g.productId === pid).map(g => g.id);
    next.modifierGroups = next.modifierGroups.filter(g => g.productId !== pid);
    next.modifierOptions = next.modifierOptions.filter(o => !groupIds.includes(o.groupId));

    setErr(null);
    setBusy(true);
    try {
      await api.importCatalog(next);
      await load();
      alert("Deleted ✅");
      setProductId("");
      setName("");
      setDesc("");
      setBasePrice("0.00");
      setImageUrl("");
      setActive(true);
      setBreads("");
      setCheeses("");
      setMeats("");
      setToppings("");
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Menu</h1>
            <p className="text-sm text-gray-600">Simple menu editor (fast entry for 100s of items).</p>
          </div>

          <button
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={busy}
            onClick={load}
          >
            {busy ? "Working..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: browse */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">Browse</div>

            <div className="mt-3 space-y-2">
              <label className="text-xs text-gray-600">Store</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={store}
                onChange={(e) => setStore(e.target.value)}
              >
                <option value="GLOBAL">Global (all stores)</option>
                {/* later we’ll load store list and plug overrides */}
              </select>

              <label className="text-xs text-gray-600">Category</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (GLOBAL)</option>
                ))}
              </select>

              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Search items..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <div className="max-h-[520px] overflow-auto space-y-2 pr-1">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-2 hover:bg-gray-50",
                      p.id === productId ? "border-black bg-gray-50" : "border-gray-200",
                    ].join(" ")}
                    onClick={() => loadProductToEditor(p.id)}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.id}</div>
                  </button>
                ))}
                {!filteredProducts.length && (
                  <div className="text-sm text-gray-500 border rounded-xl p-3">No items.</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: editor */}
          <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Store: {store === "GLOBAL" ? "Global (all stores)" : store}</div>
                <div className="text-lg font-semibold">{name || "New Item"}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  disabled={busy}
                  onClick={deleteProduct}
                >
                  Delete
                </button>
                <button
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await saveProduct();
                    } catch (e: any) {
                      setErr(e?.message || "Save failed");
                    }
                  }}
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      GLOBAL - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Item ID (auto from name)</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                />
                <div className="mt-1 text-xs text-gray-500">Tip: leave blank and we generate it from Name.</div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Turkey Sub"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[110px]"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Write description..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Price</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                />
                <div className="mt-1 text-xs text-gray-500">If size-based, keep 0.00 and add Size group later.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Image URL (or path)</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="fresh_items/sub.jpg"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span className="text-sm font-medium">Is active</span>
              </div>

              <div className="md:col-span-2 border-t pt-4">
                <div className="text-sm font-semibold">Build Options (comma separated)</div>
                <p className="text-xs text-gray-500 mt-1">
                  Example: white, wheat, italian herbs
                </p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Breads</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={breads} onChange={(e) => setBreads(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cheeses</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={cheeses} onChange={(e) => setCheeses(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Meats</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={meats} onChange={(e) => setMeats(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Toppings</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={toppings} onChange={(e) => setToppings(e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Note: These options are saved as modifier groups/options in backend.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </RequireAuth>
  );
}
