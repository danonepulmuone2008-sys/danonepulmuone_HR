"use client";

import { useState } from "react";

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

export default function WeeklyReceiptList({ receipts }: { receipts: Receipt[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [page, setPage] = useState(1);

  const { year, month } = getMonthOffset(monthOffset);
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
          <span className="min-w-[32px] text-center font-medium">{month}월</span>
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
          <div
            key={receipt.id}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0"
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
                    : "bg-yellow-50 text-yellow-600"
                }`}
              >
                {receipt.status}
              </span>
            </div>
          </div>
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
    </>
  );
}
