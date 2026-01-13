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
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-center">Admin Login</h1>

        <div className="mt-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@email.com"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white text-black px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Error */}
          {err && (
            <div className="text-sm text-red-600 text-center">
              {err}
            </div>
          )}

          {/* Button */}
          <button
            disabled={busy}
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const res = await api.adminLogin(email, password);
                setToken(res.token);
                r.push("/stores");
              } catch (e: any) {
                setErr(e.message || "Login failed");
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-lg bg-black text-white py-2 font-medium
                       hover:opacity-90 disabled:opacity-60 transition"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
