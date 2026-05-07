"use client";
import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { DUMMY } from "@/lib/api";

const CALENDAR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKS = [
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
];

const GOAL_HOURS = 25;
const MAX_DAY_HOURS = 10;
const today = 6;

type CalEvent = {
  type: string;
  label: string;
  isTeam?: boolean;
  member?: string;
  status?: string;
  time?: string;
  destination?: string;
};

type FlexEntry = {
  member: string;
  startTime: string;
  endTime: string;
  isSelf?: boolean;
};

type MyFlexSchedule = {
  date: string;
  startTime: string;
  endTime: string;
};

const shortName = (member: string) =>
  member === "나" ? "나" : member.slice(1);

// 이번 주 월요일(5/4) 기준으로 offset 주의 월~금 범위 반환
const getWeekLabel = (offset: number): string => {
  if (offset === 0) return "이번 주";
  const monday = new Date(2026, 4, 4);
  monday.setDate(monday.getDate() + offset * 7);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)}~${fmt(friday)}`;
};

export default function AttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const [showFlex, setShowFlex] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<"detail" | "flex-add">("detail");
  const [myFlexSchedules, setMyFlexSchedules] = useState<MyFlexSchedule[]>([]);
  const [flexInput, setFlexInput] = useState({ startTime: "", endTime: "" });

  const { attendance } = DUMMY;

  const weekData = attendance.weeklyData.find((w) => w.offset === weekOffset) ?? {
    label: weekOffset === 0 ? "이번 주" : weekOffset > 0 ? "다음 주" : `${Math.abs(weekOffset)}주 전`,
    range: "-",
    days: [
      { day: "월", hours: 0 },
      { day: "화", hours: 0 },
      { day: "수", hours: 0 },
      { day: "목", hours: 0 },
      { day: "금", hours: 0 },
    ],
  };

  const totalHours = weekData.days.reduce((sum, d) => sum + d.hours, 0);
  const progressPct = Math.min((totalHours / GOAL_HOURS) * 100, 100);
  const isGoalMet = totalHours >= GOAL_HOURS;

  // 휴가/출장 이벤트 맵
  const eventMap: Record<number, CalEvent[]> = {};
  attendance.myEvents.forEach((e) => {
    const day = parseInt(e.date.split("-")[2]);
    if (!eventMap[day]) eventMap[day] = [];
    eventMap[day].push({ type: e.type, label: e.label, status: e.status, time: e.time, destination: e.destination });
  });
  if (showTeam) {
    attendance.teamEvents.forEach((e) => {
      const day = parseInt(e.date.split("-")[2]);
      if (!eventMap[day]) eventMap[day] = [];
      eventMap[day].push({ type: e.type, label: e.label, isTeam: true, member: e.member, time: e.time, destination: e.destination });
    });
  }

  // 유연근무 맵 (토글 시 팀원 일정 + 항상 내 일정)
  const flexMap: Record<number, FlexEntry[]> = {};
  if (showFlex) {
    attendance.flexSchedules.forEach((f) => {
      const day = parseInt(f.date.split("-")[2]);
      if (!flexMap[day]) flexMap[day] = [];
      flexMap[day].push({ member: f.member, startTime: f.startTime, endTime: f.endTime });
    });
  }
  myFlexSchedules.forEach((f) => {
    const day = parseInt(f.date.split("-")[2]);
    if (!flexMap[day]) flexMap[day] = [];
    flexMap[day].unshift({ member: "나", startTime: f.startTime, endTime: f.endTime, isSelf: true });
  });

  const handleFlexSubmit = () => {
    if (!selectedDay || !flexInput.startTime || !flexInput.endTime) return;
    const dateStr = `2026-05-${String(selectedDay).padStart(2, "0")}`;
    setMyFlexSchedules((prev) => [
      ...prev.filter((s) => s.date !== dateStr),
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
        <p className="text-xs text-gray-400 mt-0.5">2026년 5월</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* 주간 근로시간 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400">주간 근로시간</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base leading-none"
              >
                ‹
              </button>
              <span className="text-xs text-gray-600 font-medium min-w-[84px] text-center">
                {getWeekLabel(weekOffset)}
              </span>
              <button
                onClick={() => setWeekOffset((o) => Math.min(o + 1, 1))}
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
            {weekData.days.map((d) => (
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
            <p className="text-xs font-medium text-gray-400">2026년 5월</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFlex}
                  onChange={(e) => setShowFlex(e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                <span className="text-xs text-gray-500">유연근무</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTeam}
                  onChange={(e) => setShowTeam(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs text-gray-500">팀 일정</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center mb-1">
            {CALENDAR_DAYS.map((d) => (
              <span key={d} className="text-xs text-gray-400 font-medium py-1">{d}</span>
            ))}
          </div>

          <div className="flex flex-col gap-0.5">
            {WEEKS.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const events = day ? (eventMap[day] ?? []) : [];
                  const flexEntries = day ? (flexMap[day] ?? []) : [];
                  const hasTooltip = events.length > 0 || flexEntries.length > 0;
                  const tooltipAlign =
                    di <= 1 ? "left-0" : di >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";

                  return (
                    <div
                      key={di}
                      className="relative flex flex-col items-center py-0.5 group"
                      onClick={() => { if (day) { setSelectedDay(day); setModalMode("detail"); } }}
                    >
                      {/* 날짜 숫자 */}
                      <div
                        className={`text-sm rounded-full w-7 h-7 flex items-center justify-center ${
                          day === today
                            ? "bg-blue-600 text-white font-bold"
                            : day
                            ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                            : ""
                        }`}
                      >
                        {day ?? ""}
                      </div>

                      {/* 유연근무 인라인 텍스트 */}
                      {flexEntries.length > 0 && hasFlexDisplay && (
                        <div className="w-full flex flex-col items-center mt-0.5 gap-px">
                          {flexEntries.length === 1 ? (
                            // 1명: 이름 + 시간 모두 표시
                            <div className="w-full text-center leading-none">
                              <span className={`block text-[10px] font-semibold truncate ${flexEntries[0].isSelf ? "text-purple-600" : "text-purple-400"}`}>
                                {shortName(flexEntries[0].member)}
                              </span>
                              <span className="block text-[9px] text-gray-400">
                                {flexEntries[0].startTime}~
                              </span>
                              <span className="block text-[9px] text-gray-400">
                                {flexEntries[0].endTime}
                              </span>
                            </div>
                          ) : flexEntries.length === 2 ? (
                            // 2명: 이름만 2줄
                            <>
                              {flexEntries.map((fe, fi) => (
                                <span key={fi} className={`block text-[10px] font-semibold truncate w-full text-center ${fe.isSelf ? "text-purple-600" : "text-purple-400"}`}>
                                  {shortName(fe.member)}
                                </span>
                              ))}
                            </>
                          ) : (
                            // 3명 이상: +N 뱃지만
                            <span className="text-[11px] font-bold text-purple-500">
                              +{flexEntries.length}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 이벤트 도트 */}
                      <div className="flex gap-0.5 mt-0.5 h-2 items-center justify-center">
                        {events.slice(0, 3).map((ev, ei) => (
                          <span
                            key={ei}
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.isTeam ? "bg-orange-400" : ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"
                            }`}
                          />
                        ))}
                      </div>

                      {/* hover 툴팁 */}
                      {hasTooltip && (
                        <div
                          className={`absolute bottom-full ${tooltipAlign} mb-2 z-50
                            hidden group-hover:block
                            bg-gray-900 text-white rounded-xl shadow-xl
                            w-48 p-3 pointer-events-none`}
                        >
                          <p className="text-[10px] text-gray-400 font-medium mb-2">5월 {day}일</p>

                          {/* 유연근무 섹션 */}
                          {flexEntries.length > 0 && (
                            <div className={events.length > 0 ? "mb-2 pb-2 border-b border-gray-700" : ""}>
                              <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">
                                유연근무
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {flexEntries.map((fe, fi) => (
                                  <div key={fi} className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${fe.isSelf ? "bg-purple-400" : "bg-purple-300"}`} />
                                    <span className="text-xs font-semibold">
                                      {fe.isSelf ? "나" : fe.member}
                                    </span>
                                    <span className="text-xs text-gray-300">
                                      {fe.startTime}~{fe.endTime}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 휴가/출장 섹션 */}
                          {events.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {events.map((ev, ei) => (
                                <div key={ei} className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      ev.isTeam ? "bg-orange-400" : ev.type === "vacation" ? "bg-green-400" : "bg-blue-400"
                                    }`} />
                                    <span className="text-xs font-semibold">
                                      {ev.isTeam ? ev.member : "나"}
                                    </span>
                                    <span className="text-xs text-gray-300">{ev.label}</span>
                                  </div>
                                  {ev.time && (
                                    <p className="text-xs text-gray-400 pl-3">{ev.time}</p>
                                  )}
                                  {ev.destination && (
                                    <p className="text-xs text-gray-400 pl-3">→ {ev.destination}</p>
                                  )}
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

          {/* 범례 */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-xs text-gray-400">내 휴가</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span className="text-xs text-gray-400">내 출장</span>
            </div>
            {showTeam && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                <span className="text-xs text-gray-400">팀 일정</span>
              </div>
            )}
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
            {attendance.requests.map((req) => (
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
                  req.status === "승인완료"
                    ? "bg-green-50 text-green-600"
                    : req.status === "반려"
                    ? "bg-red-50 text-red-600"
                    : "bg-yellow-50 text-yellow-600"
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
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
        const dateStr = `2026-05-${String(selectedDay).padStart(2, "0")}`;
        const myFlexForDay = myFlexSchedules.find((s) => s.date === dateStr);
        const closeModal = () => { setSelectedDay(null); setModalMode("detail"); setFlexInput({ startTime: "", endTime: "" }); };

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={closeModal}>
            <div className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10" onClick={(e) => e.stopPropagation()}>

              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {modalMode === "flex-add" && (
                    <button onClick={() => { setModalMode("detail"); setFlexInput({ startTime: "", endTime: "" }); }} className="text-gray-400 hover:text-gray-600 mr-1">
                      ←
                    </button>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {modalMode === "detail" ? `5월 ${selectedDay}일` : "유연근무 등록"}
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
                  {/* 유연근무 섹션 */}
                  {dayFlex.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-purple-500 mb-2">유연근무</p>
                      <div className="flex flex-col gap-2">
                        {dayFlex.map((fe, fi) => (
                          <div key={fi} className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${fe.isSelf ? "bg-purple-500" : "bg-purple-300"}`} />
                              <span className="text-sm font-semibold text-gray-800">
                                {fe.isSelf ? "나" : fe.member}
                              </span>
                            </div>
                            <span className="text-sm text-purple-600 font-medium">
                              {fe.startTime} ~ {fe.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 휴가/출장 섹션 */}
                  {dayEvents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">휴가 · 출장</p>
                      <div className="flex flex-col gap-2">
                        {dayEvents.map((ev, ei) => (
                          <div key={ei} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.isTeam ? "bg-orange-400" : ev.type === "vacation" ? "bg-green-500" : "bg-blue-500"}`} />
                              <span className="text-sm font-semibold text-gray-800">
                                {ev.isTeam ? ev.member : "나"}
                              </span>
                              <span className="text-sm text-gray-500">{ev.label}</span>
                            </div>
                            <div className="text-right">
                              {ev.time && <p className="text-xs text-gray-400">{ev.time}</p>}
                              {ev.destination && <p className="text-xs text-gray-400">→ {ev.destination}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 아무 일정 없을 때 */}
                  {dayFlex.length === 0 && dayEvents.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">등록된 일정이 없습니다</p>
                  )}

                  {/* 유연근무 등록/수정 버튼 */}
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
                        onChange={(e) => setFlexInput((p) => ({ ...p, startTime: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-500 bg-gray-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1.5 block">종료 시간</label>
                      <input
                        type="time"
                        value={flexInput.endTime}
                        onChange={(e) => setFlexInput((p) => ({ ...p, endTime: e.target.value }))}
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
