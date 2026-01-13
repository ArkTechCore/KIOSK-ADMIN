"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

export default function TopNav() {
  const p = usePathname();
  const r = useRouter();
  const loggedIn = !!getToken();

  const item = (href: string, label: string) => {
    const active = p === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg text-sm ${active ? "bg-black text-white" : "hover:bg-gray-100"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
        <div className="font-semibold">Kiosk Admin</div>

        {loggedIn && (
          <div className="flex items-center gap-2 ml-2">
            {item("/stores", "Stores")}
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
