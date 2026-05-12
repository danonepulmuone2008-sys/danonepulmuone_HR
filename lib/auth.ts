import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type AuthUser = {
  id: string
  email?: string
}

type UserProfile = {
  id: string
  name?: string
  role: string
}

type AuthResult =
  | {
      ok: true
      user: AuthUser
      profile: UserProfile
    }
  | {
      ok: false
      response: NextResponse
    }

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization")

  if (!authHeader) return null
  if (!authHeader.startsWith("Bearer ")) return null

  const token = authHeader.replace("Bearer ", "").trim()

  if (!token || token === "undefined" || token === "null") {
    return null
  }

  return token
}

async function verifySupabaseToken(token: string): Promise<AuthUser | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    console.error("[auth] Supabase 환경변수가 없습니다.")
    return null
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

 if (!res.ok) {
  const text = await res.text()
  console.error("[auth] token verify failed:", res.status, text)
  return null
}

  const user = await res.json()

  if (!user?.id) return null

  return {
    id: user.id,
    email: user.email,
  }
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const token = getBearerToken(req)

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      ),
    }
  }

  const user = await verifySupabaseToken(token)

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      ),
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("[auth] profile error:", profileError)
    return {
      ok: false,
      response: NextResponse.json(
        { error: "사용자 정보 조회에 실패했습니다" },
        { status: 500 }
      ),
    }
  }

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      ),
    }
  }

  return {
    ok: true,
    user,
    profile,
  }
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireUser(req)

  if (!auth.ok) return auth

  if (auth.profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      ),
    }
  }

  return auth
}