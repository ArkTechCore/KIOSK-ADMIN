"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";

type StoreRow = { store_id: string; name: string; active: boolean };

export default function StoresPage() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [storeId, setStoreId] = useState("S001");
  const [name, setName] = useState("Store Name");
  const [password, setPassword] = useState("");

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
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-semibold">Stores</h1>
          <p className="text-sm text-gray-600 mt-1">Create store IDs and passwords.</p>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Store ID</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          <button
            onClick={async () => {
              setErr(null);
              try {
                await api.createStore(storeId.trim(), name.trim(), password);
                setPassword("");
                await load();
              } catch (e: any) {
                setErr(e.message);
              }
            }}
            className="mt-4 rounded-lg bg-black text-white px-4 py-2 hover:opacity-90"
          >
            Create Store
          </button>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold">Current stores</h2>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Store ID</th>
                  <th>Name</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.store_id} className="border-t">
                    <td className="py-2 font-medium">{s.store_id}</td>
                    <td>{s.name}</td>
                    <td>{s.active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={load} className="mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
