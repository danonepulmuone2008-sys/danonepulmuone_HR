"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (password !== passwordConfirm) {
      setErrorMsg("비밀번호가 일치하지 않습니다");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, department, position, securityQuestion, securityAnswer } },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setErrorMsg("이미 가입된 이메일입니다");
        } else if (error.message.includes("Password")) {
          setErrorMsg("비밀번호 형식이 올바르지 않습니다");
        } else if (error.message.includes("email")) {
          setErrorMsg("이메일 형식이 올바르지 않습니다");
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      if (data.session) {
        router.push("/login");
      } else {
        alert("이메일 인증 후 로그인해주세요");
        router.push("/login");
      }
    } catch (err) {
      setErrorMsg("가입 중 오류가 발생했습니다");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mx-auto mb-4">
            <Image
              src="/pulmuone-logo.png"
              alt="풀무원 로고"
              width={160}
              height={80}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900">풀무원다논 HR</h1>
          <p className="text-sm text-gray-400 mt-1">회원가입</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSignup} className="flex flex-col gap-4" noValidate>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="text"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="부서"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="text"
            required
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="직급"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <input
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />
          <select
            required
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
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
            onChange={(e) => setSecurityAnswer(e.target.value)}
            placeholder="비밀번호 확인 답변"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-[#8dc63f] transition-colors"
          />

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: "#8dc63f" }}
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>

          <p className="text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <a href="/login" className="font-medium" style={{ color: "#8dc63f" }}>
              로그인
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
