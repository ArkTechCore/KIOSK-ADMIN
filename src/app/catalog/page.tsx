"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogImportPayload } from "@/lib/api";

const emptyCatalog: CatalogImportPayload = {
  categories: [],
  products: [],
  modifierGroups: [],
  modifierOptions: [],
};

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function safeJsonParse<T>(s: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(s) as T };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" };
  }
}

function validateCatalog(x: CatalogImportPayload) {
  // lightweight checks to prevent obvious mistakes
  const catIds = new Set(x.categories.map(c => c.id));
  for (const p of x.products) {
    if (!catIds.has(p.categoryId)) throw new Error(`Product ${p.id} references missing categoryId=${p.categoryId}`);
  }
  const prodIds = new Set(x.products.map(p => p.id));
  for (const g of x.modifierGroups) {
    if (!prodIds.has(g.productId)) throw new Error(`Group ${g.id} references missing productId=${g.productId}`);
  }
  const groupIds = new Set(x.modifierGroups.map(g => g.id));
  for (const o of x.modifierOptions) {
    if (!groupIds.has(o.groupId)) throw new Error(`Option ${o.id} references missing groupId=${o.groupId}`);
  }
}

export default function CatalogPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogImportPayload>(emptyCatalog);
  const [jsonText, setJsonText] = useState<string>(pretty(emptyCatalog));

  const counts = useMemo(() => {
    return {
      categories: catalog.categories.length,
      products: catalog.products.length,
      groups: catalog.modifierGroups.length,
      options: catalog.modifierOptions.length,
    };
  }, [catalog]);

  async function load() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const data = await api.exportCatalog();
      setCatalog(data);
      setJsonText(pretty(data));
    } catch (e: any) {
      setErr(e?.message || "Failed to export catalog");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function importNow() {
    setErr(null);
    setOk(null);

    const parsed = safeJsonParse<CatalogImportPayload>(jsonText);
    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }

    setBusy(true);
    try {
      validateCatalog(parsed.value);
      await api.importCatalog(parsed.value);
      setOk("Imported successfully. Reloading...");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Catalog</h1>
            <p className="text-sm text-gray-600">
              Simple workflow: Export → Edit JSON → Import. Best for adding 100s of items quickly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={load} disabled={busy}>
              {busy ? "Working..." : "Reload"}
            </button>
            <button className="btn btn-primary" onClick={importNow} disabled={busy}>
              Import to backend
            </button>
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {ok && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{ok}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card">
            <div className="card-h">
              <div className="font-semibold">Current counts</div>
              <div className="text-xs text-gray-500">From last Export</div>
            </div>
            <div className="card-b space-y-2 text-sm">
              <div className="flex justify-between"><span>Categories</span><b>{counts.categories}</b></div>
              <div className="flex justify-between"><span>Products</span><b>{counts.products}</b></div>
              <div className="flex justify-between"><span>Modifier Groups</span><b>{counts.groups}</b></div>
              <div className="flex justify-between"><span>Modifier Options</span><b>{counts.options}</b></div>

              <div className="pt-3 border-t text-xs text-gray-600 space-y-1">
                <div><b>Pricing tip:</b> Keep product basePriceCents = 0 for subs, and put price in Size options.</div>
                <div><b>Rules:</b> Size required 1..1, Bread required 1..1, Add-ons optional 0..10</div>
              </div>
            </div>
          </div>

          <div className="card lg:col-span-2">
            <div className="card-h flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Catalog JSON</div>
                <div className="text-xs text-gray-500">Edit this, then click “Import to backend”.</div>
              </div>

              <button
                className="btn btn-ghost"
                onClick={() => {
                  setJsonText(pretty(catalog));
                  setOk("Reset editor to last exported version.");
                  setErr(null);
                }}
                disabled={busy}
              >
                Reset editor
              </button>
            </div>

            <div className="card-b">
              <textarea
                className="input font-mono text-xs min-h-[520px]"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
              />
              <div className="help mt-2">
                After import, your Flutter kiosk will show items via <b>/stores/QFC/menu-v2</b>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
