import type { NextConfig } from "next";

// 회사 네트워크 SSL 프록시 우회 (개발 환경 전용)
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {};

export default nextConfig;
