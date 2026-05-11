"use client";

import { useState, useEffect } from "react";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";

type RealFlexSchedule = {
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
};

const CALENDAR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKS = [
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
];
const TODAY = 7;
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

// 이번 주 월요일 = 2026-05-04
const BASE_MONDAY = new Date(2026, 4, 4);

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [activeTab, setActiveTab] = useState<"schedule" | "records">("schedule");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [flexSchedules, setFlexSchedules] = useState<RealFlexSchedule[]>([]);

  const { interns, internEvents, attendanceRecords } = ADMIN_DUMMY;

  useEffect(() => {
    fetch("/api/admin/schedules?month=2026-05")
      .then((res) => res.json())
      .then((json) => { if (json.flexSchedules) setFlexSchedules(json.flexSchedules); })
      .catch((err) => console.error("[schedules fetch]", err));
  }, []);

  // 날짜별 특별 일정이 있는 인턴 집합 (기본 외 = flex or 휴가/출장)
  const specialMap: Record<number, Set<string>> = {};
  internEvents.forEach((e) => {
    const day = parseInt(e.date.split("-")[2]);
    if (!specialMap[day]) specialMap[day] = new Set();
    specialMap[day].add(e.internId);
  });
  flexSchedules.forEach((f) => {
    const intern = interns.find((i) => i.name === f.user_name);
    if (!intern) return;
    const day = parseInt(f.date.split("-")[2]);
    if (!specialMap[day]) specialMap[day] = new Set();
    specialMap[day].add(intern.id);
  });

  // 특정 인턴+날짜의 일정 조회
  const getSchedule = (internId: string, day: number) => {
    const dateKey = `2026-05-${String(day).padStart(2, "0")}`;
    const event = internEvents.find((e) => e.internId === internId && e.date === dateKey);
    if (event) return { type: "event" as const, event };
    const intern = interns.find((i) => i.id === internId);
    const flex = intern
      ? flexSchedules.find((f) => f.user_name === intern.name && f.date === dateKey)
      : undefined;
    if (flex) return { type: "flex" as const, flex: { startTime: flex.start_time, endTime: flex.end_time } };
    return { type: "default" as const };
  };

  // 주간 근무 기록
  const weekDates = getWeekDates(weekOffset);
  const weeklyData = interns.map((intern, i) => {
    const dayHours = weekDates.map((date) => {
      const rec = attendanceRecords.find((r) => r.internId === intern.id && r.date === date);
      return rec?.hours ?? null;
    });
    const totalHours = dayHours.reduce((sum: number, h) => sum + (h ?? 0), 0);
    return { intern, dayHours, totalHours, ci: i };
  });

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">근태 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">2026년 5월</p>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-100 flex">
        {(["schedule", "records"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"
            }`}
          >
            {tab === "schedule" ? "근무 일정" : "근무 기록"}
          </button>
        ))}
      </div>

      {activeTab === "schedule" ? (
        <div className="flex flex-col gap-3 px-4 pt-3">
          {/* 당일 근무 일정 */}
          <div className="bg-white rounded-2xl px-4 pt-3 pb-2 shadow-sm border border-gray-100">
            <p className="text-base font-bold mb-2" style={{ color: "#8dc63f" }}>오늘의 근무일정</p>
            <div className="flex flex-col gap-1.5">
              {interns.map((intern, i) => {
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
                        {/* 특별 일정 있는 인턴 색상 도트 */}
                        {specials.size > 0 && (
                          <div className="flex gap-px mt-0.5 flex-wrap justify-center max-w-full px-0.5">
                            {interns.map((intern, i) =>
                              specials.has(intern.id) ? (
                                <span key={intern.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: INTERN_HEX[i] }} />
                              ) : null
                            )}
                          </div>
                        )}
                        {/* hover 툴팁 */}
                        {specials.size > 0 && (
                          <div className={`absolute bottom-full ${tooltipAlign} mb-2 z-50 hidden group-hover:block bg-gray-900 text-white rounded-xl shadow-xl w-52 p-3 pointer-events-none`}>
                            <p className="text-[10px] text-gray-400 font-medium mb-2">5월 {day}일</p>
                            <div className="flex flex-col gap-1.5">
                              {interns.map((intern, i) => {
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
      ) : (
        /* 근무 기록 탭 */
        <div className="flex flex-col gap-3 px-4 pt-3">
          {/* 주 네비게이션 */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full text-xl leading-none"
            >‹</button>
            <span className="text-sm font-semibold text-gray-700">{getWeekLabel(weekOffset)}</span>
            <button
              onClick={() => setWeekOffset((o) => Math.min(o + 1, 2))}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full text-xl leading-none"
            >›</button>
          </div>

          {/* 주간 기록 테이블 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 헤더 */}
            <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr_44px] px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium">이름</span>
              {DAY_LABELS.map((d) => (
                <span key={d} className="text-xs text-gray-400 font-medium text-center">{d}</span>
              ))}
              <span className="text-xs text-gray-400 font-medium text-right">계</span>
            </div>
            {/* 인턴 행 */}
            {weeklyData.map(({ intern, dayHours, totalHours, ci }) => (
              <div
                key={intern.id}
                className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr_44px] px-3 py-3 border-b border-gray-50 last:border-b-0 items-center"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: INTERN_HEX[ci] }} />
                  <span className="text-xs font-semibold text-gray-800 truncate">{intern.name}</span>
                </div>
                {dayHours.map((h, di) => (
                  <span
                    key={di}
                    className={`text-xs text-center ${h !== null ? "font-semibold" : "text-gray-300"}`}
                    style={h !== null ? { color: INTERN_HEX[ci] } : undefined}
                  >
                    {h !== null ? h : "−"}
                  </span>
                ))}
                <span
                  className={`text-xs font-bold text-right ${totalHours === 0 ? "text-gray-300" : ""}`}
                  style={totalHours > 0 ? { color: INTERN_HEX[ci] } : undefined}
                >
                  {totalHours > 0 ? `${totalHours}h` : "−"}
                </span>
              </div>
            ))}
          </div>

          {/* 범례 */}
          <p className="text-xs text-gray-400 text-center px-4">단위: 시간 · −는 미출근 또는 공휴일</p>
        </div>
      )}

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
                <h3 className="text-base font-bold text-gray-900">5월 {selectedDay}일 근무 일정</h3>
                <p className="text-xs text-gray-400 mt-0.5">인턴별 근무 계획</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl">×</button>
            </div>
            <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
              {interns.map((intern, i) => {
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
