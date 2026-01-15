"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

function NavItem({ href, label }: { href: string; label: string }) {
  const p = usePathname();
  const active = p === href;
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium transition",
        active ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  const r = useRouter();
  const loggedIn = !!getToken();

  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href={loggedIn ? "/stores" : "/login"} className="font-semibold tracking-tight">
          Kiosk Admin
        </Link>

        {loggedIn && (
          <nav className="flex items-center gap-2 ml-2">
            <NavItem href="/stores" label="Stores" />
            <NavItem href="/catalog" label="Menu" />
            <NavItem href="/reports" label="Reports" />
          </nav>
        )}

        <div className="ml-auto">
          {loggedIn && (
            <button
              onClick={() => {
                clearToken();
                r.push("/login");
              }}
              className="px-3 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
