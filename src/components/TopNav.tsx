"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

export default function TopNav() {
  const p = usePathname();
  const r = useRouter();
  const loggedIn = !!getToken();

  const tab = (href: string, label: string) => {
    const active = p === href;
    return (
      <Link className={`tab ${active ? "active" : ""}`} href={href}>
        {label}
      </Link>
    );
  };

  return (
    <div className="navrow">
      <div className="brand">
        <Link href={loggedIn ? "/stores" : "/login"}>Kiosk Admin</Link>
        <span className="badge">Stores • Menu • Overrides</span>
      </div>

      {loggedIn && (
        <div className="tabs">
          {tab("/stores", "Stores")}
          {tab("/menu", "Menu")}
        </div>
      )}

      <div>
        {loggedIn ? (
          <button
            className="btn small"
            onClick={() => {
              clearToken();
              r.push("/login");
            }}
          >
            Logout
          </button>
        ) : (
          <Link className="btn small" href="/login">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
