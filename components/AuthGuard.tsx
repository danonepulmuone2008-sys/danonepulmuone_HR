"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const [ready, setReady] = useState(isPublic);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && !isPublic) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublic) {
        router.replace("/login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [isPublic, router]);

  if (!ready) return null;

  return <>{children}</>;
}
