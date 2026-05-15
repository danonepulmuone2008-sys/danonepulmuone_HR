"use client";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Camera } from "lucide-react";
import { getMondayOfWeek, getWorkingDaysInWeek, getMealLimit } from "@/lib/holidays";

function fmtHM(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

type ModalState =
  | { type: "confirm"; direction: "in" | "out"; time: string }
  | { type: "edit"; direction: "in" | "out"; time: string }
  | null;

type ToastType = "success" | "error";

export default function HomePage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState({ name: user?.name ?? "", department: user?.department ?? "", position: user?.position ?? "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("name, department, position").eq("id", user.id).single().then(({ data }) => {
      setUserProfile({
        name: data?.name ?? user.name,
        department: data?.department ?? user.department,
        position: data?.position ?? user.position,
      });
    });
  }, [user]);

  const [mealUsed, setMealUsed] = useState(0);
  const [mealLimit, setMealLimit] = useState(0);
  const mealPercent = mealLimit > 0 ? Math.round((mealUsed / mealLimit) * 100) : 0;

  const [clockIn, setClockIn] = useState<string | null>(null);
  const [clockOut, setClockOut] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [editReason, setEditReason] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLunchBreak, setEditLunchBreak] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [clockBlockReason, setClockBlockReason] = useState<string | null>(null);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [lunchBreak, setLunchBreak] = useState(true);

  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const weeklyGoal = getWorkingDaysInWeek(getMondayOfWeek(_now)) * 5;
  const weeklyPercent = Math.round((weeklyHours / weeklyGoal) * 100);

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

    if (direction === "in" && user) {
      const [{ data: vacations }, { data: flexEntry }, { data: businessTrips }] = await Promise.all([
        supabase.from("vacation_requests")
          .select("type")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .lte("start_date", todayStr)
          .gte("end_date", todayStr)
          .limit(1),
        supabase.from("flex_schedules")
          .select("start_time, end_time")
          .eq("user_id", user.id)
          .eq("date", todayStr)
          .maybeSingle(),
        supabase.from("business_trip_requests")
          .select("start_time, end_time, destination")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .lte("start_date", todayStr)
          .gte("end_date", todayStr),
      ]);

      if (vacations && vacations.length > 0) {
        setClockBlockReason("휴가 등록일입니다.");
        return;
      }

      if (businessTrips && businessTrips.length > 0) {
        const currentTime = getNow();
        const onTrip = businessTrips.some(
          (t) => currentTime >= t.start_time && currentTime <= t.end_time
        );
        if (onTrip) {
          setClockBlockReason("출장 중인 시간입니다.");
          return;
        }
      }

      if (flexEntry) {
        const currentTime = getNow();
        if (currentTime < flexEntry.start_time || currentTime > flexEntry.end_time) {
          setClockBlockReason(`유연근무 설정 시간(${flexEntry.start_time} ~ ${flexEntry.end_time}) 외 출근입니다.`);
          return;
        }
      }
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

  const handleConfirm = async () => {
    if (!modal || modal.type !== "confirm") return;
    if (user) {
      const now = new Date().toISOString();
      if (modal.direction === "in") {
        await supabase.from("attendance_records").upsert(
          { user_id: user.id, date: todayStr, clock_in: now, updated_at: now },
          { onConflict: "user_id,date" }
        );
      } else {
        await supabase.from("attendance_records")
          .update({ clock_out: now, lunch_break: lunchBreak, updated_at: now })
          .eq("user_id", user.id)
          .eq("date", todayStr);
      }
    }
    if (modal.direction === "in") {
      setClockIn(modal.time);
      showToast(`출근시간이 ${modal.time}로 기록되었습니다.`);
    } else {
      setClockOut(modal.time);
      showToast(`퇴근시간이 ${modal.time}로 기록되었습니다.${lunchBreak ? " (점심 1시간 차감)" : ""}`);
      setLunchBreak(true);
    }
    setModal(null);
  };

  const handleEditConfirm = async () => {
    if (!modal || modal.type !== "edit" || !editReason.trim() || !editTime) return;
    if (user) {
      await supabase.from("attendance_edit_requests").insert({
        user_id: user.id,
        date: todayStr,
        direction: modal.direction,
        requested_time: editTime,
        reason: editReason.trim(),
        requested_at: new Date().toISOString(),
        status: "pending",
        lunch_break: modal.direction === "out" ? editLunchBreak : null,
      });
    }
    const label = modal.direction === "in" ? "출근" : "퇴근";
    showToast(`${label} 시간 수정 요청이 관리자에게 전송되었습니다.`);
    setEditReason("");
    setEditTime("");
    setEditLunchBreak(true);
    setModal(null);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const uid = user.id;

      const { data: today } = await supabase
        .from("attendance_records")
        .select("clock_in, clock_out")
        .eq("user_id", uid)
        .eq("date", todayStr)
        .maybeSingle();

      if (today?.clock_in) {
        const t = new Date(today.clock_in);
        setClockIn(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
      }
      if (today?.clock_out) {
        const t = new Date(today.clock_out);
        setClockOut(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
      }

      const monday = new Date();
      const day = monday.getDay();
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const [{ data: weekRecords }, { data: weekTrips }] = await Promise.all([
        supabase.from("attendance_records").select("clock_in, clock_out, lunch_break").eq("user_id", uid).gte("date", fmt(monday)).lte("date", fmt(friday)),
        supabase.from("business_trip_requests").select("start_date, end_date, start_time, end_time").eq("user_id", uid).eq("status", "approved").lte("start_date", fmt(friday)).gte("end_date", fmt(monday)),
      ]);

      const attendanceTotal = (weekRecords ?? []).reduce((sum, r) => {
        if (!r.clock_in || !r.clock_out) return sum;
        const h = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3600000;
        return sum + h - (r.lunch_break ? 1 : 0);
      }, 0);

      const tripTotal = (weekTrips ?? []).reduce((sum, t) => {
        if (!t.start_time || !t.end_time) return sum;
        const isSingleDay = t.start_date === t.end_date;
        const rangeStart = new Date(Math.max(new Date(t.start_date + "T00:00:00").getTime(), monday.getTime()));
        const rangeEnd = new Date(Math.min(new Date(t.end_date + "T00:00:00").getTime(), friday.getTime()));
        let dayHours = 0;
        for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === 0 || d.getDay() === 6) continue;
          const dateStr = fmt(d);
          const startStr = isSingleDay || dateStr === t.start_date ? t.start_time : "09:00";
          const endStr = isSingleDay || dateStr === t.end_date ? t.end_time : "18:00";
          const [sh, sm] = startStr.split(":").map(Number);
          const [eh, em] = endStr.split(":").map(Number);
          dayHours += (eh * 60 + em - sh * 60 - sm) / 60;
        }
        return sum + dayHours;
      }, 0);

      setWeeklyHours(Math.round((attendanceTotal + tripTotal) * 10) / 10);
    })();
  }, [user, todayStr]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startOfMonth = year + '-' + String(month).padStart(2, '0') + '-01';
      const startOfNext = month === 12
        ? (year + 1) + '-01-01'
        : year + '-' + String(month + 1).padStart(2, '0') + '-01';

      const { data: approvedReceipts } = await supabase
        .from('receipts')
        .select('id')
        .eq('status', 'approved')
        .gte('paid_at', startOfMonth)
        .lt('paid_at', startOfNext);

      const receiptIds = (approvedReceipts ?? []).map((r) => r.id);

      const { data: myItems } = receiptIds.length > 0
        ? await supabase.from('receipt_items').select('price').in('receipt_id', receiptIds)
        : { data: [] };

      setMealUsed((myItems ?? []).reduce((sum, r) => sum + (r.price ?? 0), 0));

      const { data: limitRow } = await supabase
        .from('monthly_meal_limits')
        .select('monthly_meal_limit')
        .eq('target_month', startOfMonth)
        .maybeSingle();

      setMealLimit(limitRow?.monthly_meal_limit ?? getMealLimit(year, month));
    })();
  }, [user]);

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

      {/* 출근 불가 팝업 */}
      {clockBlockReason && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-base font-bold text-gray-900 text-center mb-1">출근이 불가합니다.</p>
            <p className="text-sm text-gray-500 text-center mb-5">사유: {clockBlockReason}</p>
            <button
              onClick={() => setClockBlockReason(null)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium"
            >
              확인
            </button>
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
                <p className="text-sm text-gray-500 text-center mb-4">
                  {modal.direction === "in" ? "출근" : "퇴근"}하시겠습니까?
                </p>
                {modal.direction === "out" && (
                  <label className="flex items-center justify-center gap-2 mb-5 cursor-pointer select-none">
                    <input type="checkbox" checked={lunchBreak} onChange={e => setLunchBreak(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm text-gray-600">점심식사 (근무시간 1시간 차감)</span>
                  </label>
                )}
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
                <p className="text-xs font-medium text-gray-500 mb-1.5">수정 시간</p>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 mb-3"
                />
                {modal.direction === "out" && (
                  <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editLunchBreak}
                      onChange={(e) => setEditLunchBreak(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">점심 식사 (-1시간)</span>
                  </label>
                )}
                <p className="text-xs font-medium text-gray-500 mb-1.5">수정 사유</p>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="수정 사유를 입력해주세요"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModal(null); setEditReason(""); setEditTime(""); setEditLunchBreak(true); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditConfirm}
                    disabled={!editTime || !editReason.trim()}
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
      <header className="bg-blue-600 px-5 pt-8 pb-3">
        <p className="text-blue-200 text-sm">안녕하세요 👋</p>
        <h2 className="text-white text-xl font-bold mt-0.5">{userProfile.name || "로딩 중"}님</h2>
        <p className="text-blue-200 text-xs mt-1">
          {userProfile.department} · {userProfile.position}
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
              <span>{fmtHM(weeklyHours)} / {weeklyGoal}h</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  weeklyPercent >= 100 ? "bg-blue-500" : "bg-[#8dc63f]"
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
                  onClick={() => { setModal({ type: "edit", direction: "in", time: clockIn ?? getNow() }); setEditTime(clockIn ?? ""); }}
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
                  onClick={() => { setModal({ type: "edit", direction: "out", time: clockOut ?? getNow() }); setEditTime(clockOut ?? ""); }}
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
            <button className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium active:scale-95 transition-all flex items-center justify-center gap-2">
              <Camera size={16} />
              영수증 등록 (OCR)
            </button>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
