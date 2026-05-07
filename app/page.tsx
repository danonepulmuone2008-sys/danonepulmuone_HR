"use client";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { DUMMY } from "@/lib/api";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type ModalState =
  | { type: "confirm"; direction: "in" | "out"; time: string }
  | { type: "edit"; direction: "in" | "out"; time: string }
  | null;

type ToastType = "success" | "error";

export default function HomePage() {
  const { user, attendance } = DUMMY;

  const [mealUsed, setMealUsed] = useState<number>(DUMMY.meals.used);
  const [mealLimit, setMealLimit] = useState<number>(DUMMY.meals.totalLimit);
  const mealPercent = Math.round((mealUsed / mealLimit) * 100);

  const [clockIn, setClockIn] = useState<string | null>(null);
  const [clockOut, setClockOut] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [editReason, setEditReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [networkChecking, setNetworkChecking] = useState(false);

  const getNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const showToast = (msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkNetwork = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/check-network");
      const data = await res.json();
      return data.allowed;
    } catch {
      return false;
    }
  };

  const handleClockButton = async (direction: "in" | "out") => {
    if (direction === "out" && !clockIn) {
      showToast("아직 출근을 하지 않았습니다.", "error");
      return;
    }

    setNetworkChecking(true);
    const allowed = await checkNetwork();
    setNetworkChecking(false);

    if (!allowed) {
      showToast("회사 Wi-Fi에 연결되어 있지 않습니다.", "error");
      return;
    }

    setModal({ type: "confirm", direction, time: getNow() });
  };

  const handleConfirm = () => {
    if (!modal || modal.type !== "confirm") return;
    if (modal.direction === "in") {
      setClockIn(modal.time);
      showToast(`출근시간이 ${modal.time}로 기록되었습니다.`);
    } else {
      setClockOut(modal.time);
      showToast(`퇴근시간이 ${modal.time}로 기록되었습니다.`);
    }
    setModal(null);
  };

  const handleEditConfirm = () => {
    if (!modal || modal.type !== "edit" || !editReason.trim()) return;
    const label = modal.direction === "in" ? "출근" : "퇴근";
    showToast(`${label} 시간 수정 요청이 관리자에게 전송되었습니다.`);
    setEditReason("");
    setModal(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/meals/usage", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.used !== undefined) setMealUsed(data.used);
          if (data.totalLimit !== undefined) setMealLimit(data.totalLimit);
        })
        .catch(() => {});
    });
  }, []);

  const thisWeek = attendance.weeklyData.find((w) => w.offset === 0);
  const weeklyHours = thisWeek ? thisWeek.days.reduce((sum, d) => sum + d.hours, 0) : 0;
  const weeklyGoal = 25;
  const weeklyPercent = Math.round((weeklyHours / weeklyGoal) * 100);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 토스트 */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap ${
            toast.type === "error" ? "bg-red-500" : "bg-gray-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* 네트워크 확인 중 오버레이 */}
      {networkChecking && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-700">네트워크 확인 중...</p>
          </div>
        </div>
      )}

      {/* 모달 */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {modal.type === "confirm" && (
              <>
                <p className="text-sm font-medium text-gray-500 text-center mb-1">
                  {modal.direction === "in" ? "출근" : "퇴근"}
                </p>
                <p className="text-4xl font-extrabold text-blue-600 text-center mb-1">{modal.time}</p>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {modal.direction === "in" ? "출근" : "퇴근"}하시겠습니까?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium"
                  >
                    확인
                  </button>
                </div>
              </>
            )}
            {modal.type === "edit" && (
              <>
                <p className="text-base font-bold text-gray-900 mb-1">
                  {modal.direction === "in" ? "출근" : "퇴근"} 시간 수정 요청
                </p>
                <p className="text-xs text-gray-400 mb-4">수정 요청은 관리자 승인 후 반영됩니다.</p>
                <p className="text-xs font-medium text-gray-500 mb-1.5">수정 사유</p>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="시간과 수정 사유를 입력해주세요"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModal(null); setEditReason(""); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditConfirm}
                    disabled={!editReason.trim()}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
                  >
                    요청 전송
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-blue-600 px-5 pt-12 pb-6">
        <p className="text-blue-200 text-sm">안녕하세요 👋</p>
        <h2 className="text-white text-xl font-bold mt-0.5">{user.name}님</h2>
        <p className="text-blue-200 text-xs mt-1">
          {user.department} · {user.position}
        </p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-5">
        {/* 오늘의 근태 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-3">오늘의 근태</p>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{clockIn ?? "--:--"}</p>
              <p className="text-xs text-gray-400 mt-0.5">출근 시각</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{clockOut ?? "--:--"}</p>
              <p className="text-xs text-gray-400 mt-0.5">퇴근 시각</p>
            </div>
          </div>
        </div>

        {/* 근태 관리 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-3">근태 관리</p>

          {/* 이번 주 근무 바 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>이번 주 근무</span>
              <span>{weeklyHours}h / {weeklyGoal}h</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  weeklyPercent >= 90 ? "bg-red-500" : weeklyPercent >= 70 ? "bg-orange-400" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(weeklyPercent, 100)}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400 mt-1">{weeklyPercent}% 달성</p>
          </div>

          <div className="flex gap-2">
            {clockIn ? (
              <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-[10px] text-blue-400">출근</p>
                  <p className="text-sm font-bold text-blue-700">{clockIn}</p>
                </div>
                <button
                  onClick={() => setModal({ type: "edit", direction: "in", time: getNow() })}
                  className="text-[11px] font-medium text-blue-500 bg-blue-100 px-2.5 py-1 rounded-full hover:bg-blue-200 transition-all"
                >
                  수정
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleClockButton("in")}
                className="flex-1 py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium active:scale-95 transition-all"
              >
                출근
              </button>
            )}

            {clockOut ? (
              <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <p className="text-[10px] text-gray-400">퇴근</p>
                  <p className="text-sm font-bold text-gray-700">{clockOut}</p>
                </div>
                <button
                  onClick={() => setModal({ type: "edit", direction: "out", time: getNow() })}
                  className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-300 transition-all"
                >
                  수정
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleClockButton("out")}
                className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium active:scale-95 transition-all"
              >
                퇴근
              </button>
            )}
          </div>
        </div>

        {/* 식대 관리 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-3">식대 관리</p>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>이번 달 사용</span>
              <span>{mealUsed.toLocaleString()}원 / {mealLimit.toLocaleString()}원</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${mealPercent}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400 mt-1">{mealPercent}% 사용</p>
          </div>
          <Link href="/meals/ocr">
            <button className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium active:scale-95 transition-all">
              📷 영수증 등록 (OCR)
            </button>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
