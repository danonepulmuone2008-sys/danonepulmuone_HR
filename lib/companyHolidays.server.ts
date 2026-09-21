import { supabaseAdmin } from "@/lib/supabase-server";

export async function fetchCompanyHolidaySet(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("company_holidays")
    .select("date");
  return new Set((data ?? []).map((r: { date: string }) => r.date));
}
