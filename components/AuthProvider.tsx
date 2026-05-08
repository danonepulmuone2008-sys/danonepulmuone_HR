"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  token: string;
};

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null });

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(isPublic);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        if (!isPublic) router.replace("/login");
        setReady(true);
        return;
      }

      const meta = session.user.user_metadata ?? {};

      const { data: profile } = await supabase
        .from("users")
        .select("name, department, role")
        .eq("id", session.user.id)
        .maybeSingle();

      setSession(session);
      setUser({
        id: session.user.id,
        name: profile?.name ?? meta.name ?? "",
        department: profile?.department ?? meta.department ?? "",
        position: profile?.role ?? meta.position ?? "",
        email: session.user.email ?? "",
        token: session.access_token,
      });
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        if (!isPublic) router.replace("/login");
      } else if (session) {
        setSession(session);
        setUser((prev) => prev ? { ...prev, token: session.access_token } : prev);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [isPublic, router]);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ session, user }}>
      {children}
    </AuthContext.Provider>
  );
}
