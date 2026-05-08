"use client";

import { useState } from "react";
import Link from "next/link";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";
import { getMealLimit } from "@/lib/holidays";

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

const INTERN_COLORS = ["bg-blue-500", "bg-green-500", "bg-orange-400", "bg-purple-500", "bg-pink-500"];
const INTERN_BAR_COLORS = ["bg-blue-500", "bg-green-500", "bg-orange-400", "bg-purple-500", "bg-pink-500"];

export default function AdminMealsPage() {
  const { interns, internMeals } = ADMIN_DUMMY;
  const totalLimit = getMealLimit(year, month);

  const [selectedInternId, setSelectedInternId] = useState<string | null>(null);

  const selectedMeals = internMeals.find((m) => m.internId === selectedInternId);
  const selectedIntern = interns.find((i) => i.id === selectedInternId);

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">식대 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{year}년 {month}월 · 인턴별 현황</p>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-3">
        {/* 영수증 보관함 진입 버튼 */}
        <Link href="/admin/meals/receipts">
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-200 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-xl">🧾</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">영수증 보관함</p>
                <p className="text-xs text-gray-400">일자별 전체 영수증 보기</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        </Link>

        {/* 인턴별 식대 현황 */}
        {interns.map((intern, i) => {
          const mealData = internMeals.find((m) => m.internId === intern.id);
          const used = mealData?.used ?? 0;
          const remaining = totalLimit - used;
          const pct = Math.min(Math.round((used / totalLimit) * 100), 100);

          return (
            <div
              key={intern.id}
              className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
              onClick={() => setSelectedInternId(intern.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${INTERN_COLORS[i]}`}>
                    {intern.name.slice(0, 1)}
                  </div>
                  <p className="text-base font-bold text-gray-900">{intern.name}</p>
                </div>
                <span className="text-xs text-gray-400">{pct}% 사용</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{used.toLocaleString()}원</p>
                  <p className="text-xs text-gray-400">사용</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-blue-600">{remaining.toLocaleString()}원</p>
                  <p className="text-xs text-gray-400">잔여</p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${INTERN_BAR_COLORS[i]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 text-right">한도 {totalLimit.toLocaleString()}원</p>
            </div>
          );
        })}
      </div>

      {/* 개인별 영수증 내역 바텀시트 */}
      {selectedInternId !== null && selectedMeals && selectedIntern && (() => {
        const receipts = [...selectedMeals.receipts].sort(
          (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
        );
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setSelectedInternId(null)}
          >
            <div
              className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedIntern.name} 영수증 내역</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{year}년 {month}월</p>
                </div>
                <button
                  onClick={() => setSelectedInternId(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl hover:text-gray-600"
                >×</button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 pt-4">
                {receipts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">내역이 없습니다</p>
                ) : (
                  <div className="flex flex-col">
                    {receipts.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-xs text-gray-400">{r.date.replace(/-/g, "/")} {r.time}</p>
                          <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{r.store}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{r.menu}</p>
                        </div>
                        <div className="flex items-center shrink-0">
                          <p className="text-base font-bold text-blue-500">{r.amount.toLocaleString()}원</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <AdminBottomNav />
    </div>
  );
}
