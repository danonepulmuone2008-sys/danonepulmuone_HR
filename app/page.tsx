"use client";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Camera } from "lucide-react";
import { useMealStore } from "@/store/mealStore";
import { useAttendanceStore } from "@/store/attendanceStore";

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

  // 근태 스토어
  const {
    profile: userProfile,
    clockIn, clockOut,
    openSessionId, todaySessions,
    weeklyHours, weeklyGoal,
    loaded: attendanceLoaded,
    fetchAll: fetchAttendanceAll,
    doClockIn, doClockOut, addSession, closeSession, addWeeklyHours,
  } = useAttendanceStore();
  const weeklyPercent = Math.round((weeklyHours / weeklyGoal) * 100);

  // 식대 스토어
  const { monthlyLimit: mealLimit, totalUsed: mealUsed, remaining: mealRemaining, fetchAll: fetchMealAll, loaded: mealLoaded } = useMealStore();
  const mealPercent = mealLimit > 0 ? Math.max(0, Math.round(((mealLimit - mealRemaining) / mealLimit) * 100)) : 0;

  const [modal, setModal] = useState<ModalState>(null);
  const [editReason, setEditReason] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLunchBreak, setEditLunchBreak] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [clockBlockReason, setClockBlockReason] = useState<string | null>(null);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [sessionEdit, setSessionEdit] = useState<{ dir: "in" | "out"; time: string; reason: string; date: string; startTime: string; endTime: string } | null>(null);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

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
    if (userProfile.is_remote) return true;
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

    if (user) {
      const currentTime = getNow();
      const curMin = parseInt(currentTime.split(":")[0]) * 60 + parseInt(currentTime.split(":")[1]);

      // 휴가 확인 (출근·퇴근 공통)
      const { data: vacations } = await supabase.from("vacation_requests")
        .select("type, start_time, end_time")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .lte("start_date", todayStr)
        .gte("end_date", todayStr);

      // 시간 휴가: 해당 시간대에만 출근·퇴근 차단
      const hourlyVac = (vacations ?? []).find(
        (v) => v.type === "시간 휴가" && v.start_time != null && v.end_time != null
          && curMin >= v.start_time * 60 && curMin < v.end_time * 60
      );
      if (hourlyVac) {
        setClockBlockReason(`시간 휴가(${hourlyVac.start_time}:00~${hourlyVac.end_time}:00) 시간에는 출퇴근을 기록할 수 없습니다.`);
        return;
      }

      // 반차(오전): 13:30부터 출근 가능 / 반차(오후): 12:30 이전 퇴근 가능
      if (direction === "in" && (vacations ?? []).some((v) => v.type === "반차(오전)") && curMin < 13 * 60 + 30) {
        setClockBlockReason("반차(오전) 사용일입니다. 13:30부터 출근할 수 있습니다.");
        return;
      }
      if (direction === "out" && (vacations ?? []).some((v) => v.type === "반차(오후)") && curMin >= 12 * 60 + 30) {
        setClockBlockReason("반차(오후) 사용일입니다. 12:30 이전에 퇴근해야 합니다.");
        return;
      }

      if (direction === "in") {
        // 종일성 휴가(연차 등)는 출근 차단 (반차는 위에서 시간대로 처리)
        const fullDayVac = (vacations ?? []).some(
          (v) => v.type !== "시간 휴가" && v.type !== "반차(오전)" && v.type !== "반차(오후)"
        );
        if (fullDayVac) {
          setClockBlockReason("휴가 등록일입니다.");
          return;
        }

        const [{ data: flexEntry }, { data: businessTrips }] = await Promise.all([
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

        if (businessTrips && businessTrips.length > 0) {
          const onTrip = businessTrips.some(
            (t) => currentTime >= t.start_time && currentTime <= t.end_time
          );
          if (onTrip) {
            setClockBlockReason("출장 중인 시간입니다.");
            return;
          }
        }

        if (flexEntry) {
          const [sh, sm] = flexEntry.start_time.split(":").map(Number);
          const totalMins = Math.max(0, sh * 60 + sm - 30);
          const flexStartMinus30 = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
          if (currentTime < flexStartMinus30 || currentTime > flexEntry.end_time) {
            setClockBlockReason(`유연근무 설정 시간(${flexEntry.start_time} ~ ${flexEntry.end_time}) 외 출근입니다. (출근 가능: ${flexStartMinus30} ~ ${flexEntry.end_time})`);
            return;
          }
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
      if (userProfile.use_session_tracking) {
        if (modal.direction === "in") {
          const { data } = await supabase.from("work_sessions")
            .insert({ user_id: user.id, date: todayStr, start_time: now })
            .select("id")
            .single();
          addSession(modal.time, data?.id ?? "");
        } else {
          const diffMin = clockIn
            ? (new Date(now).getHours() * 60 + new Date(now).getMinutes()) - (parseInt(clockIn.split(":")[0]) * 60 + parseInt(clockIn.split(":")[1]))
            : 0;
          await supabase.from("work_sessions")
            .update({ end_time: now, lunch_break: diffMin >= 60 ? lunchBreak : false })
            .eq("id", openSessionId);
          closeSession(modal.time);
          // 주간 시간 업데이트
          if (clockIn) {
            const h = (parseInt(modal.time.split(":")[0]) * 60 + parseInt(modal.time.split(":")[1]) - parseInt(clockIn.split(":")[0]) * 60 - parseInt(clockIn.split(":")[1])) / 60;
            addWeeklyHours(lunchBreak && h >= 1 ? h - 1 : h);
          }
        }
      } else {
        if (modal.direction === "in") {
          await supabase.from("attendance_records").upsert(
            { user_id: user.id, date: todayStr, clock_in: now, updated_at: now },
            { onConflict: "user_id,date" }
          );
          doClockIn(modal.time);
        } else {
          const diffMin = clockIn
            ? (new Date(now).getHours() * 60 + new Date(now).getMinutes()) - (parseInt(clockIn.split(":")[0]) * 60 + parseInt(clockIn.split(":")[1]))
            : 0;
          await supabase.from("attendance_records")
            .update({ clock_out: now, lunch_break: diffMin >= 60 ? lunchBreak : false, updated_at: now })
            .eq("user_id", user.id)
            .eq("date", todayStr);
          doClockOut(modal.time);
          // 주간 시간 업데이트
          if (clockIn) {
            const h = diffMin / 60;
            addWeeklyHours((lunchBreak && diffMin >= 60) ? h - 1 : h);
          }
        }
      }
    }
    if (modal.direction === "in") {
      showToast(`근무 시작이 ${modal.time}로 기록되었습니다.`);
    } else {
      showToast(userProfile.use_session_tracking
        ? `근무 종료가 ${modal.time}로 기록되었습니다.`
        : `퇴근시간이 ${modal.time}로 기록되었습니다.${lunchBreak ? " (점심 1시간 차감)" : ""}`);
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

  // 홈 진입 시 근태 + 식대 1회 fetch
  useEffect(() => {
    if (!user?.token) return;
    if (!attendanceLoaded) fetchAttendanceAll(user.token);
    fetchMealAll(user.token);
  }, [user]);

  // 알림 권한 체크 — 로그인 후 홈 진입 시 1회
  useEffect(() => {
    if (!user) return;
    if (typeof Notification === "undefined") return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const pwa = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (Notification.permission === "default" && !(ios && !pwa)) {
      setShowNotifBanner(true);
    }
  }, [user]);

  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !user) return;
    try {
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        subscription: JSON.parse(JSON.stringify(subscription)),
      }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("Push subscription failed:", e);
    }
  };

  const handleRequestNotif = async () => {
    setShowNotifBanner(false);
    const result = await Notification.requestPermission();
    if (result === "granted") await subscribeToPush();
  };

  const isLoading = !attendanceLoaded || !mealLoaded;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-blue-100 border-t-blue-500" />
      </div>
    );
  }

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
                {modal.direction === "out" && (() => {
                  if (!clockIn) return null;
                  const [ih, im] = clockIn.split(":").map(Number);
                  const [oh, om] = modal.time.split(":").map(Number);
                  if ((oh * 60 + om) - (ih * 60 + im) < 60) return null;
                  return (
                    <label className="flex items-center justify-center gap-2 mb-5 cursor-pointer select-none">
                      <input type="checkbox" checked={lunchBreak} onChange={e => setLunchBreak(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm text-gray-600">점심식사 (근무시간 1시간 차감)</span>
                    </label>
                  );
                })()}
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                  >
                    취소
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
                    onClick={handleEditConfirm}
                    disabled={!editTime || !editReason.trim()}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
                  >
                    요청 전송
                  </button>
                  <button
                    onClick={() => { setModal(null); setEditReason(""); setEditTime(""); setEditLunchBreak(true); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                  >
                    취소
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
          {userProfile.use_session_tracking ? (
            todaySessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-1">오늘 근무 기록이 없습니다</p>
            ) : (
              <div className="flex flex-col gap-2">
                {todaySessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50">
                    <span className="text-xs text-gray-400">세션 {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {s.start}
                        <span className="text-gray-400 font-normal mx-1.5">→</span>
                        {s.end ? <span className="text-gray-700">{s.end}</span> : <span className="text-blue-500">진행 중</span>}
                      </span>
                      <button
                        onClick={() => setSessionEdit({ dir: "in", time: s.start, reason: "", date: s.date ?? todayStr, startTime: s.start, endTime: s.end ?? "" })}
                        className="text-[11px] font-medium text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
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
          )}
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
                  weeklyPercent >= 100 ? "bg-green-500" : "bg-blue-600"
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
              <span>{mealUsed.toLocaleString()}원 / {(mealUsed + mealRemaining).toLocaleString()}원</span>
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

      {/* 알림 허용 배너 */}
      {showNotifBanner && (
        <div className="fixed bottom-[68px] left-0 right-0 z-40 px-4">
          <div className="bg-gray-900 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-xl gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl flex-shrink-0">🔔</span>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold leading-tight">알림을 허용해주세요</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-tight">근태·식대 알람을 받을 수 있어요</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowNotifBanner(false)} className="text-gray-500 text-xs px-2 py-1.5">나중에</button>
              <button onClick={handleRequestNotif} className="bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">허용</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      {/* 세션 수정 요청 모달 */}
      {sessionEdit && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-base font-bold text-gray-900 mb-1">출퇴근 수정 요청</p>
            <p className="text-xs text-gray-400 mb-4">수정 요청은 관리자 승인 후 반영됩니다.</p>
            <div className="flex gap-2 mb-3">
              {(["in", "out"] as const).map(dir => (
                <button key={dir} onClick={() => setSessionEdit(e => e ? { ...e, dir, time: dir === "in" ? e.startTime : e.endTime } : e)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${sessionEdit.dir === dir ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500"}`}>
                  {dir === "in" ? "출근 시간" : "퇴근 시간"}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">수정 일자</p>
            <input type="date" value={sessionEdit.date}
              onChange={e => setSessionEdit(s => s ? { ...s, date: e.target.value } : s)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 mb-3" />
            <p className="text-xs font-medium text-gray-500 mb-1.5">수정 시간</p>
            <input type="time" value={sessionEdit.time}
              onChange={e => setSessionEdit(s => s ? { ...s, time: e.target.value } : s)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 mb-3" />
            <p className="text-xs font-medium text-gray-500 mb-1.5">수정 사유</p>
            <textarea value={sessionEdit.reason}
              onChange={e => setSessionEdit(s => s ? { ...s, reason: e.target.value } : s)}
              placeholder="수정 사유를 입력해주세요" rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none mb-4" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!user || !sessionEdit.time || !sessionEdit.reason.trim()) return;
                  await supabase.from("attendance_edit_requests").insert({
                    user_id: user.id,
                    date: sessionEdit.date,
                    direction: sessionEdit.dir,
                    requested_time: sessionEdit.time,
                    reason: sessionEdit.reason.trim(),
                    requested_at: new Date().toISOString(),
                    status: "pending",
                  });
                  setSessionEdit(null);
                  showToast("수정 요청이 전송되었습니다.");
                }}
                disabled={!sessionEdit.time || !sessionEdit.reason.trim()}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40">
                요청 전송
              </button>
              <button onClick={() => setSessionEdit(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
