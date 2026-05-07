"use client";

import { useState } from "react";
import Link from "next/link";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";

type FlatReceipt = {
  id: string;
  date: string;
  time: string;
  store: string;
  menu: string;
  amount: number;
  status: string;
  internId: string;
};

function receiptNo(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return String(hash).slice(0, 8).padStart(8, "0");
}

function storePhone(store: string): string {
  let hash = 0;
  for (let i = 0; i < store.length; i++) hash = (hash * 31 + store.charCodeAt(i)) & 0x7fffffff;
  const p1 = (hash % 9000) + 1000;
  const p2 = ((hash >> 4) % 9000) + 1000;
  return `02-${p1}-${p2}`;
}

function MockReceipt({ r }: { r: FlatReceipt }) {
  return (
    <div className="flex justify-center py-2">
      <div
        className="relative bg-[#fffef8] px-6 py-6 w-[260px]"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          transform: "rotate(-0.4deg)",
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-2 bg-gray-50"
          style={{
            backgroundImage: "radial-gradient(circle at 6px 0, transparent 6px, #fffef8 6px)",
            backgroundSize: "12px 8px",
          }}
        />
        <div className="text-center mb-4 mt-1">
          <p className="font-bold text-[13px] tracking-tight">{r.store}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">서울 강남구 수서동 123-4</p>
          <p className="text-[10px] text-gray-500">{storePhone(r.store)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">사업자번호: 123-45-{receiptNo(r.id).slice(0, 5)}</p>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-[10px] text-gray-500 mb-1 space-y-0.5">
          <div className="flex justify-between">
            <span>영수증번호</span>
            <span>{receiptNo(r.id)}</span>
          </div>
          <div className="flex justify-between">
            <span>거래일시</span>
            <span>{r.date.replace(/-/g, "/")} {r.time}</span>
          </div>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-[11px] mb-1">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.menu}</span>
            <span className="flex-shrink-0 font-medium">{r.amount.toLocaleString()}</span>
          </div>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between font-bold">
            <span>합  계</span>
            <span>{r.amount.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>부가세</span>
            <span>{Math.round(r.amount / 11).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>카드결제</span>
            <span>{r.amount.toLocaleString()}원</span>
          </div>
        </div>
        <div className="border-t border-dashed border-gray-300 my-3" />
        <div className="text-[10px] text-gray-500 space-y-0.5 mb-3">
          <div className="flex justify-between">
            <span>카드번호</span>
            <span>****-****-****-{receiptNo(r.id).slice(4, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span>승인번호</span>
            <span>{receiptNo(r.id).slice(0, 6)}</span>
          </div>
        </div>
        <div className="border-t border-dashed border-gray-300 mb-3" />
        <p className="text-center text-[11px] text-gray-400 tracking-widest">* 감사합니다 *</p>
        <div
          className="absolute bottom-0 left-0 w-full h-2 bg-gray-50"
          style={{
            backgroundImage: "radial-gradient(circle at 6px 8px, transparent 6px, #fffef8 6px)",
            backgroundSize: "12px 8px",
          }}
        />
      </div>
    </div>
  );
}

export default function AdminReceiptsPage() {
  const { internMeals } = ADMIN_DUMMY;
  const [selectedReceipt, setSelectedReceipt] = useState<FlatReceipt | null>(null);

  const allReceipts: FlatReceipt[] = [];
  internMeals.forEach((m) => {
    m.receipts.forEach((r) => {
      allReceipts.push({ ...r, internId: m.internId });
    });
  });
  allReceipts.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100 flex items-center gap-3">
        <Link href="/admin/meals" className="text-gray-400 text-xl leading-none">‹</Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">영수증 보관함</h1>
          <p className="text-xs text-gray-400 mt-0.5">탭하면 영수증 사진 확인</p>
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {allReceipts.map((r, i) => {
            const [, m, d] = r.date.split("-");
            return (
              <button
                key={r.id}
                className={`flex items-center w-full px-4 py-3 text-left active:bg-gray-50 transition-colors ${
                  i < allReceipts.length - 1 ? "border-b border-gray-50" : ""
                }`}
                onClick={() => setSelectedReceipt(r)}
              >
                <span className="text-xs text-gray-400 flex-shrink-0 w-[80px]">
                  {parseInt(m)}/{parseInt(d)} {r.time}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate px-2">
                  {r.store}
                </span>
                <span className="text-sm font-bold text-blue-500 flex-shrink-0">
                  {r.amount.toLocaleString()}원
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 영수증 사진 바텀시트 */}
      {selectedReceipt !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="bg-gray-100 rounded-t-2xl w-full max-w-[390px] pb-10 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 bg-white rounded-t-2xl flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">영수증 사진</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedReceipt.date.replace(/-/g, "/")} {selectedReceipt.time} · {selectedReceipt.store}
                </p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl">×</button>
            </div>
            <div className="overflow-y-auto flex-1 py-4">
              <MockReceipt r={selectedReceipt} />
            </div>
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
