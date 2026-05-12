"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { getWorkingDaysInWeek, isHoliday } from "@/lib/holidays";

const CALENDAR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DAY_HOURS = 10;
const DAY_LABELS = ["월", "화", "수", "목", "금"];

type CalEvent = { type: "vacation" | "business_trip"; label: string; status?: string };
type RequestItem = { id: string; type: "vacation" | "business_trip"; label: string; date: string; status: string };
type DayData = { day: string; hours: number };
type FlexEntry = { id: string; userId: string; userName: string; startTime: string; endTime: string };
type TeamCalEntry = { userId: string; userName: string; type: "vacation" | "business_trip"; label: string };

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
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

function fmtHM(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
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
  const [flexInput, setFlexInput] = useState({ startTime: "", endTime: "" });
  const [weekDays, setWeekDays] = useState<DayData[]>(DAY_LABELS.map(day => ({ day, hours: 0 })));
  const [eventMap, setEventMap] = useState<Record<number, CalEvent[]>>({});
  const [flexMap, setFlexMap] = useState<Record<number, FlexEntry[]>>({});
  const [teamMap, setTeamMap] = useState<Record<number, TeamCalEntry[]>>({});
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [calYear, setCalYear] = useState(currentYear);
  const [calMonth, setCalMonth] = useState(currentMonth);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const calMm = String(calMonth + 1).padStart(2, "0");
  const weeks = getWeeksForMonth(calYear, calMonth);
  const monthLabel = `${calYear}년 ${calMonth + 1}월`;

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const fetchWeekData = useCallback(async (uid: string, offset: number) => {
    const monday = getMondayOfWeek(new Date());
    monday.setDate(monday.getDate() + offset * 7);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const weekDates = DAY_LABELS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return fmt(d);
    });

    const [attendanceRows, { data: trips }] = await Promise.all([
      Promise.all(weekDates.map(date =>
        supabase.from("attendance_records").select("clock_in, clock_out, lunch_break").eq("user_id", uid).eq("date", date).maybeSingle().then(r => r.data)
      )),
      supabase.from("business_trip_requests")
        .select("start_date, end_date, start_time, end_time")
        .eq("user_id", uid).eq("status", "approved")
        .lte("start_date", fmt(friday)).gte("end_date", fmt(monday)),
    ]);

    const days = DAY_LABELS.map((day, i) => {
      const data = attendanceRows[i];
      const date = weekDates[i];
      let hours = 0;
      if (data?.clock_in && data?.clock_out) {
        const diff = new Date(data.clock_out).getTime() - new Date(data.clock_in).getTime();
        hours = Math.round(diff / 36000) / 100;
        if (data.lunch_break) hours = Math.max(0, hours - 1);
      }
      const trip = (trips ?? []).find(t => t.start_date <= date && t.end_date >= date && t.start_time && t.end_time);
      if (trip) {
        const isSingleDay = trip.start_date === trip.end_date;
        const startStr = isSingleDay || trip.start_date === date ? trip.start_time : "09:00";
        const endStr = isSingleDay || trip.end_date === date ? trip.end_time : "18:00";
        const [sh, sm] = startStr.split(":").map(Number);
        const [eh, em] = endStr.split(":").map(Number);
        hours += (eh * 60 + em - sh * 60 - sm) / 60;
      }
      return { day, hours };
    });
    setWeekDays(days);
  }, []);

  const fetchMonthData = useCallback(async (uid: string) => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const m = String(calMonth + 1).padStart(2, "0");
    const startDate = `${calYear}-${m}-01`;
    const endDate = `${calYear}-${m}-${String(daysInMonth).padStart(2, "0")}`;

    const [myVacRes, myTripRes, allVacRes, allTripRes, flexRes, usersRes] = await Promise.all([
      supabase.from("vacation_requests").select("id, type, start_date, end_date, status")
        .eq("user_id", uid).lte("start_date", endDate).gte("end_date", startDate),
      supabase.from("business_trip_requests").select("id, destination, start_date, end_date, status")
        .eq("user_id", uid).lte("start_date", endDate).gte("end_date", startDate),
      supabase.from("vacation_requests").select("id, user_id, type, start_date, end_date, status")
        .neq("user_id", uid).lte("start_date", endDate).gte("end_date", startDate).eq("status", "approved"),
      supabase.from("business_trip_requests").select("id, user_id, destination, start_date, end_date, status")
        .neq("user_id", uid).lte("start_date", endDate).gte("end_date", startDate).eq("status", "approved"),
      supabase.from("flex_schedules").select("id, user_id, user_name, date, start_time, end_time")
        .gte("date", startDate).lte("date", endDate),
      supabase.from("users").select("id, name"),
    ]);

    const nameMap = Object.fromEntries((usersRes.data ?? []).map((u: { id: string; name: string }) => [u.id, u.name]));

    const map: Record<number, CalEvent[]> = {};
    myVacRes.data?.forEach(v => {
      for (let d = new Date(v.start_date + "T00:00:00"); d <= new Date(v.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ type: "vacation", label: v.type, status: v.status });
        }
      }
    });
    myTripRes.data?.forEach(t => {
      for (let d = new Date(t.start_date + "T00:00:00"); d <= new Date(t.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ type: "business_trip", label: t.destination, status: t.status });
        }
      }
    });
    setEventMap(map);

    const newTeamMap: Record<number, TeamCalEntry[]> = {};
    allVacRes.data?.forEach(v => {
      const name = nameMap[v.user_id] ?? "팀원";
      for (let d = new Date(v.start_date + "T00:00:00"); d <= new Date(v.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const day = d.getDate();
          if (!newTeamMap[day]) newTeamMap[day] = [];
          newTeamMap[day].push({ userId: v.user_id, userName: name, type: "vacation", label: v.type });
        }
      }
    });
    allTripRes.data?.forEach(t => {
      const name = nameMap[t.user_id] ?? "팀원";
      for (let d = new Date(t.start_date + "T00:00:00"); d <= new Date(t.end_date + "T00:00:00"); d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const day = d.getDate();
          if (!newTeamMap[day]) newTeamMap[day] = [];
          newTeamMap[day].push({ userId: t.user_id, userName: name, type: "business_trip", label: t.destination });
        }
      }
    });
    setTeamMap(newTeamMap);

    const newFlexMap: Record<number, FlexEntry[]> = {};
    flexRes.data?.forEach(f => {
      const day = parseInt(f.date.split("-")[2]);
      if (!newFlexMap[day]) newFlexMap[day] = [];
      newFlexMap[day].push({ id: f.id, userId: f.user_id, userName: f.user_name, startTime: f.start_time, endTime: f.end_time });
    });
    setFlexMap(newFlexMap);

    const reqList: RequestItem[] = [
      ...(myVacRes.data ?? []).map(v => ({ id: v.id, type: "vacation" as const, label: v.type, date: v.start_date, status: statusKo(v.status) })),
      ...(myTripRes.data ?? []).map(t => ({ id: t.id, type: "business_trip" as const, label: t.destination, date: t.start_date, status: statusKo(t.status) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    setRequests(reqList);
  }, [calYear, calMonth]);

  useEffect(() => {
    if (!userId) return;
    fetchWeekData(userId, weekOffset);
  }, [userId, weekOffset, fetchWeekData]);

  useEffect(() => {
    if (!userId) return;
    fetchMonthData(userId);
  }, [userId, fetchMonthData]);

  const totalHours = weekDays.reduce((sum, d) => sum + d.hours, 0);
  const goalMonday = getMondayOfWeek(new Date());
  goalMonday.setDate(goalMonday.getDate() + weekOffset * 7);
  const goalHours = getWorkingDaysInWeek(goalMonday) * 5;
  const progressPct = Math.min((totalHours / goalHours) * 100, 100);
  const isGoalMet = totalHours >= goalHours;

  const handleFlexSubmit = async () => {
    if (!selectedDay || !flexInput.startTime || !flexInput.endTime || !userId || !user) return;
    if (flexInput.startTime >= flexInput.endTime) return;
    const dateStr = `${calYear}-${calMm}-${String(selectedDay).padStart(2, "0")}`;
    await supabase.from("flex_schedules").upsert(
      { user_id: userId, user_name: user.name, date: dateStr, start_time: flexInput.startTime, end_time: flexInput.endTime },
      { onConflict: "user_id,date" }
    );
    await fetchMonthData(userId);
    setModalMode("detail");
    setFlexInput({ startTime: "", endTime: "" });
  };

  const handleFlexDelete = async (id: string) => {
    await supabase.from("flex_schedules").delete().eq("id", id);
    if (userId) await fetchMonthData(userId);
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">근태 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* 주간 근로시간 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400">주간 근로시간</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(o => o - 1)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none">‹</button>
              <span className="text-xs text-gray-600 font-medium min-w-[84px] text-center">{getWeekLabel(weekOffset)}</span>
              <button onClick={() => setWeekOffset(o => Math.min(o + 1, 8))} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none">›</button>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${isGoalMet ? "text-green-600" : "text-blue-600"}`}>{fmtHM(totalHours)}</span>
                <span className="text-xs text-gray-400">/ {goalHours}시간</span>
              </div>
              {isGoalMet ? <span className="text-xs text-green-600 font-medium">목표 달성</span> : <span className="text-xs text-gray-400">{fmtHM(goalHours - totalHours)} 남음</span>}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${isGoalMet ? "bg-green-500" : "bg-blue-600"}`} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="flex justify-between items-end gap-2">
            {weekDays.map(d => (
              <div key={d.day} className="flex flex-col items-center flex-1 gap-1.5">
                <span className="text-xs text-gray-500 font-medium h-4 flex items-center">{d.hours > 0 ? fmtHM(d.hours) : ""}</span>
                <div className="w-full h-16 bg-gray-100 rounded-lg flex items-end overflow-hidden">
                  <div className={`w-full rounded-lg transition-all duration-500 ${d.hours > 0 ? "bg-blue-500" : ""}`} style={{ height: d.hours > 0 ? `${(d.hours / MAX_DAY_HOURS) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 캘린더 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-visible">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none">‹</button>
              <span className="text-xs font-medium text-gray-700 min-w-[72px] text-center">{monthLabel}</span>
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none">›</button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={showFlex} onChange={e => setShowFlex(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600" />
                <span className="text-xs text-gray-500">유연근무</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={showTeam} onChange={e => setShowTeam(e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
                <span className="text-xs text-gray-500">출장/휴가</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center mb-1">
            {CALENDAR_DAYS.map((d, i) => (
              <span key={d} className={`text-xs font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</span>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const dayStr = day ? `${calYear}-${calMm}-${String(day).padStart(2, "0")}` : "";
                  const holiday = day ? isHoliday(dayStr) : false;
                  const isSunday = di === 0;
                  const isSaturday = di === 6;
                  const events = day ? (eventMap[day] ?? []) : [];
                  const flexEntries = day ? (flexMap[day] ?? []) : [];
                  const teamEntries = day ? (teamMap[day] ?? []) : [];
                  const isToday = calYear === currentYear && calMonth === currentMonth && day === todayDate;
                  const hasTooltip = events.length > 0 || (showFlex && flexEntries.length > 0) || (showTeam && teamEntries.length > 0);
                  const tooltipAlign = di <= 1 ? "left-0" : di >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
                  const dayColor = isToday ? "" : (holiday || isSunday) ? "text-red-500" : isSaturday ? "text-blue-400" : "text-gray-700";
                  return (
                    <div key={di} className="relative flex flex-col items-center py-0.5 group" onClick={() => { if (day) { setSelectedDay(day); setModalMode("detail"); } }}>
                      <div className={`text-sm rounded-full w-7 h-7 flex items-center justify-center ${isToday ? "bg-blue-600 text-white font-bold" : day ? `${dayColor} hover:bg-gray-100 cursor-pointer` : ""}`}>
                        {day ?? ""}
                      </div>
                      <div className="flex gap-0.5 mt-0.5 h-2 items-center justify-center flex-wrap">
                        {events.slice(0, 2).map((ev, ei) => (
                          <span key={`ev-${ei}`} className={`w-1.5 h-1.5 rounded-full ${ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"}`} />
                        ))}
                        {showTeam && teamEntries.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        )}
                      </div>
                      {showFlex && flexEntries.length > 0 && (
                        <div className="w-full flex flex-col items-center mt-0.5 gap-px">
                          {flexEntries.length === 1 ? (
                            <div className="w-full text-center leading-none">
                              <span className="block text-[10px] font-semibold truncate text-purple-600">{flexEntries[0].userName}</span>
                              <span className="block text-[9px] text-gray-400">{flexEntries[0].startTime}~</span>
                              <span className="block text-[9px] text-gray-400">{flexEntries[0].endTime}</span>
                            </div>
                          ) : <span className="text-[11px] font-bold text-purple-500">+{flexEntries.length}</span>}
                        </div>
                      )}
                      {hasTooltip && (
                        <div className={`absolute bottom-full ${tooltipAlign} mb-2 z-50 hidden group-hover:block bg-gray-900 text-white rounded-xl shadow-xl w-52 p-3 pointer-events-none`}>
                          <p className="text-[10px] text-gray-400 font-medium mb-2">{calMonth + 1}월 {day}일</p>
                          {showFlex && flexEntries.length > 0 && (
                            <div className={events.length > 0 || (showTeam && teamEntries.length > 0) ? "mb-2 pb-2 border-b border-gray-700" : ""}>
                              <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">유연근무</p>
                              {flexEntries.map((fe, fi) => (
                                <div key={fi} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                  <span className="text-xs font-semibold">{fe.userId === userId ? "나" : fe.userName}</span>
                                  <span className="text-xs text-gray-300">{fe.startTime}~{fe.endTime}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {showTeam && teamEntries.length > 0 && (
                            <div className={events.length > 0 ? "mb-2 pb-2 border-b border-gray-700" : ""}>
                              <p className="text-[9px] text-orange-400 font-semibold uppercase tracking-wide mb-1.5">출장/휴가</p>
                              {teamEntries.map((te, ti) => (
                                <div key={ti} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                  <span className="text-xs font-semibold">{te.userName}</span>
                                  <span className="text-xs text-gray-300 truncate">{te.label}</span>
                                </div>
                              ))}
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
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="text-xs text-gray-400">내 휴가</span></div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /><span className="text-xs text-gray-400">내 출장</span></div>
            {showFlex && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /><span className="text-xs text-gray-400">유연근무</span></div>}
            {showTeam && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /><span className="text-xs text-gray-400">출장/휴가</span></div>}
          </div>
        </div>

        {/* 신청 현황 + 버튼 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">신청 현황</p>
          <div className="flex flex-col gap-2 mb-4">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">신청 내역이 없습니다</p>
            ) : requests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.type === "vacation" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                    {req.type === "vacation" ? "휴가" : "출장"}
                  </span>
                  <span className="text-sm text-gray-700">{req.label}</span>
                  <span className="text-xs text-gray-400">{req.date.slice(5)}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${req.status === "승인완료" ? "bg-green-50 text-green-600" : req.status === "반려" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Link href="/attendance/business-trip" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-all shadow-sm">출장 신청</button>
            </Link>
            <Link href="/attendance/vacation" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold active:scale-95 transition-all shadow-sm">휴가 신청</button>
            </Link>
          </div>
        </div>
      </div>

      {selectedDay !== null && (() => {
        const dayEvents = eventMap[selectedDay] ?? [];
        const dayFlex = flexMap[selectedDay] ?? [];
        const dayTeam = teamMap[selectedDay] ?? [];
        const myFlexForDay = dayFlex.find(f => f.userId === userId);
        const closeModal = () => {
          setSelectedDay(null);
          setModalMode("detail");
          setFlexInput({ startTime: "", endTime: "" });
        };
        const goBack = () => {
          setModalMode("detail");
          setFlexInput({ startTime: "", endTime: "" });
        };
        const modalTitle = modalMode === "flex-add"
          ? (myFlexForDay ? "유연근무 수정" : "유연근무 등록")
          : `${calMonth + 1}월 ${selectedDay}일`;
        const modalSub = modalMode === "flex-add" ? "나의 근무 시간을 입력하세요" : "해당 날의 전체 일정";
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={closeModal}>
            <div className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {modalMode !== "detail" && (
                    <button onClick={goBack} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{modalTitle}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{modalSub}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl hover:text-gray-600">×</button>
              </div>

              {modalMode === "detail" && (
                <div className="px-5 pt-4 max-h-[60vh] overflow-y-auto">
                  {dayFlex.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-purple-500 mb-2">유연근무</p>
                      <div className="flex flex-col gap-2">
                        {dayFlex.map(fe => (
                          <div key={fe.id} className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-800">{fe.userId === userId ? "나" : fe.userName}</span>
                              <span className="text-sm text-purple-600 font-medium">{fe.startTime} ~ {fe.endTime}</span>
                            </div>
                            {fe.userId === userId && (
                              <button onClick={() => handleFlexDelete(fe.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors">삭제</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showTeam && dayTeam.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-orange-500 mb-2">출장/휴가</p>
                      <div className="flex flex-col gap-2">
                        {dayTeam.map((te, i) => (
                          <div key={i} className="flex items-center gap-2 py-2 px-3 bg-orange-50 rounded-xl">
                            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-orange-400" />
                            <span className="text-sm font-semibold text-gray-800">{te.userName}</span>
                            <span className="text-sm text-gray-500">{te.type === "vacation" ? "휴가" : "출장"}</span>
                            <span className="text-sm text-orange-600 truncate">{te.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">휴가 · 출장</p>
                      {dayEvents.map((ev, ei) => (
                        <div key={ei} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"}`} />
                          <span className="text-sm font-semibold text-gray-800">나</span>
                          <span className="text-sm text-gray-500">{ev.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {dayFlex.length === 0 && (!showTeam || dayTeam.length === 0) && dayEvents.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">등록된 일정이 없습니다</p>
                  )}
                  <div className="mt-2 mb-1">
                    <button
                      onClick={() => { if (myFlexForDay) setFlexInput({ startTime: myFlexForDay.startTime, endTime: myFlexForDay.endTime }); setModalMode("flex-add"); }}
                      className="w-full py-3.5 bg-purple-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all"
                    >
                      {myFlexForDay ? "유연근무 수정" : "유연근무 등록"}
                    </button>
                  </div>
                </div>
              )}

              {modalMode === "flex-add" && (() => {
                const flexTimeInvalid = !!flexInput.startTime && !!flexInput.endTime && flexInput.endTime <= flexInput.startTime;
                return (
                  <div className="px-5 pt-4">
                    <div className="flex gap-3 mb-1">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1.5 block">시작 시간</label>
                        <input type="time" value={flexInput.startTime} onChange={e => setFlexInput(p => ({ ...p, startTime: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-500 bg-gray-50" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1.5 block">종료 시간</label>
                        <input type="time" value={flexInput.endTime} min={flexInput.startTime || undefined} onChange={e => setFlexInput(p => ({ ...p, endTime: e.target.value }))} className={`w-full h-11 px-4 rounded-xl border text-sm outline-none bg-gray-50 ${flexTimeInvalid ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-purple-500"}`} />
                      </div>
                    </div>
                    {flexTimeInvalid && (
                      <p className="text-xs text-red-500 mb-4">종료 시간은 시작 시간보다 늦어야 합니다.</p>
                    )}
                    {!flexTimeInvalid && <div className="mb-4" />}
                    <button onClick={handleFlexSubmit} disabled={!flexInput.startTime || !flexInput.endTime || flexTimeInvalid} className="w-full py-4 bg-purple-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">등록하기</button>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      <BottomNav />
    </div>
  );
}
