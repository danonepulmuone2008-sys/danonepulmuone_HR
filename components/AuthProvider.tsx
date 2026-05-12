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
  phone: string;
  email: string;
  token: string;
};

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
});

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
    let mounted = true;

    async function clearAuth() {
      if (!mounted) return;

      setSession(null);
      setUser(null);

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // local signOut 실패해도 화면 전환은 진행
      }

      if (!isPublic) {
        router.replace("/login");
      }

      setReady(true);
    }

    async function setAuthState(nextSession: Session) {
      // getSession으로 가져온 세션이 실제 Supabase Auth 서버에도 유효한지 검증
      const {
        data: { user: verifiedUser },
        error: userError,
      } = await supabase.auth.getUser(nextSession.access_token);

      if (userError || !verifiedUser) {
        await clearAuth();
        return;
      }

      const meta = verifiedUser.user_metadata ?? {};

      const { data: profile } = await supabase
        .from("users")
        .select("name, department, role, position, phone")
        .eq("id", verifiedUser.id)
        .maybeSingle();

      if (!mounted) return;

      setSession(nextSession);
      setUser({
        id: verifiedUser.id,
        name: profile?.name ?? meta.name ?? "",
        department: profile?.department ?? meta.department ?? "",
        position: profile?.position ?? meta.position ?? "",
        phone: profile?.phone ?? meta.phone ?? "",
        email: verifiedUser.email ?? "",
        token: nextSession.access_token,
      });

      setReady(true);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (!session) {
        if (!isPublic) router.replace("/login");
        setReady(true);
        return;
      }

      await setAuthState(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !nextSession) {
        setSession(null);
        setUser(null);

        if (!isPublic) {
          router.replace("/login");
        }

        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setAuthState(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isPublic, router]);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ session, user }}>
      {children}
    </AuthContext.Provider>
  );
}