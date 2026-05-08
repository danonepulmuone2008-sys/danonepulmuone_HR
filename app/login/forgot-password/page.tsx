"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SECURITY_QUESTIONS = [
  "기억에 남는 추억의 장소는?",
  "자신의 보물 1호는?",
  "가장 기억에 남는 선생님 성함은?",
  "추억하고 싶은 날짜가 있다면?",
  "받았던 선물 중 기억에 남는 독특한 선물은?",
  "유년시절 가장 생각나는 친구 이름은?",
  "인상 깊게 읽은 책 이름은?",
  "자신이 제일 존경하는 인물은?",
  "어릴 적 별명이 있다면?",
  "다시 태어나면 되고 싶은 것은?",
  "유년시절 기억에 남는 짝꿍 이름은?",
  "내가 좋아하는 캐릭터는?",
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setErrorMsg("");

    if (!email) { setErrorMsg("이메일을 입력해주세요"); return; }
    if (!securityQuestion) { setErrorMsg("질문을 선택해주세요"); return; }
    if (!securityAnswer) { setErrorMsg("답변을 입력해주세요"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, securityQuestion, securityAnswer }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "확인에 실패했습니다"); return; }

      router.push("/login/reset-password");
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
          <p className="text-sm text-gray-400 mt-1">비밀번호 찾기</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
            placeholder="가입한 이메일을 입력하세요"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <select
            required
            value={securityQuestion}
            onChange={(e) => { setSecurityQuestion(e.target.value); setErrorMsg(""); }}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors text-gray-500"
          >
            <option value="" disabled>비밀번호 분실시 답변할 질문을 선택하세요</option>
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          <input
            type="text"
            required
            value={securityAnswer}
            onChange={(e) => { setSecurityAnswer(e.target.value); setErrorMsg(""); }}
            placeholder="비밀번호 확인 답변"
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
            {loading ? "확인 중..." : "확인"}
          </button>

          <p className="text-center text-sm text-gray-500">
            <a href="/login" className="font-medium" style={{ color: "#8dc63f" }}>
              로그인으로 돌아가기
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
