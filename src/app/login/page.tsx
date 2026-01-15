"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, setToken } from "@/lib/api";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // prevents “stuck” invalid token loops
    clearToken();
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600">Sign in to manage Stores and Menu.</p>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-800">Email</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">Password</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            disabled={busy}
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const out = await api.adminLogin(email.trim(), password);
                if (!out?.access_token) throw new Error("Login did not return access_token");
                setToken(out.access_token);
                r.push("/stores");
              } catch (e: any) {
                setErr(e?.message || "Login failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-gray-500">
            If you see “Invalid admin token”, it usually means your API base URL is wrong or you copied the device token
            instead of the admin token.
          </div>
        </div>
      </div>
    </div>
  );
}
