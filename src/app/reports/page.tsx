"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<any>(null);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-700">Admin daily report (all stores).</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-sm font-medium text-gray-900">Date</label>
              <input
                className="mt-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <button
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              disabled={busy}
              onClick={async () => {
                setErr(null);
                setBusy(true);
                try {
                  setOut(await api.adminDailyReport(date));
                } catch (e: any) {
                  setErr(e?.message || "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Loading..." : "Run report"}
            </button>
          </div>

          <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border bg-gray-50 p-3 text-xs text-gray-900">
            {out ? JSON.stringify(out, null, 2) : "No data yet."}
          </pre>
        </div>
      </div>
    </RequireAuth>
  );
}
