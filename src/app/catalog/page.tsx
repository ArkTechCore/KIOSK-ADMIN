"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogExport } from "@/lib/api";

const EMPTY: CatalogExport = {
  categories: [],
  products: [],
  modifierGroups: [],
  modifierOptions: [],
};

function safeJsonParse(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" };
  }
}

function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CatalogPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [jsonText, setJsonText] = useState(JSON.stringify(EMPTY, null, 2));
  const parsed = useMemo(() => safeJsonParse(jsonText), [jsonText]);

  const counts = useMemo(() => {
    if (!parsed.ok) return null;
    const v = parsed.value || {};
    return {
      categories: Array.isArray(v.categories) ? v.categories.length : 0,
      products: Array.isArray(v.products) ? v.products.length : 0,
      modifierGroups: Array.isArray(v.modifierGroups) ? v.modifierGroups.length : 0,
      modifierOptions: Array.isArray(v.modifierOptions) ? v.modifierOptions.length : 0,
    };
  }, [parsed]);

  async function loadFromBackend() {
    setErr(null);
    setOkMsg(null);
    setBusy(true);
    try {
      const data = await api.exportCatalog();
      setJsonText(JSON.stringify(data || EMPTY, null, 2));
      setOkMsg("Loaded catalog from backend.");
    } catch (e: any) {
      setErr(e?.message || "Failed to load catalog");
    } finally {
      setBusy(false);
    }
  }

  async function importToBackend() {
    setErr(null);
    setOkMsg(null);

    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }

    // very light shape check
    const v = parsed.value;
    const missing = ["categories", "products", "modifierGroups", "modifierOptions"].filter((k) => !Array.isArray(v?.[k]));
    if (missing.length) {
      setErr(`Missing/invalid arrays: ${missing.join(", ")}`);
      return;
    }

    setBusy(true);
    try {
      await api.importCatalog(v as CatalogExport);
      setOkMsg("Imported successfully. Your kiosk app will show it on the next refresh.");
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Menu (Catalog)</h1>
            <p className="text-sm text-gray-700">
              Fast workflow for 100s of items: <span className="font-medium">Export → Edit JSON → Import</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={loadFromBackend}
            >
              {busy ? "Loading..." : "Export from backend"}
            </button>

            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={busy}
              onClick={importToBackend}
            >
              {busy ? "Working..." : "Import to backend"}
            </button>

            <button
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={() => {
                if (!parsed.ok) return;
                downloadJson("catalog.json", parsed.value);
              }}
            >
              Download JSON
            </button>

            <button
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Upload JSON
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const text = await f.text();
                setJsonText(text);
              }}
            />
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {okMsg && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{okMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="font-semibold">Counts</div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span>Categories</span><span className="font-medium">{counts?.categories ?? "-"}</span></div>
              <div className="flex justify-between"><span>Products</span><span className="font-medium">{counts?.products ?? "-"}</span></div>
              <div className="flex justify-between"><span>Modifier Groups</span><span className="font-medium">{counts?.modifierGroups ?? "-"}</span></div>
              <div className="flex justify-between"><span>Modifier Options</span><span className="font-medium">{counts?.modifierOptions ?? "-"}</span></div>
            </div>

            <div className="mt-5 text-xs text-gray-600 leading-relaxed">
              <div className="font-medium text-gray-800">Rules (recommended)</div>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Size: required, radio, min 1 max 1, price in options</li>
                <li>Bread: required, radio, min 1 max 1</li>
                <li>Add-ons: optional, chips, min 0 max 10</li>
              </ul>
              <div className="mt-3">
                Tip: Keep product <span className="font-medium">basePriceCents = 0</span> for subs/wraps and put price in Size option deltaCents.
              </div>
            </div>

            <button
              className="mt-5 w-full rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              onClick={() => setJsonText(JSON.stringify(EMPTY, null, 2))}
              disabled={busy}
            >
              Reset to empty template
            </button>
          </div>

          <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Catalog JSON</div>
              <div className="text-xs">
                {parsed.ok ? (
                  <span className="text-green-700 font-medium">Valid JSON</span>
                ) : (
                  <span className="text-red-700 font-medium">Invalid JSON</span>
                )}
              </div>
            </div>

            <textarea
              className="mt-3 w-full min-h-[520px] rounded-xl border bg-gray-50 p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-red-200"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
