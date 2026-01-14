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
      (s) => s.store_id.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q)
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
            <h1 className="text-xl font-semibold">Stores</h1>
            <p className="text-sm text-gray-700">Create stores and reset kiosk password.</p>
          </div>
          <button className="btn btn-ghost" disabled={busy} onClick={refresh}>
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="card">
            <div className="card-h flex items-center justify-between">
              <div className="font-semibold">All stores</div>
              <div className="text-xs text-gray-600">{stores.length}</div>
            </div>

            <div className="card-b">
              <input
                className="input"
                placeholder="Search (QFC, Clifton...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                {filtered.map((s) => (
                  <div key={s.store_id} className="rounded-xl border px-3 py-3 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-600">store_id: {s.store_id}</div>
                      </div>

                      <span
                        className={[
                          "text-xs font-medium px-2 py-1 rounded-full",
                          s.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700",
                        ].join(" ")}
                      >
                        {s.active ? "active" : "inactive"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigator.clipboard?.writeText(s.store_id)}
                      >
                        Copy ID
                      </button>

                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setErr(null);
                          try {
                            const res = await api.resetStorePassword(s.store_id);

                            // backend may return {password:"..."} or {new_password:"..."} or something
                            const newPass =
                              res?.password || res?.new_password || res?.temp_password || res?.kiosk_password;

                            if (newPass) {
                              alert(`New password for ${s.store_id}: ${newPass}`);
                            } else {
                              alert("Password reset done. Check server response (it may not return the password).");
                            }
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
                  <div className="text-sm text-gray-600 border rounded-xl p-3">No stores.</div>
                )}
              </div>
            </div>
          </div>

          {/* Create */}
          <div className="card">
            <div className="card-h">
              <div className="font-semibold">Create store</div>
              <p className="mt-1 text-sm text-gray-700">
                Creates the store and kiosk password. (Tax rate is optional depending on backend.)
              </p>
            </div>

            <div className="card-b grid grid-cols-1 gap-3">
              <div>
                <div className="label">Store ID</div>
                <input className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
              </div>
              <div>
                <div className="label">Name</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <div className="label">Kiosk password</div>
                <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <div className="label">Tax rate (optional)</div>
                <input className="input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>

              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={async () => {
                  setErr(null);
                  setBusy(true);
                  try {
                    await api.createStore(
                      storeId.trim(),
                      name.trim(),
                      password,
                      taxRate.trim() ? Number(taxRate) : undefined
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
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
