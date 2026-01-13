"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";

type StoreRow = {
  store_id: string;
  name: string;
  active: boolean;
  tax_rate?: number;
};

export default function StoresPage() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [storeId, setStoreId] = useState("S001");
  const [name, setName] = useState("Store Name");
  const [password, setPassword] = useState("");
  const [taxRate, setTaxRate] = useState("0.08875"); // default NJ tax

  async function load() {
    setErr(null);
    try {
      const data = await api.listStores();
      setRows(data);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Create store */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-semibold">Stores</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create store IDs, passwords, and tax rate.
          </p>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium">Store ID</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tax rate</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0.08875"
              />
              <div className="text-xs text-gray-500 mt-1">
                Example: 8.875% = 0.08875
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium">Password</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Store login password"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={async () => {
                  setErr(null);
                  try {
                    const tr = Number(taxRate);
                    if (!storeId.trim()) throw new Error("Store ID required");
                    if (!name.trim()) throw new Error("Store name required");
                    if (!password) throw new Error("Password required");
                    if (Number.isNaN(tr) || tr < 0 || tr > 1) {
                      throw new Error("Tax rate must be between 0 and 1");
                    }

                    await api.createStore(
                      storeId.trim(),
                      name.trim(),
                      password,
                      tr
                    );

                    setPassword("");
                    await load();
                  } catch (e: any) {
                    setErr(e.message);
                  }
                }}
                className="w-full rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
              >
                Create Store
              </button>
            </div>
          </div>
        </div>

        {/* Store list */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold">Current stores</h2>

          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Store ID</th>
                  <th>Name</th>
                  <th>Tax</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.store_id} className="border-t">
                    <td className="py-2 font-medium">{s.store_id}</td>
                    <td>{s.name}</td>
                    <td>
                      {typeof s.tax_rate === "number" ? s.tax_rate : "-"}
                    </td>
                    <td>{s.active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={load}
            className="mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
