"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const r = useRouter();

  useEffect(() => {
    if (!getToken()) r.replace("/login");
  }, [r]);

  if (!getToken()) return null;
  return <>{children}</>;
}
