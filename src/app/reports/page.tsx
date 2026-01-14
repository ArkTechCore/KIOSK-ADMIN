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
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-gray-700">Admin daily report (all stores).</p>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="card">
          <div className="card-h">
            <div className="font-semibold">Daily report</div>
            <div className="text-xs text-gray-500">If backend supports date filtering, it will use ?date=YYYY-MM-DD.</div>
          </div>

          <div className="card-b">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="label">Date</div>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
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
      </div>
    </RequireAuth>
  );
}
