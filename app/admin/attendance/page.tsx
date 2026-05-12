"use client";

import { useState, useEffect } from "react";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { getWorkingDaysInWeek, isHoliday } from "@/lib/holidays";

type ApprovalRequest =
  | { id: string; type: "business_trip"; status: string; user_id: string; user_name: string; start_date: string; end_date: string; start_time: string; end_time: string; destination: string; reason: string | null; requested_at: string }
  | { id: string; type: "vacation"; status: string; user_id: string; user_name: string; start_date: string; end_date: string; label: string; reason: string | null; requested_at: string }
  | { id: string; type: "attendance_edit"; status: string; user_id: string; user_name: string; date: string; direction: "in" | "out"; requested_time: string; reason: string | null; requested_at: string }

type RealFlexSchedule = {
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
};

type RealIntern = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type RecordsUser = { id: string; name: string }
type RecordsData = {
  users: RecordsUser[]
  weekDates: string[]
  records: Record<string, { hours: number | null; checkedIn: boolean }>
}

const CALENDAR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_START = "09:00";
const DEFAULT_END = "15:00";

const INTERN_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626"];
const INTERN_BG_RGBA = [
  "rgba(0,204,255,0.12)",
  "rgba(124,58,237,0.12)",
  "rgba(255,212,0,0.12)",
  "rgba(236,72,153,0.12)",
  "rgba(220,38,38,0.12)",
];

const _now = new Date();
const CURRENT_YEAR = _now.getFullYear();
const CURRENT_MONTH = _now.getMonth() + 1;
const CURRENT_MONTH_STR = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, "0")}`;
const TODAY = _now.getDate();

function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

const WEEKS = buildWeeks(CURRENT_YEAR, CURRENT_MONTH);

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentMonday(): Date {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const BASE_MONDAY = getCurrentMonday();

function getWeekDates(offset: number): string[] {
  const monday = new Date(BASE_MONDAY);
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toDateStr(d);
  });
}

function getWeekLabel(offset: number): string {
  if (offset === 0) return "이번 주";
  const monday = new Date(BASE_MONDAY);
  monday.setDate(monday.getDate() + offset * 7);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)}~${fmt(friday)}`;
}

const DAY_LABELS = ["월", "화", "수", "목", "금"];
const HALF_DAY_SPLIT = "13:00";

