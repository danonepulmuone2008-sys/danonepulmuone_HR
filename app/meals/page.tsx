"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import WeeklyReceiptList from "@/components/WeeklyReceiptList";
import { getMealLimit } from "@/lib/holidays";
import { useAuth } from "@/components/AuthProvider";
import { Check, X } from "lucide-react";

const BRAND = "#72BF44";

type Receipt = {
  id: string;
  date: string;
  time: string;
  store: string;
  menu: string;
  amount: number;
  status: string;
};

type PendingItem = {
  id: string;
  item_name: string;
  price: number;
  receipt_id: string;
  store_name: string;
  paid_at: string;
  uploader_name: string;
};

export default function MealsPage() {
  const { user } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const totalLimit = getMealLimit(year, month);

  const [mealUsed, setMealUsed] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [approvingItem, setApprovingItem] = useState<PendingItem | null>(null);
  const [actioning, setActioning] = useState(false);

  const mealPercent = Math.round((mealUsed / totalLimit) * 100);
  const remaining = totalLimit - mealUsed;

  const fetchPending = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/meals/pending", {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!res.ok) { setPendingItems([]); return; }
    const data = await res.json();
    setPendingItems(Array.isArray(data) ? data : []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/meals/usage", {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.used !== undefined) setMealUsed(data.used); })
      .catch(() => {});

    fetch("/api/meals/receipts", {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then((rows: { id: string; store_name: string | null; paid_at: string; my_amount: number; status: string }[]) => {
        if (!Array.isArray(rows)) return;
        setReceipts(rows.map((r) => {
          const dt = new Date(r.paid_at);
          return {
            id: r.id,
            date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
            time: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
            store: r.store_name ?? "가맹점 미인식",
            menu: "",
            amount: r.my_amount ?? 0,
            status: r.status === "approved" ? "승인완료" : r.status === "rejected" ? "반려" : "승인대기",
          };
        }));
      })
      .catch(() => {});

    fetchPending();
  }, [user, fetchPending]);

  const handleAction = async (action: "approved" | "rejected") => {
    if (!approvingItem || !user) return;
    setActioning(true);
    try {
      const res = await fetch("/api/meals/receipts/approve", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ itemId: approvingItem.id, action }),
      });
      if (!res.ok) throw new Error();
      setApprovingItem(null);
      await fetchPending();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setActioning(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">식대 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">{year}년 {month}월</p>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-3">
        {/* 승인 대기 섹션 */}
        {pendingItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-50 bg-orange-50">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <p className="text-sm font-semibold text-orange-700">
                승인 대기 {pendingItems.length}건
              </p>
            </div>
            {pendingItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setApprovingItem(item)}
                className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0 active:bg-gray-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.store_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(item.paid_at)} · {item.uploader_name} 요청
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {item.price.toLocaleString()}원
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                    대기
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 한도 시각화 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xl font-extrabold text-blue-500 mb-0.5">
            {year}년 {month}월
          </p>
          <p className="text-xs text-gray-900 mb-4">한도 {totalLimit.toLocaleString()}원</p>
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-base font-semibold text-gray-900">{mealUsed.toLocaleString()}원</p>
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
              style={{ width: `${Math.min(mealPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-end mt-2">
            <p className="text-xs text-gray-400">{mealPercent}% 사용</p>
          </div>
        </div>

        {/* OCR 등록 버튼 */}
        <Link href="/meals/ocr">
          <button
            className="w-full py-3 text-white rounded-2xl text-base font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm"
            style={{ background: BRAND }}
          >
            영수증 등록
          </button>
        </Link>

        {/* 세부 내역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <WeeklyReceiptList receipts={receipts} />
        </div>
      </div>

      <BottomNav />

      {/* 승인 모달 */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !actioning && setApprovingItem(null)}
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10 w-full">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 pt-3 pb-6">
              <p className="text-base font-bold text-gray-900 mb-1">{approvingItem.store_name}</p>
              <p className="text-xs text-gray-400 mb-5">
                {approvingItem.uploader_name}님이 식대 승인을 요청했습니다
              </p>

              <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">날짜</span>
                  <span className="text-xs font-medium text-gray-700">{formatDate(approvingItem.paid_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">항목</span>
                  <span className="text-xs font-medium text-gray-700">{approvingItem.item_name}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                  <span className="text-sm font-semibold text-gray-700">금액</span>
                  <span className="text-sm font-bold text-gray-900">
                    {approvingItem.price.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction("rejected")}
                  disabled={actioning}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <X size={15} />
                  반려
                </button>
                <button
                  onClick={() => handleAction("approved")}
                  disabled={actioning}
                  className="flex-[2] py-3.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: BRAND }}
                >
                  {actioning ? (
                    <span
                      className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{ borderColor: "white", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <>
                      <Check size={15} />
                      승인
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
