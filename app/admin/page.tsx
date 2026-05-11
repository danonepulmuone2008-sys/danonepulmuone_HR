"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const INTERN_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626"];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminHomePage() {
  const router = useRouter();
  const { interns } = ADMIN_DUMMY;

  const [showLogout, setShowLogout] = useState(false);
  const [editInternId, setEditInternId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"attendance" | "meals">("attendance");
  const [editDate, setEditDate] = useState(getTodayStr());
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editMealAmount, setEditMealAmount] = useState("");

  const [attendanceOverrides, setAttendanceOverrides] = useState<
    Record<string, { checkIn: string; checkOut: string }>
  >({});
  const [mealOverrides, setMealOverrides] = useState<Record<string, number>>({});

  function getAttendanceStatus(internId: string): "출근" | "퇴근" | null {
    const today = getTodayStr();
    const key = `${internId}_${today}`;
    if (attendanceOverrides[key]) {
      return attendanceOverrides[key].checkOut ? "퇴근" : "출근";
    }
    const record = ADMIN_DUMMY.attendanceRecords.find(
      (r) => r.internId === internId && r.date === today
    );
    if (!record) return null;
    return record.checkOut ? "퇴근" : "출근";
  }

  function getMealUsed(internId: string): number {
    if (mealOverrides[internId] !== undefined) return mealOverrides[internId];
    return ADMIN_DUMMY.internMeals.find((m) => m.internId === internId)?.used ?? 0;
  }

  function openEdit(internId: string) {
    const today = getTodayStr();
    const key = `${internId}_${today}`;
    const override = attendanceOverrides[key];
    const record = ADMIN_DUMMY.attendanceRecords.find(
      (r) => r.internId === internId && r.date === today
    );
    setEditDate(today);
    setEditCheckIn(override?.checkIn ?? record?.checkIn ?? "");
    setEditCheckOut(override?.checkOut ?? record?.checkOut ?? "");
    setEditMealAmount(String(getMealUsed(internId)));
    setEditInternId(internId);
    setEditTab("attendance");
  }

  function handleDateChange(date: string) {
    setEditDate(date);
    if (!editInternId) return;
    const key = `${editInternId}_${date}`;
    const override = attendanceOverrides[key];
    const record = ADMIN_DUMMY.attendanceRecords.find(
      (r) => r.internId === editInternId && r.date === date
    );
    setEditCheckIn(override?.checkIn ?? record?.checkIn ?? "");
    setEditCheckOut(override?.checkOut ?? record?.checkOut ?? "");
  }

  function saveAttendance() {
    if (!editInternId) return;
    setAttendanceOverrides((prev) => ({
      ...prev,
      [`${editInternId}_${editDate}`]: { checkIn: editCheckIn, checkOut: editCheckOut },
    }));
    setEditInternId(null);
  }

  function saveMeals() {
    if (!editInternId) return;
    const amount = parseInt(editMealAmount);
    if (isNaN(amount)) return;
    setMealOverrides((prev) => ({ ...prev, [editInternId!]: amount }));
    setEditInternId(null);
  }

  const editIntern = interns.find((i) => i.id === editInternId);
  const editInternIndex = interns.findIndex((i) => i.id === editInternId);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="bg-white px-5 pt-5 pb-2 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">관리자</h1>
          <p className="text-xs text-gray-400 mt-0.5">인턴 현황</p>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="mt-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </header>

      <div className="flex flex-col gap-2 px-4 pt-2">
        {interns.map((intern, i) => {
          const status = getAttendanceStatus(intern.id);
          return (
            <div
              key={intern.id}
              className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: INTERN_HEX[i] }}
                  >
                    {intern.name.slice(0, 1)}
                  </div>
                  <p className="text-base font-bold text-gray-900">{intern.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
                      status === "출근"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {status ?? "미출근"}
                  </span>
                  <button
                    onClick={() => openEdit(intern.id)}
                    className="text-base text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 pl-13">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">전화</span>
                  <span className="text-sm text-gray-700">{intern.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">이메일</span>
                  <span className="text-sm text-gray-700">{intern.email}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 로그아웃 확인 */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-6 py-5 mx-6 shadow-xl w-full max-w-xs">
            <p className="text-base font-semibold text-gray-900 text-center mb-5">
              로그아웃하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
              >
                아니오
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-xl text-sm text-white font-semibold"
                style={{ backgroundColor: "#8dc63f" }}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 바텀시트 */}
      {editInternId && editIntern && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setEditInternId(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: INTERN_HEX[editInternIndex] }}
                >
                  {editIntern.name.slice(0, 1)}
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editIntern.name} 수정
                </h3>
              </div>
              <button
                onClick={() => setEditInternId(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl"
              >
                ×
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setEditTab("attendance")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === "attendance"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400"
                }`}
              >
                출퇴근 시간
              </button>
              <button
                onClick={() => setEditTab("meals")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === "meals"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400"
                }`}
              >
                식대
              </button>
            </div>

            {/* 출퇴근 시간 수정 */}
            {editTab === "attendance" && (
              <div className="px-5 pt-4">
                <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-1.5 block">날짜</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div className="flex gap-3 mb-5">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1.5 block">출근 시간</label>
                    <input
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1.5 block">퇴근 시간</label>
                    <input
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </div>
                <button
                  onClick={saveAttendance}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: "#8dc63f" }}
                >
                  저장
                </button>
              </div>
            )}

            {/* 식대 수정 */}
            {editTab === "meals" && (
              <div className="px-5 pt-4">
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-gray-400">현재 사용 금액</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">
                    {getMealUsed(editInternId).toLocaleString()}원
                  </p>
                </div>
                <div className="mb-5">
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    수정 금액 (원)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editMealAmount}
                    onChange={(e) => setEditMealAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="새로운 총 사용 금액 입력"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <button
                  onClick={saveMeals}
                  disabled={!editMealAmount}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: "#8dc63f" }}
                >
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
