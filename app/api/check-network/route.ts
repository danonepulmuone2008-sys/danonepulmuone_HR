import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.headers.get("x-real-ip") ?? "unknown";

  // 로컬호스트(개발환경) 또는 회사 내부망 IP 허용
  // 실제 배포 시 COMPANY_IP_PREFIX 환경변수에 회사 내부 IP 대역 설정 (예: "10.207")
  const companyPrefix = process.env.COMPANY_IP_PREFIX ?? "";
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  const isCompanyNetwork = companyPrefix ? ip.startsWith(companyPrefix) : false;

  return NextResponse.json({ allowed: isLocal || isCompanyNetwork, ip });
}
