import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { DUMMY } from "@/lib/api";

export default function HomePage() {
  const { user, attendance, meals } = DUMMY;
  const mealPercent = Math.round((meals.used / meals.totalLimit) * 100);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-blue-600 px-5 pt-12 pb-6">
        <p className="text-blue-200 text-sm">안녕하세요 👋</p>
        <h2 className="text-white text-xl font-bold mt-0.5">
          {user.name}님
        </h2>
        <p className="text-blue-200 text-xs mt-1">
          {user.department} · {user.position}
        </p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-5">
        {/* 사용자 정보 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-3">오늘의 근태</p>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{attendance.startTime}</p>
              <p className="text-xs text-gray-400 mt-0.5">출근 시각</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{attendance.remaining.vacation}일</p>
              <p className="text-xs text-gray-400 mt-0.5">잔여 휴가</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{attendance.remaining.businessTrip}일</p>
              <p className="text-xs text-gray-400 mt-0.5">잔여 출장</p>
            </div>
          </div>
        </div>

        {/* 근태 관리 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-800">근태 관리</p>
            <Link href="/attendance" className="text-xs text-blue-500">더보기 →</Link>
          </div>
          <div className="flex gap-2">
            <Link href="/attendance/business-trip" className="flex-1">
              <button className="w-full py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium active:scale-95 transition-all">
                출장 신청
              </button>
            </Link>
            <Link href="/attendance/vacation" className="flex-1">
              <button className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium active:scale-95 transition-all">
                휴가 신청
              </button>
            </Link>
          </div>
        </div>

        {/* 식대 관리 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-800">식대 관리</p>
            <Link href="/meals" className="text-xs text-blue-500">더보기 →</Link>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>이번 달 사용</span>
              <span>{meals.used.toLocaleString()}원 / {meals.totalLimit.toLocaleString()}원</span>
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
