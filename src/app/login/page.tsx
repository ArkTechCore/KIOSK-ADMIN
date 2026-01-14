"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600">Use your backend admin credentials.</p>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
            disabled={busy}
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const out = await api.adminLogin(email.trim(), password);
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
        </div>
      </div>
    </div>
  );
}
