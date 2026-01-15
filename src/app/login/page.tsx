"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, getToken } from "@/lib/api";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If already logged in, send to stores
  useEffect(() => {
    if (getToken()) r.replace("/stores");
  }, [r]);

  async function submit() {
    if (busy) return;

    const e = email.trim();
    const p = password;

    if (!e) return setErr("Email is required.");
    if (!p) return setErr("Password is required.");

    setErr(null);
    setBusy(true);
    try {
      const out = await api.adminLogin(e, p);

      // ✅ backend returns { token, email, role }
      if (!out?.token) throw new Error("Login succeeded but no token returned.");

      setToken(out.token);
      r.push("/stores");
    } catch (ex: any) {
      const msg = ex?.message || "Login failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600">Use your backend admin credentials.</p>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-800">Email</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">Password</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          <button
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
            disabled={busy}
            onClick={submit}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-gray-500">
            If you still see “Invalid admin token”, check that{" "}
            <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span> ends with{" "}
            <span className="font-mono">/api/v1</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
