"use client";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");
    setLoginError("");

    if (!email) {
      setEmailError("이메일을 입력하지 않았습니다");
      return;
    }
    if (!password) {
      setPasswordError("비밀번호를 입력하지 않았습니다");
      return;
    }

    setLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 1000));
      setLoginError("이메일 또는 비밀번호가 틀렸습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-10 text-center">
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
          <p className="text-sm text-gray-400 mt-1">인사 관리 시스템</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setLoginError("");
              }}
              placeholder="이메일을 입력하세요"
              className={`w-full h-12 px-4 rounded-xl border text-sm outline-none bg-gray-50 transition-colors ${
                emailError
                  ? "border-red-400 focus:border-red-400"
                  : "border-gray-200 focus:border-[#8dc63f]"
              }`}
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1 pl-1">{emailError}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
                setLoginError("");
              }}
              onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              placeholder="비밀번호를 입력하세요"
              className={`w-full h-12 px-4 rounded-xl border text-sm outline-none bg-gray-50 transition-colors ${
                passwordError
                  ? "border-red-400 focus:border-red-400"
                  : "border-gray-200 focus:border-[#8dc63f]"
              }`}
            />
            {capsLock && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1 pl-1">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-red-500 text-red-500 font-bold leading-none text-[9px]">
                  i
                </span>
                Caps Lock is on
              </p>
            )}
            {passwordError && (
              <p className="text-xs text-red-500 mt-1 pl-1">{passwordError}</p>
            )}
          </div>

          {loginError && (
            <p className="text-xs text-red-500 text-center -mt-1">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center"
            style={{ backgroundColor: "#8dc63f" }}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              "로그인"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
