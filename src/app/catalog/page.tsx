"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, CatalogExportPayload, CatalogImportPayload } from "@/lib/api";

function prettyJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function safeParseJson(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" };
  }
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function starterTemplate(): CatalogImportPayload {
  return {
    categories: [{ id: "subs", name: "Subs", sort: 0, imageUrl: null, active: true }],
    products: [
      {
        id: "chicken_sub",
        categoryId: "subs",
        name: "Chicken Sub",
        description: "Classic chicken sub.",
        basePriceCents: 0,
        imageUrl: null,
        active: true,
      },
    ],
    modifierGroups: [
      {
        id: "size_chicken_sub",
        productId: "chicken_sub",
        title: "Size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        uiType: "radio",
        sort: 0,
        active: true,
      },
    ],
    modifierOptions: [
      { id: "size_6", groupId: "size_chicken_sub", name: "6 inch", deltaCents: 599, sort: 0, active: true },
      { id: "size_12", groupId: "size_chicken_sub", name: "12 inch", deltaCents: 1099, sort: 1, active: true },
    ],
  };
}

export default function CatalogPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [exported, setExported] = useState<CatalogExportPayload | null>(null);
  const [jsonText, setJsonText] = useState(prettyJson(starterTemplate()));

  const parsed = useMemo(() => safeParseJson(jsonText), [jsonText]);

  async function refreshExport() {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const data = await api.catalogExport();
      setExported(data);
      setJsonText(prettyJson(data)); // edit current catalog directly
      setInfo("Loaded current catalog from backend. Edit → Import when ready.");
    } catch (e: any) {
      setErr(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function doImport(payload: CatalogImportPayload) {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const out = await api.catalogImport(payload);
      setInfo(
        `Imported ✅ categories: ${out.counts.categories}, products: ${out.counts.products}, groups: ${out.counts.modifierGroups}, options: ${out.counts.modifierOptions}`
      );
      await refreshExport();
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Catalog</h1>
            <p className="text-sm text-gray-700">
              Fast for 100s of items: edit one JSON → import once.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              disabled={busy}
              onClick={refreshExport}
            >
              {busy ? "Working..." : "Reload from backend"}
            </button>

            <button
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
              disabled={busy || !parsed.ok}
              onClick={() => download("catalog.json", jsonText)}
            >
              Download JSON
            </button>
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="font-semibold">Quick actions</div>

              <div className="mt-3 space-y-2">
                <button
                  className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  disabled={busy}
                  onClick={() => setJsonText(prettyJson(starterTemplate()))}
                >
                  Load starter template
                </button>

                <label className="block">
                  <div className="text-sm font-medium mb-1">Load from file</div>
                  <input
                    type="file"
                    accept="application/json"
                    className="block w-full text-sm"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setJsonText(await f.text());
                    }}
                  />
                  <div className="mt-1 text-xs text-gray-600">
                    Keep a master JSON on your laptop, edit anytime, import anytime.
                  </div>
                </label>

                <button
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                  disabled={busy || !parsed.ok}
                  onClick={() => parsed.ok && doImport(parsed.value as CatalogImportPayload)}
                >
                  Import to backend
                </button>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="font-semibold">Backend counts</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Categories</div><div className="font-semibold">{exported?.categories?.length ?? "-"}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Products</div><div className="font-semibold">{exported?.products?.length ?? "-"}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Groups</div><div className="font-semibold">{exported?.modifierGroups?.length ?? "-"}</div></div>
                <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Options</div><div className="font-semibold">{exported?.modifierOptions?.length ?? "-"}</div></div>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                After import, test kiosk output: <code className="px-1 py-0.5 rounded bg-gray-100">/stores/QFC/menu-v2</code>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Catalog JSON</div>
                <div className="text-xs text-gray-600">Paste/edit JSON here.</div>
              </div>

              <button
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                disabled={!parsed.ok}
                onClick={() => navigator.clipboard?.writeText(jsonText)}
              >
                Copy
              </button>
            </div>

            <textarea
              className="mt-3 w-full h-[560px] rounded-xl border px-3 py-3 font-mono text-xs leading-5"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />

            {!parsed.ok && <div className="mt-3 text-sm text-red-700">JSON error: {parsed.error}</div>}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
