"use client";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-20">
      {/* 로고 */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">HR</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">다농풀무원 HR</h1>
        <p className="text-sm text-gray-400 mt-1">인사 관리 시스템</p>
      </div>

      {/* 폼 */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>

        <Link href="/">
          <button className="w-full h-12 mt-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            로그인
          </button>
        </Link>
      </div>
    </div>
  );
}
