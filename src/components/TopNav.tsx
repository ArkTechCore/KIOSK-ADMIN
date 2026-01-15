"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

export default function TopNav() {
  const p = usePathname();
  const r = useRouter();
  const loggedIn = !!getToken();

  const item = (href: string, label: string) => {
    const active = p === href || (href !== "/" && p.startsWith(href + "/"));
    return (
      <Link
        href={href}
        className={[
          "px-3 py-2 rounded-lg text-sm font-medium transition",
          active ? "bg-red-600 text-white" : "text-gray-800 hover:bg-gray-100",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link
          href={loggedIn ? "/stores" : "/login"}
          className="font-semibold text-gray-900"
        >
          Kiosk Admin
        </Link>

        {loggedIn && (
          <div className="flex items-center gap-2 ml-2">
            {item("/stores", "Stores")}
            {item("/menu", "Menu")}
            {item("/store-menu", "Store Menu")}
            {item("/reports", "Reports")}
          </div>
        )}

        <div className="ml-auto">
          {loggedIn && (
            <button
              onClick={() => {
                clearToken();
                r.push("/login");
              }}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
