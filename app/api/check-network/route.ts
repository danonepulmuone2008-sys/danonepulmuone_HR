import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // x-real-ip가 가장 정확 (Vercel에서 실제 클라이언트 IP)
  // x-forwarded-for는 마지막 값이 실제 클라이언트 IP
  const realIp = req.headers.get("x-real-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const forwardedLast = forwarded ? forwarded.split(",").at(-1)?.trim() : null;
  const ip = realIp ?? forwardedLast ?? "unknown";

  // 로컬호스트(개발환경) 또는 회사 내부망/공인 IP 허용
  // 쉼표로 복수 prefix 지원 (예: "10.207,203.160.130")
  const prefixes = (process.env.COMPANY_IP_PREFIX ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  const isCompanyNetwork = prefixes.length > 0 && prefixes.some((prefix) => ip.startsWith(prefix));

  return NextResponse.json({
    allowed: isLocal || isCompanyNetwork,
    ip,
    debug: { realIp, forwarded },
  });
}
