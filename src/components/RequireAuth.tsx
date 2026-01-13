"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const r = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) r.replace("/login");
  }, [r]);

  return <>{children}</>;
}
