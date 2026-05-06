import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import WeeklyReceiptList from "@/components/WeeklyReceiptList";
import { DUMMY } from "@/lib/api";
import { getMealLimit } from "@/lib/holidays";

export default function MealsPage() {
  const { meals } = DUMMY;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const totalLimit = getMealLimit(year, month);
  const mealPercent = Math.round((meals.used / totalLimit) * 100);
  const remaining = totalLimit - meals.used;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">식대 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{year}년 {month}월</p>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-3">
        {/* 한도 시각화 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-0.5">
            {year}년 {month}월
          </p>
          <p className="text-xs text-gray-900 mb-4">한도 {totalLimit.toLocaleString()}원</p>
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-base font-semibold text-gray-900">{meals.used.toLocaleString()}원</p>
              <p className="text-xs text-gray-400">사용 금액</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">{remaining.toLocaleString()}원</p>
              <p className="text-xs text-gray-400">잔여</p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                mealPercent >= 90 ? "bg-red-500" : mealPercent >= 70 ? "bg-orange-400" : "bg-blue-500"
              }`}
              style={{ width: `${mealPercent}%` }}
            />
          </div>
          <div className="flex justify-end mt-2">
            <p className="text-xs text-gray-400">{mealPercent}% 사용</p>
          </div>
        </div>

        {/* OCR 등록 버튼 */}
        <Link href="/meals/ocr">
          <button className="w-full py-3 bg-blue-600 text-white rounded-2xl text-base font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm">
            영수증 등록
          </button>
        </Link>

        {/* 세부 내역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <WeeklyReceiptList receipts={meals.receipts} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
