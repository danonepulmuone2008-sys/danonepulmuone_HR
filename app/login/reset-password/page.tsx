"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) { setErrorMsg("비밀번호는 6자 이상이어야 합니다"); return; }
    if (password !== passwordConfirm) { setErrorMsg("비밀번호가 일치하지 않습니다"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "비밀번호 변경에 실패했습니다"); return; }

      alert("비밀번호가 변경되었습니다.");
      router.push("/login");
    } catch {
      setErrorMsg("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mx-auto mb-4">
            <Image src="/pulmuone-logo.png" alt="풀무원 로고" width={160} height={80} style={{ objectFit: "contain" }} priority />
          </div>
          <h1 className="text-xl font-bold text-gray-900">풀무원다논 HR</h1>
          <p className="text-sm text-gray-400 mt-1">비밀번호 재설정</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
            placeholder="새로 설정할 비밀번호 (6자 이상)"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => { setPasswordConfirm(e.target.value); setErrorMsg(""); }}
            placeholder="비밀번호 확인"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: "#8dc63f" }}
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
