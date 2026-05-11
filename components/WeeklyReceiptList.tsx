"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Receipt = {
  id: string;
  date: string;
  time: string;
  store: string;
  menu: string;
  amount: number;
  status: string;
};

const PAGE_SIZE = 5;

function getMonthOffset(offset: number): { year: number; month: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function calcOffset(year: number, month: number): number {
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
}

export default function WeeklyReceiptList({ receipts }: { receipts: Receipt[] }) {
  const router = useRouter();
  const [monthOffset, setMonthOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [showPicker, setShowPicker] = useState(false);

  const { year, month } = getMonthOffset(monthOffset);
  const [pickerYear, setPickerYear] = useState(year);

  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const filtered = receipts
    .filter((r) => r.date.startsWith(prefix))
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleMonthChange = (delta: number) => {
    setMonthOffset((o) => o + delta);
    setPage(1);
  };

  const openPicker = () => {
    setPickerYear(year);
    setShowPicker(true);
  };

  const selectMonth = (m: number) => {
    setMonthOffset(calcOffset(pickerYear, m));
    setPage(1);
    setShowPicker(false);
  };

  const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">세부 내역</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <button
            className="px-2 py-1 rounded active:bg-gray-100 transition-colors"
            onClick={() => handleMonthChange(-1)}
          >
            &lt;
          </button>
          <button
            onClick={openPicker}
            className="text-center font-semibold text-gray-700 px-1 py-1 rounded hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            {year}년 {month}월
          </button>
          <button
            className="px-2 py-1 rounded active:bg-gray-100 transition-colors"
            onClick={() => handleMonthChange(1)}
          >
            &gt;
          </button>
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">해당 월의 내역이 없습니다</div>
      ) : (
        paginated.map((receipt) => (
          <button
            key={receipt.id}
            onClick={() => router.push(`/meals/receipts/${receipt.id}`)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0 active:bg-gray-50 transition-colors text-left"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs text-gray-400">{receipt.date.replace(/-/g, "/")} {receipt.time}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{receipt.store}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{receipt.menu}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-base font-bold text-blue-500">{receipt.amount.toLocaleString()}원</p>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  receipt.status === "승인완료"
                    ? "bg-green-50 text-green-600"
                    : receipt.status === "반려"
                    ? "bg-red-50 text-red-500"
                    : "bg-yellow-50 text-yellow-600"
                }`}
              >
                {receipt.status}
              </span>
            </div>
          </button>
        ))
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 py-3 border-t border-gray-50">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                p === currentPage
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 월 선택 피커 */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* 연도 선택 */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-100 text-gray-500 transition-colors"
              >
                &lt;
              </button>
              <span className="text-base font-bold text-gray-900">{pickerYear}년</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-100 text-gray-500 transition-colors"
              >
                &gt;
              </button>
            </div>

            {/* 월 그리드 */}
            <div className="grid grid-cols-4 gap-2 px-5 pt-4">
              {MONTHS.map((label, i) => {
                const m = i + 1;
                const isSelected = pickerYear === year && m === month;
                return (
                  <button
                    key={m}
                    onClick={() => selectMonth(m)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
