import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { DUMMY } from "@/lib/api";

export default function MealsPage() {
  const { meals } = DUMMY;
  const mealPercent = Math.round((meals.used / meals.totalLimit) * 100);
  const remaining = meals.totalLimit - meals.used;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">식대 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">2026년 5월</p>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* 한도 시각화 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-3">이달 식대 한도</p>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-2xl font-bold text-blue-600">{meals.used.toLocaleString()}원</p>
              <p className="text-xs text-gray-400">사용 금액</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-500">{remaining.toLocaleString()}원</p>
              <p className="text-xs text-gray-400">잔여</p>
            </div>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                mealPercent >= 90 ? "bg-red-500" : mealPercent >= 70 ? "bg-orange-400" : "bg-blue-500"
              }`}
              style={{ width: `${mealPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-gray-400">{mealPercent}% 사용</p>
            <p className="text-xs text-gray-400">한도 {meals.totalLimit.toLocaleString()}원</p>
          </div>
        </div>

        {/* OCR 등록 버튼 */}
        <Link href="/meals/ocr">
          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
            <span>📷</span>
            <span>영수증 등록 (OCR)</span>
          </button>
        </Link>

        {/* 영수증 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">영수증 목록</p>
          </div>
          {meals.receipts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">등록된 영수증이 없습니다</div>
          ) : (
            meals.receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{receipt.date}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{receipt.amount.toLocaleString()}원</p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    receipt.status === "승인완료"
                      ? "bg-green-50 text-green-600"
                      : "bg-yellow-50 text-yellow-600"
                  }`}
                >
                  {receipt.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