function getHalfDayWorkTime(label: string): string {
  if (label.includes("오전")) return `${HALF_DAY_SPLIT} ~ ${DEFAULT_END}`;
  if (label.includes("오후")) return `${DEFAULT_START} ~ ${HALF_DAY_SPLIT}`;
  return "";
}

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"schedule" | "records" | "approval">("schedule");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // 근무 일정 탭 상태
  const [flexSchedules, setFlexSchedules] = useState<RealFlexSchedule[]>([]);
  const [realInterns, setRealInterns] = useState<RealIntern[]>([]);

  // 근무 기록 탭 상태
  const [recordsData, setRecordsData] = useState<RecordsData | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // 요청 승인 탭 상태
  const [approvalFilter, setApprovalFilter] = useState<"all" | "business_trip" | "vacation" | "attendance_edit">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const { interns: dummyInterns, internEvents } = ADMIN_DUMMY;
  const scheduleInterns = realInterns.length > 0 ? realInterns : dummyInterns;

  useEffect(() => {
    fetch(`/api/admin/schedules?month=${CURRENT_MONTH_STR}`)
      .then((res) => res.json())
      .then((json) => { if (json.flexSchedules) setFlexSchedules(json.flexSchedules); })
      .catch((err) => console.error("[schedules fetch]", err));
    fetch("/api/admin/interns")
      .then((res) => res.json())
      .then((json) => { if (json.interns) setRealInterns(json.interns); })
      .catch((err) => console.error("[interns fetch]", err));
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    fetch("/api/admin/attendance/requests", {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown[]) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [user?.token]);

  useEffect(() => {
    if (activeTab !== "records") return;
    fetchRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, weekOffset]);

  useEffect(() => {
    if (activeTab !== "approval") return;
    fetchRequests(showHistory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, showHistory]);

  async function fetchRecords() {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const token = user?.token;
      if (!token) { setRecordsError("세션 없음"); return; }
      const monday = getWeekDates(weekOffset)[0];
      const res = await fetch(`/api/admin/attendance/records?monday=${monday}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setRecordsData(json);
      else setRecordsError(json?.error ?? "오류 발생");
    } catch (e) {
      setRecordsError(String(e));
    } finally {
      setRecordsLoading(false);
    }
  }

  async function fetchRequests(history = false) {
    setApprovalLoading(true);
    setApprovalError(null);
    try {
      const token = user?.token;
      if (!token) { setApprovalError("세션 없음 - 로그인 필요"); return; }
      const url = history ? "/api/admin/attendance/requests?history=true" : "/api/admin/attendance/requests";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setRequests(json);
      else setApprovalError(`API 오류 ${res.status}: ${json?.error ?? "알 수 없음"}`);
    } catch (e) {
      setApprovalError(`네트워크 오류: ${String(e)}`);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleApproval(req: ApprovalRequest, action: "approved" | "rejected") {
    setProcessingId(req.id);
    try {
      const token = user?.token;
      if (!token) return;
      const res = await fetch("/api/admin/attendance/requests/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: req.type, id: req.id, action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } finally {
      setProcessingId(null);
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (approvalFilter === "all") return true;
    return r.type === approvalFilter;
  });

  // 날짜별 특별 일정이 있는 인턴 집합 (기본 외 = flex or 휴가/출장)
  const specialMap: Record<number, Set<string>> = {};
  internEvents.forEach((e) => {
    const day = parseInt(e.date.split("-")[2]);
    if (!specialMap[day]) specialMap[day] = new Set();
    specialMap[day].add(e.internId);
  });
  flexSchedules.forEach((f) => {
    const intern = scheduleInterns.find((i: RealIntern) => i.name === f.user_name);
    if (!intern) return;
    const day = parseInt(f.date.split("-")[2]);
    if (!specialMap[day]) specialMap[day] = new Set();
    specialMap[day].add(intern.id);
  });

  // 특정 인턴+날짜의 일정 조회
  const getSchedule = (internId: string, day: number) => {
    const dateKey = `${CURRENT_MONTH_STR}-${String(day).padStart(2, "0")}`;
    const event = internEvents.find((e) => e.internId === internId && e.date === dateKey);
    if (event) return { type: "event" as const, event };
    const intern = scheduleInterns.find((i: RealIntern) => i.id === internId);
    const flex = intern
      ? flexSchedules.find((f) => f.user_name === intern.name && f.date === dateKey)
      : undefined;
    if (flex) return { type: "flex" as const, flex: { startTime: flex.start_time, endTime: flex.end_time } };
    return { type: "default" as const };
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">근태 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{CURRENT_YEAR}년 {CURRENT_MONTH}월</p>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-100 flex">
        {(["schedule", "records", "approval"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === tab ? "border-[#8dc63f] text-[#8dc63f]" : "border-transparent text-gray-400"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {tab === "schedule" ? "근무 일정" : tab === "records" ? "근무 기록" : "요청 승인"}
              {tab === "approval" && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 leading-none">
                  {pendingCount}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "schedule" ? (
        <div className="flex flex-col gap-3 px-4 pt-3">
          {/* 당일 근무 일정 */}
          <div className="bg-white rounded-2xl px-4 pt-3 pb-2 shadow-sm border border-gray-100">
            <p className="text-base font-bold mb-2" style={{ color: "#8dc63f" }}>오늘의 근무일정</p>
            <div className="flex flex-col gap-1.5">
              {scheduleInterns.map((intern: RealIntern, i: number) => {
                const sched = getSchedule(intern.id, TODAY);
                return (
                  <div key={intern.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ backgroundColor: INTERN_BG_RGBA[i] }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: INTERN_HEX[i] }}>
                        {intern.name.slice(0, 1)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{intern.name}</span>
                    </div>
                    <div className="text-right">
                      {sched.type === "event" ? (
                        <div>
                          {sched.event.label.includes("반차") ? (
                            <>
                              <p className="text-sm font-semibold text-gray-900">{getHalfDayWorkTime(sched.event.label)}</p>
                              <p className="text-xs text-green-600 mt-0.5">반차</p>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sched.event.type === "vacation" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                {sched.event.label}
                              </span>
                              {sched.event.destination && (
                                <p className="text-xs text-gray-400 mt-0.5">→ {sched.event.destination}</p>
                              )}
                            </>
                          )}
                        </div>
                      ) : sched.type === "flex" ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{sched.flex.startTime} ~ {sched.flex.endTime}</p>
                          <p className="text-xs text-purple-500 mt-0.5">유연근무</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{DEFAULT_START} ~ {DEFAULT_END}</p>
                          <p className="text-xs text-gray-400 mt-0.5">기본</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 캘린더 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-3">
              기본: {DEFAULT_START} ~ {DEFAULT_END}
            </p>
            <div className="grid grid-cols-7 text-center mb-1">
              {CALENDAR_DAYS.map((d) => (
                <span key={d} className="text-xs text-gray-400 font-medium py-1">{d}</span>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {WEEKS.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((day, di) => {
                    const specials = day ? (specialMap[day] ?? new Set<string>()) : new Set<string>();
                    const tooltipAlign =
                      di <= 1 ? "left-0" : di >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
                    return (
                      <div
                        key={di}
                        className="relative flex flex-col items-center py-0.5 group"
                        onClick={() => { if (day) setSelectedDay(day); }}
                      >
                        <div className={`text-sm rounded-full w-7 h-7 flex items-center justify-center ${
                          day === TODAY
                            ? "bg-blue-600 text-white font-bold"
                            : day
                            ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                            : ""
                        }`}>
                          {day ?? ""}
                        </div>
                        {specials.size > 0 && (
                          <div className="flex gap-px mt-0.5 flex-wrap justify-center max-w-full px-0.5">
                            {scheduleInterns.map((intern: RealIntern, i: number) =>
                              specials.has(intern.id) ? (
                                <span key={intern.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: INTERN_HEX[i] }} />
                              ) : null
                            )}
                          </div>
                        )}
                        {specials.size > 0 && (
                          <div className={`absolute bottom-full ${tooltipAlign} mb-2 z-50 hidden group-hover:block bg-gray-900 text-white rounded-xl shadow-xl w-52 p-3 pointer-events-none`}>
                            <p className="text-[10px] text-gray-400 font-medium mb-2">{CURRENT_MONTH}월 {day}일</p>
                            <div className="flex flex-col gap-1.5">
                              {scheduleInterns.map((intern: RealIntern, i: number) => {
                                if (!specials.has(intern.id)) return null;
                                const sched = getSchedule(intern.id, day!);
                                return (
                                  <div key={intern.id} className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: INTERN_HEX[i] }} />
                                    <span className="text-xs font-semibold">{intern.name}</span>
                                    <span className="text-xs text-gray-300">
                                      {sched.type === "event"
                                        ? sched.event.label
                                        : sched.type === "flex"
                                        ? `${sched.flex.startTime}~${sched.flex.endTime}`
                                        : ""}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "records" ? (
        /* 근무 기록 탭 */
        (() => {
          const currentWeekDates = getWeekDates(weekOffset);
          const weekMonday = new Date(currentWeekDates[0]);
          const requiredHours = getWorkingDaysInWeek(weekMonday) * 5;
          const dayIsHoliday = currentWeekDates.map((d) => isHoliday(d));
          const todayStr = toDateStr(new Date());

          return (
            <div className="flex flex-col gap-3 px-4 pt-3">
              {/* 주 네비게이션 */}
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full text-xl leading-none"
                >‹</button>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-gray-700">{getWeekLabel(weekOffset)}</span>
                  <span className="text-xs text-gray-400 mt-0.5">기준 {requiredHours}시간</span>
                </div>
                <button
                  onClick={() => setWeekOffset((o) => Math.min(o + 1, 8))}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full text-xl leading-none"
                >›</button>
              </div>

              {recordsLoading ? (
                <div className="bg-white rounded-2xl px-4 py-10 shadow-sm border border-gray-100 flex items-center justify-center">
                  <p className="text-sm text-gray-400">불러오는 중...</p>
                </div>
              ) : recordsError ? (
                <div className="bg-white rounded-2xl px-4 py-6 shadow-sm border border-red-100 flex flex-col items-center gap-3">
                  <p className="text-xs text-red-500 text-center">{recordsError}</p>
                  <button onClick={fetchRecords} className="text-xs text-blue-500 underline">다시 시도</button>
                </div>
              ) : recordsData && recordsData.users.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* 헤더 */}
                  <div className="grid grid-cols-[68px_1fr_1fr_1fr_1fr_1fr_40px] px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs text-gray-500 font-semibold">이름</span>
                    {DAY_LABELS.map((d, i) => (
                      <div key={d} className="flex flex-col items-center gap-px">
                        <span className={`text-xs font-semibold ${dayIsHoliday[i] ? "text-red-500" : "text-gray-600"}`}>{d}</span>
                        <span className={`text-[10px] font-medium ${dayIsHoliday[i] ? "text-red-400" : "text-gray-400"}`}>
                          {currentWeekDates[i].slice(5).replace("-", "/")}
                        </span>
                      </div>
                    ))}
                    <span className="text-xs text-gray-500 font-semibold text-right">계</span>
                  </div>
                  {/* 직원 행 */}
                  {recordsData.users.map((u) => {
                    const dayCells = recordsData.weekDates.map((date) => recordsData.records[`${u.id}__${date}`] ?? null);
                    const totalHours = dayCells.reduce((sum, rec) => sum + (rec?.hours ?? 0), 0);
                    const totalRounded = Math.round(totalHours * 10) / 10;
                    const metGoal = totalRounded >= requiredHours;
                    return (
                      <div
                        key={u.id}
                        className="grid grid-cols-[68px_1fr_1fr_1fr_1fr_1fr_40px] px-3 py-3 border-b border-gray-100 last:border-b-0 items-center"
                      >
                        <span className="text-xs font-bold text-gray-800 truncate">{u.name}</span>
                        {dayCells.map((rec, di) => {
                          if (dayIsHoliday[di]) {
                            return <span key={di} className="text-xs text-center text-gray-300">−</span>;
                          }
                          if (rec?.checkedIn && currentWeekDates[di] === todayStr) {
                            return (
                              <span key={di} className="text-[10px] text-center font-semibold text-orange-400">출근</span>
                            );
                          }
                          if (rec?.hours !== null && rec?.hours !== undefined) {
                            return <span key={di} className="text-xs text-center font-semibold text-gray-700">{rec.hours}</span>;
                          }
                          return <span key={di} className="text-xs text-center text-gray-400">−</span>;
                        })}
                        <span className={`text-xs font-bold text-right ${totalRounded === 0 ? "text-gray-400" : metGoal ? "text-[#8dc63f]" : "text-gray-700"}`}>
                          {totalRounded > 0 ? `${totalRounded}h` : "−"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : recordsData && recordsData.users.length === 0 ? (
                <div className="bg-white rounded-2xl px-4 py-10 shadow-sm border border-gray-100 flex items-center justify-center">
                  <p className="text-sm text-gray-400">등록된 직원이 없습니다</p>
                </div>
              ) : null}

              <p className="text-xs text-gray-400 text-center px-4">단위: 시간 · −는 미출근 또는 공휴일</p>
            </div>
          );
        })()
      ) : activeTab === "approval" ? (
        /* 요청 승인 탭 */
        <div className="flex flex-col gap-3 px-4 pt-3">
          {/* 대기중 / 처리완료 토글 */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => { setShowHistory(false); setApprovalFilter("all"); }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-colors ${!showHistory ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}
            >
              대기 중
            </button>
            <button
              onClick={() => { setShowHistory(true); setApprovalFilter("all"); }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-colors ${showHistory ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}
            >
              처리 완료
            </button>
          </div>

          {/* 필터 칩 */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { key: "all", label: "전체" },
              { key: "business_trip", label: "출장" },
              { key: "vacation", label: "휴가" },
              { key: "attendance_edit", label: "출근 / 퇴근" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setApprovalFilter(key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  approvalFilter === key
                    ? "bg-[#8dc63f] text-white"
                    : "bg-white border border-gray-200 text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {approvalLoading ? (
            <div className="bg-white rounded-2xl px-4 py-10 shadow-sm border border-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-400">불러오는 중...</p>
            </div>
          ) : approvalError ? (
            <div className="bg-white rounded-2xl px-4 py-6 shadow-sm border border-red-100 flex flex-col items-center gap-3">
              <p className="text-xs text-red-500 text-center break-all">{approvalError}</p>
              <button onClick={() => fetchRequests(showHistory)} className="text-xs text-blue-500 underline">다시 시도</button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 shadow-sm border border-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-400">{showHistory ? "처리된 요청이 없습니다" : "대기 중인 요청이 없습니다"}</p>
            </div>
          ) : null}

          {!approvalLoading && filteredRequests.map((req) => {
            const typeLabel = req.type === "business_trip" ? "출장" : req.type === "vacation" ? "휴가" : "출근 / 퇴근";
            const typeBg = req.type === "business_trip" ? "bg-blue-100 text-blue-700" : req.type === "vacation" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";
            const isProcessing = processingId === req.id;
            const dateStr = req.requested_at ? req.requested_at.slice(0, 10) : "";
            const statusLabel = req.status === "approved" ? "승인완료" : req.status === "rejected" ? "반려" : "";
            const statusBg = req.status === "approved" ? "bg-[#8dc63f] text-white" : "bg-red-100 text-red-600";

            return (
              <div key={req.id} className={`bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 transition-opacity ${isProcessing ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{req.user_name}</p>
                    <p className="text-xs text-gray-400">{dateStr} 신청</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {showHistory && statusLabel && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBg}`}>{statusLabel}</span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeBg}`}>{typeLabel}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 flex flex-col gap-1">
                  {req.type === "business_trip" && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">기간</span>
                        <span className="text-gray-700 font-medium">
                          {req.start_date === req.end_date ? req.start_date : `${req.start_date} ~ ${req.end_date}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">시간</span>
                        <span className="text-gray-700 font-medium">{req.start_time} ~ {req.end_time}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">목적지</span>
                        <span className="text-gray-700 font-medium">{req.destination}</span>
                      </div>
                    </>
                  )}
                  {req.type === "vacation" && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">날짜</span>
                        <span className="text-gray-700 font-medium">
                          {req.start_date === req.end_date ? req.start_date : `${req.start_date} ~ ${req.end_date}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">종류</span>
                        <span className="text-gray-700 font-medium">{req.label}</span>
                      </div>
                    </>
                  )}
                  {req.type === "attendance_edit" && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">날짜</span>
                        <span className="text-gray-700 font-medium">{req.date}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">구분</span>
                        <span className="text-gray-700 font-medium">{req.direction === "in" ? "출근" : "퇴근"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">요청 시간</span>
                        <span className="text-gray-700 font-medium">{req.requested_time}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs pt-0.5 border-t border-gray-200 mt-0.5">
                    <span className="text-gray-400">사유</span>
                    <span className="text-gray-700 font-medium">{req.reason ?? "—"}</span>
                  </div>
                </div>

                {!showHistory && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(req, "rejected")}
                      disabled={isProcessing}
                      className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleApproval(req, "approved")}
                      disabled={isProcessing}
                      className="flex-1 h-10 rounded-xl text-sm text-white font-semibold transition-colors disabled:opacity-40"
                      style={{ backgroundColor: "#8dc63f" }}
                    >
                      승인
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 날짜 상세 바텀시트 (근무 일정 탭) */}
      {selectedDay !== null && activeTab === "schedule" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">{CURRENT_MONTH}월 {selectedDay}일 근무 일정</h3>
                <p className="text-xs text-gray-400 mt-0.5">인턴별 근무 계획</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl">×</button>
            </div>
            <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
              {scheduleInterns.map((intern: RealIntern, i: number) => {
                const sched = getSchedule(intern.id, selectedDay);
                return (
                  <div key={intern.id} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ backgroundColor: INTERN_BG_RGBA[i] }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: INTERN_HEX[i] }}>
                        {intern.name.slice(0, 1)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{intern.name}</span>
                    </div>
                    <div className="text-right">
                      {sched.type === "event" ? (
                        <div>
                          {sched.event.label.includes("반차") ? (
                            <>
                              <p className="text-sm font-semibold text-gray-900">{getHalfDayWorkTime(sched.event.label)}</p>
                              <p className="text-xs text-green-600 mt-0.5">반차</p>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                sched.event.type === "vacation" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {sched.event.label}
                              </span>
                              {sched.event.destination && (
                                <p className="text-xs text-gray-400 mt-1">→ {sched.event.destination}</p>
                              )}
                            </>
                          )}
                        </div>
                      ) : sched.type === "flex" ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{sched.flex.startTime} ~ {sched.flex.endTime}</p>
                          <p className="text-xs text-purple-500 mt-0.5">유연근무</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{DEFAULT_START} ~ {DEFAULT_END}</p>
                          <p className="text-xs text-gray-400 mt-0.5">기본</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
