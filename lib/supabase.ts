import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 클라이언트/서버 공용 (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 전용 (service_role key) — 클라이언트에서는 anon key로 폴백 (권한 없음)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
);

export function createAdminClient() {
  return supabaseAdmin;
}

