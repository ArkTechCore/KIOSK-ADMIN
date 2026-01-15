"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api, AdminStore } from "@/lib/api";

export default function StoresPage() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [storeId, setStoreId] = useState("QFC");
  const [name, setName] = useState("Quick Foods Clifton");
  const [password, setPassword] = useState("QFC12345");
  const [taxRate, setTaxRate] = useState("0.06625");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.store_id.toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q)
    );
  }, [stores, query]);

  async function refresh() {
    setErr(null);
    setBusy(true);
    try {
      setStores(await api.listStores());
    } catch (e: any) {
      setErr(e?.message || "Failed to load stores");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Stores</h1>
            <p className="text-sm text-gray-700">
              Create stores and reset kiosk passwords.
            </p>
          </div>

          <button
            className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            disabled={busy}
            onClick={refresh}
          >
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">All stores</div>
              <div className="text-xs text-gray-600">{stores.length}</div>
            </div>

            <input
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Search (QFC, Clifton...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="mt-3 space-y-2 max-h-[460px] overflow-auto pr-1">
              {filtered.map((s) => (
                <div key={s.store_id} className="rounded-2xl border px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-600">
                        store_id: <span className="font-mono">{s.store_id}</span>
                      </div>
                    </div>

                    <span
                      className={[
                        "text-xs font-semibold px-3 py-1 rounded-full",
                        s.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700",
                      ].join(" ")}
                    >
                      {s.active ? "active" : "inactive"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(s.store_id);
                        } catch {
                          // fallback
                          prompt("Copy store id:", s.store_id);
                        }
                      }}
                    >
                      Copy ID
                    </button>

                    <button
                      className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                      disabled={busy}
                      onClick={async () => {
                        const newPass = prompt(`New kiosk password for ${s.store_id}?`);
                        if (!newPass) return;

                        setBusy(true);
                        setErr(null);
                        try {
                          await api.resetStorePassword(s.store_id, newPass);
                          alert("Password updated.");
                        } catch (e: any) {
                          setErr(e?.message || "Reset failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              ))}

              {!filtered.length && (
                <div className="text-sm text-gray-600 border rounded-xl p-3">
                  No stores.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="font-semibold text-gray-900">Create store</div>
            <p className="mt-1 text-sm text-gray-700">
              Creates the store, kiosk password, and tax rate.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Field label="Store ID" value={storeId} setValue={setStoreId} />
              <Field label="Name" value={name} setValue={setName} />
              <Field label="Kiosk password" value={password} setValue={setPassword} />
              <Field label="Tax rate" value={taxRate} setValue={setTaxRate} />

              <button
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                disabled={busy}
                onClick={async () => {
                  setErr(null);
                  setBusy(true);
                  try {
                    await api.createStore(
                      storeId.trim(),
                      name.trim(),
                      password,
                      Number(taxRate) || 0
                    );
                    await refresh();
                    alert("Store created.");
                  } catch (e: any) {
                    setErr(e?.message || "Create failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create store
              </button>

              <div className="text-xs text-gray-600">
                After creating a store, use the same <b>store_id</b> in your Flutter kiosk and login using device-login.
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-900">{label}</label>
      <input
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
