"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

function NavLink({ href, label }: { href: string; label: string }) {
  const p = usePathname();
  const active = p === href || p.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium transition",
        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
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
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-semibold text-gray-900">
          Kiosk Admin
        </Link>

        {loggedIn && (
          <div className="flex items-center gap-2 ml-2">
            <NavLink href="/stores" label="Stores" />
            <NavLink href="/catalog" label="Catalog" />
            <NavLink href="/reports" label="Reports" />
          </div>
        )}

        <div className="ml-auto">
          {loggedIn ? (
            <button
              onClick={() => {
                clearToken();
                r.push("/login");
              }}
              className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
