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

export default function AttendancePage() {
  const { attendance } = DUMMY;
  const today = 6;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">근태 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">2026년 5월</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* 근태 현황 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">이달 근태 현황</p>
          <div className="flex justify-between">
            {[
              { label: "출근 시각", value: attendance.startTime, color: "text-blue-600" },
              { label: "잔여 휴가", value: `${attendance.remaining.vacation}일`, color: "text-green-600" },
              { label: "잔여 출장", value: `${attendance.remaining.businessTrip}일`, color: "text-orange-500" },
            ].map((item) => (
              <div key={item.label} className="text-center flex-1">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 캘린더 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">2026년 5월</p>
          <div className="grid grid-cols-7 text-center mb-2">
            {CALENDAR_DAYS.map((d) => (
              <span key={d} className="text-xs text-gray-400 font-medium py-1">{d}</span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {WEEKS.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 text-center">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`py-1.5 text-sm rounded-full mx-auto w-8 h-8 flex items-center justify-center ${
                      day === today
                        ? "bg-blue-600 text-white font-bold"
                        : day
                        ? "text-gray-700 hover:bg-gray-100"
                        : ""
                    }`}
                  >
                    {day ?? ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 신청 버튼 */}
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

      <BottomNav />
    </div>
  );
}
