"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, setToken } from "@/lib/api";

function extractToken(out: any): string | null {
  return (
    out?.access_token ||
    out?.accessToken ||
    out?.token ||
    out?.jwt ||
    out?.data?.access_token ||
    out?.data?.accessToken ||
    out?.data?.token ||
    out?.data?.jwt ||
    null
  );
}

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    clearToken(); // prevents invalid token loops
  }, []);

  return (
    <div className="card" style={{ maxWidth: 520, margin: "28px auto" }}>
      <div className="cardHeader">
        <div>
          <h1 className="h1">Admin Login</h1>
          <p className="p">Sign in to manage Stores and Menu.</p>
        </div>
      </div>

      <div className="cardBody">
        {err && <div className="note">{err}</div>}

        <div style={{ marginTop: 14 }}>
          <label className="label">Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@quickfoods.com"
            autoComplete="username"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            className="btn primary"
            style={{ width: "100%" }}
            disabled={busy}
            onClick={async () => {
              setErr(null);
              setBusy(true);
              try {
                const out = await api.adminLogin(email.trim(), password);

                const token = extractToken(out);
                if (!token) {
                  throw new Error(
                    "Login did not return a token. Response: " + JSON.stringify(out)
                  );
                }

                setToken(token);
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
