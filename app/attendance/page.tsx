"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

const CALENDAR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const GOAL_HOURS = 25;
const MAX_DAY_HOURS = 10;
const DAY_LABELS = ["월", "화", "수", "목", "금"];

type CalEvent = {
  type: "vacation" | "business_trip";
  label: string;
  status?: string;
};

type RequestItem = {
  id: string;
  type: "vacation" | "business_trip";
  label: string;
  date: string;
  status: string;
};

type DayData = { day: string; hours: number };
type MyFlexSchedule = { date: string; startTime: string; endTime: string };

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekLabel(offset: number): string {
  if (offset === 0) return "이번 주";
  const monday = getMondayOfWeek(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)}~${fmt(friday)}`;
}

function getWeeksForMonth(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function statusKo(status: string): string {
  if (status === "approved") return "승인완료";
  if (status === "rejected") return "반려";
  return "승인대기";
}

export default function AttendancePage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDate = now.getDate();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const [showFlex, setShowFlex] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<"detail" | "flex-add">("detail");
  const [myFlexSchedules, setMyFlexSchedules] = useState<MyFlexSchedule[]>([]);
  const [flexInput, setFlexInput] = useState({ startTime: "", endTime: "" });

  const [weekDays, setWeekDays] = useState<DayData[]>(DAY_LABELS.map(day => ({ day, hours: 0 })));
  const [eventMap, setEventMap] = useState<Record<number, CalEvent[]>>({});
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const weeks = getWeeksForMonth(currentYear, currentMonth);
  const monthLabel = `${currentYear}년 ${currentMonth + 1}월`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });
  }, []);

  const fetchWeekData = useCallback(async (uid: string, offset: number) => {
    const monday = getMondayOfWeek(new Date());
    monday.setDate(monday.getDate() + offset * 7);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const days = await Promise.all(
      DAY_LABELS.map(async (day, i) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        const { data } = await supabase
          .from("attendance_records")
          .select("clock_in, clock_out")
          .eq("user_id", uid)
          .eq("date", fmt(date))
          .maybeSingle();

        let hours = 0;
        if (data?.clock_in && data?.clock_out) {
          const diff = new Date(data.clock_out).getTime() - new Date(data.clock_in).getTime();
          hours = Math.round(diff / 36000) / 100;
        }
        return { day, hours };
      })
    );
    setWeekDays(days);
  }, []);

  const fetchMonthData = useCallback(async (uid: string) => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const mm = String(currentMonth + 1).padStart(2, "0");
    const startDate = `${currentYear}-${mm}-01`;
    const endDate = `${currentYear}-${mm}-${String(daysInMonth).padStart(2, "0")}`;

    const [{ data: vacations }, { data: trips }] = await Promise.all([
      supabase
        .from("vacation_requests")
        .select("id, type, start_date, end_date, status")
        .eq("user_id", uid)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("business_trip_requests")
        .select("id, destination, start_date, end_date, status")
        .eq("user_id", uid)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);

    const map: Record<number, CalEvent[]> = {};

    vacations?.forEach(v => {
      for (let d = new Date(v.start_date + "T00:00:00"); d <= new Date(v.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ type: "vacation", label: v.type, status: v.status });
        }
      }
    });

    trips?.forEach(t => {
      for (let d = new Date(t.start_date + "T00:00:00"); d <= new Date(t.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ type: "business_trip", label: t.destination, status: t.status });
        }
      }
    });

    setEventMap(map);

    const reqList: RequestItem[] = [
      ...(vacations ?? []).map(v => ({
        id: v.id,
        type: "vacation" as const,
        label: v.type,
        date: v.start_date,
        status: statusKo(v.status),
      })),
      ...(trips ?? []).map(t => ({
        id: t.id,
        type: "business_trip" as const,
        label: t.destination,
        date: t.start_date,
        status: statusKo(t.status),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    setRequests(reqList);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (!userId) return;
    fetchWeekData(userId, weekOffset);
  }, [userId, weekOffset, fetchWeekData]);

  useEffect(() => {
    if (!userId) return;
    fetchMonthData(userId);
  }, [userId, fetchMonthData]);

  const totalHours = weekDays.reduce((sum, d) => sum + d.hours, 0);
  const progressPct = Math.min((totalHours / GOAL_HOURS) * 100, 100);
  const isGoalMet = totalHours >= GOAL_HOURS;

  const flexMap: Record<number, { member: string; startTime: string; endTime: string; isSelf?: boolean }[]> = {};
  myFlexSchedules.forEach(f => {
    const day = parseInt(f.date.split("-")[2]);
    if (!flexMap[day]) flexMap[day] = [];
    flexMap[day].unshift({ member: "나", startTime: f.startTime, endTime: f.endTime, isSelf: true });
  });

  const handleFlexSubmit = () => {
    if (!selectedDay || !flexInput.startTime || !flexInput.endTime) return;
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dateStr = `${currentYear}-${mm}-${String(selectedDay).padStart(2, "0")}`;
    setMyFlexSchedules(prev => [
      ...prev.filter(s => s.date !== dateStr),
      { date: dateStr, startTime: flexInput.startTime, endTime: flexInput.endTime },
    ]);
    setSelectedDay(null);
    setFlexInput({ startTime: "", endTime: "" });
  };

  const hasFlexDisplay = showFlex || myFlexSchedules.length > 0;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">근태 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* 주간 근로시간 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400">주간 근로시간</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none"
              >
                ‹
              </button>
              <span className="text-xs text-gray-600 font-medium min-w-[84px] text-center">
                {getWeekLabel(weekOffset)}
              </span>
              <button
                onClick={() => setWeekOffset(o => Math.min(o + 1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${isGoalMet ? "text-green-600" : "text-blue-600"}`}>
                  {totalHours.toFixed(1)}h
                </span>
                <span className="text-xs text-gray-400">/ {GOAL_HOURS}시간</span>
              </div>
              {isGoalMet ? (
                <span className="text-xs text-green-600 font-medium">목표 달성</span>
              ) : (
                <span className="text-xs text-gray-400">{(GOAL_HOURS - totalHours).toFixed(1)}h 남음</span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isGoalMet ? "bg-green-500" : "bg-blue-600"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-end gap-2">
            {weekDays.map(d => (
              <div key={d.day} className="flex flex-col items-center flex-1 gap-1.5">
                <span className="text-xs text-gray-500 font-medium h-4 flex items-center">
                  {d.hours > 0 ? `${d.hours}h` : ""}
                </span>
                <div className="w-full h-16 bg-gray-100 rounded-lg flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${d.hours > 0 ? "bg-blue-500" : ""}`}
                    style={{ height: d.hours > 0 ? `${(d.hours / MAX_DAY_HOURS) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 캘린더 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-visible">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400">{monthLabel}</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFlex}
                  onChange={e => setShowFlex(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                <span className="text-xs text-gray-500">유연근무</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTeam}
                  onChange={e => setShowTeam(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs text-gray-500">팀 일정</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center mb-1">
            {CALENDAR_DAYS.map(d => (
              <span key={d} className="text-xs text-gray-400 font-medium py-1">{d}</span>
            ))}
          </div>

          <div className="flex flex-col gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const events = day ? (eventMap[day] ?? []) : [];
                  const flexEntries = day ? (flexMap[day] ?? []) : [];
                  const hasTooltip = events.length > 0 || flexEntries.length > 0;
                  const tooltipAlign = di <= 1 ? "left-0" : di >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";

                  return (
                    <div
                      key={di}
                      className="relative flex flex-col items-center py-0.5 group"
                      onClick={() => { if (day) { setSelectedDay(day); setModalMode("detail"); } }}
                    >
                      <div
                        className={`text-sm rounded-full w-7 h-7 flex items-center justify-center ${
                          day === todayDate
                            ? "bg-blue-600 text-white font-bold"
                            : day
                            ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                            : ""
                        }`}
                      >
                        {day ?? ""}
                      </div>

                      {flexEntries.length > 0 && hasFlexDisplay && (
                        <div className="w-full flex flex-col items-center mt-0.5 gap-px">
                          {flexEntries.length === 1 ? (
                            <div className="w-full text-center leading-none">
                              <span className="block text-[10px] font-semibold truncate text-purple-600">나</span>
                              <span className="block text-[9px] text-gray-400">{flexEntries[0].startTime}~</span>
                              <span className="block text-[9px] text-gray-400">{flexEntries[0].endTime}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-purple-500">+{flexEntries.length}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-0.5 mt-0.5 h-2 items-center justify-center">
                        {events.slice(0, 3).map((ev, ei) => (
                          <span
                            key={ei}
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"
                            }`}
                          />
                        ))}
                      </div>

                      {hasTooltip && (
                        <div
                          className={`absolute bottom-full ${tooltipAlign} mb-2 z-50
                            hidden group-hover:block
                            bg-gray-900 text-white rounded-xl shadow-xl
                            w-48 p-3 pointer-events-none`}
                        >
                          <p className="text-[10px] text-gray-400 font-medium mb-2">{currentMonth + 1}월 {day}일</p>
                          {flexEntries.length > 0 && (
                            <div className={events.length > 0 ? "mb-2 pb-2 border-b border-gray-700" : ""}>
                              <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">유연근무</p>
                              <div className="flex flex-col gap-1.5">
                                {flexEntries.map((fe, fi) => (
                                  <div key={fi} className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold">나</span>
                                    <span className="text-xs text-gray-300">{fe.startTime}~{fe.endTime}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {events.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {events.map((ev, ei) => (
                                <div key={ei} className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.type === "vacation" ? "bg-green-400" : "bg-blue-400"}`} />
                                  <span className="text-xs font-semibold">나</span>
                                  <span className="text-xs text-gray-300">{ev.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-xs text-gray-400">내 휴가</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span className="text-xs text-gray-400">내 출장</span>
            </div>
            {hasFlexDisplay && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span className="text-xs text-gray-400">유연근무</span>
              </div>
            )}
          </div>
        </div>

        {/* 신청 현황 + 버튼 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">신청 현황</p>
          <div className="flex flex-col gap-2 mb-4">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">신청 내역이 없습니다</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.type === "vacation" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {req.type === "vacation" ? "휴가" : "출장"}
                    </span>
                    <span className="text-sm text-gray-700">{req.label}</span>
                    <span className="text-xs text-gray-400">{req.date.slice(5)}</span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    req.status === "승인완료" ? "bg-green-50 text-green-600"
                    : req.status === "반려" ? "bg-red-50 text-red-600"
                    : "bg-yellow-50 text-yellow-600"
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/attendance/business-trip" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-all shadow-sm">
                출장 신청
              </button>
            </Link>
            <Link href="/attendance/vacation" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold active:scale-95 transition-all shadow-sm">
                휴가 신청
              </button>
            </Link>
          </div>
        </div>

      </div>

      {/* 날짜 상세 바텀시트 */}
      {selectedDay !== null && (() => {
        const dayEvents = eventMap[selectedDay] ?? [];
        const dayFlex = flexMap[selectedDay] ?? [];
        const mm = String(currentMonth + 1).padStart(2, "0");
        const dateStr = `${currentYear}-${mm}-${String(selectedDay).padStart(2, "0")}`;
        const myFlexForDay = myFlexSchedules.find(s => s.date === dateStr);
        const closeModal = () => { setSelectedDay(null); setModalMode("detail"); setFlexInput({ startTime: "", endTime: "" }); };

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={closeModal}>
            <div className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {modalMode === "flex-add" && (
                    <button onClick={() => { setModalMode("detail"); setFlexInput({ startTime: "", endTime: "" }); }} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {modalMode === "detail" ? `${currentMonth + 1}월 ${selectedDay}일` : "유연근무 등록"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {modalMode === "detail" ? "해당 날의 전체 일정" : "나의 근무 시간을 입력하세요"}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl hover:text-gray-600">×</button>
              </div>

              {modalMode === "detail" ? (
                <div className="px-5 pt-4">
                  {dayFlex.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-purple-500 mb-2">유연근무</p>
                      <div className="flex flex-col gap-2">
                        {dayFlex.map((fe, fi) => (
                          <div key={fi} className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-800">나</span>
                            </div>
                            <span className="text-sm text-purple-600 font-medium">{fe.startTime} ~ {fe.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">휴가 · 출장</p>
                      <div className="flex flex-col gap-2">
                        {dayEvents.map((ev, ei) => (
                          <div key={ei} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"}`} />
                              <span className="text-sm font-semibold text-gray-800">나</span>
                              <span className="text-sm text-gray-500">{ev.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dayFlex.length === 0 && dayEvents.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">등록된 일정이 없습니다</p>
                  )}
                  <button
                    onClick={() => {
                      if (myFlexForDay) setFlexInput({ startTime: myFlexForDay.startTime, endTime: myFlexForDay.endTime });
                      setModalMode("flex-add");
                    }}
                    className="w-full py-3.5 mt-2 mb-1 bg-purple-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all"
                  >
                    {myFlexForDay ? "유연근무 수정" : "유연근무 등록"}
                  </button>
                </div>
              ) : (
                <div className="px-5 pt-4">
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1.5 block">시작 시간</label>
                      <input
                        type="time"
                        value={flexInput.startTime}
                        onChange={e => setFlexInput(p => ({ ...p, startTime: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-500 bg-gray-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1.5 block">종료 시간</label>
                      <input
                        type="time"
                        value={flexInput.endTime}
                        onChange={e => setFlexInput(p => ({ ...p, endTime: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-500 bg-gray-50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleFlexSubmit}
                    disabled={!flexInput.startTime || !flexInput.endTime}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    등록하기
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <BottomNav />
    </div>
  );
}
