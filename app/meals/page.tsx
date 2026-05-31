"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getMealLimit } from "@/lib/holidays";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import WeeklyReceiptList from "@/components/WeeklyReceiptList";
import { useAuth } from "@/components/AuthProvider";
import { Check, X } from "lucide-react";


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

type ReceiptDetail = {
  id: string;
  store_name: string | null;
  paid_at: string;
  total_amount: number;
  is_lunch_time: boolean;
  status: string;
  source: string;
  image_url: string | null;
  uploader_name: string;
  items: {
    id: string;
    item_name: string;
    price: number;
    status: string;
    responded_at: string | null;
    assignee_name: string;
    assigned_user_id: string;
  }[];
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  approved: { label: "승인완료", className: "bg-green-50 text-green-600" },
  pending:  { label: "승인대기", className: "bg-yellow-50 text-yellow-600" },
  rejected: { label: "반려",     className: "bg-red-50 text-red-500" },
};

export default function MealsPage() {
  const { user } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [totalLimit, setTotalLimit] = useState(0);
  const [mealUsed, setMealUsed] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [approvingItem, setApprovingItem] = useState<PendingItem | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<ReceiptDetail | null>(null);
  const [receiptDetailLoading, setReceiptDetailLoading] = useState(false);
  const [actioning, setActioning] = useState(false);

  const mealPercent = totalLimit > 0 ? Math.round((mealUsed / totalLimit) * 100) : 0;
  const remaining = totalLimit - mealUsed;

  const fetchPending = useCallback(async () => {
    if (!user) return;
    const { data: items } = await supabase
      .from("receipt_items")
      .select("id, item_name, price, receipt_id")
      .eq("status", "pending");
    if (!items?.length) { setPendingItems([]); return; }
    const receiptIds = [...new Set(items.map((i) => i.receipt_id))];
    const { data: receiptRows } = await supabase
      .from("receipts")
      .select("id, store_name, paid_at, uploader_id")
      .in("id", receiptIds);
    const uploaderIds = [...new Set((receiptRows ?? []).map((r) => r.uploader_id))];
    const { data: uploaderRows } = uploaderIds.length > 0
      ? await supabase.from("users").select("id, name").in("id", uploaderIds)
      : { data: [] };
    setPendingItems(items.map((item) => {
      const receipt = receiptRows?.find((r) => r.id === item.receipt_id);
      const uploader = uploaderRows?.find((u) => u.id === receipt?.uploader_id);
      return {
        id: item.id,
        item_name: item.item_name,
        price: item.price,
        receipt_id: item.receipt_id,
        store_name: receipt?.store_name ?? "가맹점 미인식",
        paid_at: receipt?.paid_at ?? "",
        uploader_name: uploader?.name ?? "알 수 없음",
      };
    }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startOfMonth = year + '-' + String(month).padStart(2, '0') + '-01';
    const startOfNext = month === 12
      ? (year + 1) + '-01-01'
      : year + '-' + String(month + 1).padStart(2, '0') + '-01';

    // 한도 조회
    supabase
      .from("monthly_meal_limits")
      .select("monthly_meal_limit")
      .eq("target_month", startOfMonth)
      .maybeSingle()
      .then(({ data }) => setTotalLimit(data?.monthly_meal_limit ?? getMealLimit(year, month)));

    // 사용금액 조회
    (async () => {
      const { data: approvedReceipts } = await supabase
        .from("receipts")
        .select("id")
        .eq("status", "approved")
        .gte("paid_at", startOfMonth)
        .lt("paid_at", startOfNext);
      const receiptIds = (approvedReceipts ?? []).map((r) => r.id);
      const { data: myItems } = receiptIds.length > 0
        ? await supabase.from("receipt_items").select("price").in("receipt_id", receiptIds)
        : { data: [] };
      setMealUsed((myItems ?? []).reduce((sum, r) => sum + (r.price ?? 0), 0));
    })().catch(() => {});

    // 영수증 목록 조회
    (async () => {
      const { data: myReceiptItems } = await supabase
        .from("receipt_items")
        .select("receipt_id, price");
      const myAmountMap: Record<string, number> = {};
      for (const item of myReceiptItems ?? []) {
        myAmountMap[String(item.receipt_id)] = (myAmountMap[String(item.receipt_id)] ?? 0) + (item.price ?? 0);
      }
      const { data: rows } = await supabase
        .from("receipts")
        .select("id, store_name, paid_at, total_amount, status")
        .order("paid_at", { ascending: false });
      if (!Array.isArray(rows)) return;
      setReceipts(rows.map((r) => {
        const dt = new Date(r.paid_at);
        return {
          id: String(r.id),
          date: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'),
          time: String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0'),
          store: r.store_name ?? "가맹점 미인식",
          menu: "",
          amount: myAmountMap[String(r.id)] ?? r.total_amount ?? 0,
          status: r.status === "approved" ? "승인완료" : r.status === "rejected" ? "반려" : "승인대기",
        };
      }));
    })().catch(() => {});

    fetchPending();
  }, [user, fetchPending]);

  useEffect(() => {
    if (!approvingItem || !user) { setReceiptDetail(null); return; }
    setReceiptDetailLoading(true);
    fetch(`/api/meals/receipts/${approvingItem.receipt_id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (!data.error) setReceiptDetail(data); })
      .catch(() => {})
      .finally(() => setReceiptDetailLoading(false));
  }, [approvingItem, user]);

  const handleAction = async (itemId: string, action: "approved" | "rejected") => {
    if (!user) return;
    setActioning(true);
    try {
      const res = await fetch("/api/meals/receipts/approve", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ itemId, action }),
      });
      if (!res.ok) throw new Error();
      setReceiptDetail((prev) =>
        prev ? { ...prev, items: prev.items.map((it) => it.id === itemId ? { ...it, status: action, responded_at: new Date().toISOString() } : it) } : null
      );
      await fetchPending();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setActioning(false);
    }
  };

  const fmtDateTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
            className="w-full py-3 bg-blue-600 text-white rounded-2xl text-base font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm"
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
          <div className="absolute inset-0 bg-black/40" onClick={() => !actioning && setApprovingItem(null)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10 w-full flex flex-col" style={{ maxHeight: "80vh" }}>
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
              <p className="text-base font-bold text-gray-900">영수증 상세</p>
              <button onClick={() => !actioning && setApprovingItem(null)} className="text-gray-400 text-xl leading-none">×</button>
            </div>

            {receiptDetailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : receiptDetail ? (
              <div className="overflow-y-auto flex-1 pb-8">
                {/* 영수증 이미지 */}
                {receiptDetail.image_url && (
                  <div className="mb-4 overflow-hidden">
                    <img src={receiptDetail.image_url} alt="영수증" className="w-full object-contain max-h-56" />
                  </div>
                )}
                <div className="px-5">
                {/* 기본 정보 */}
                <div className="flex items-start justify-between mb-0.5">
                  <p className="text-base font-bold text-gray-900">{receiptDetail.store_name ?? "가맹점 미인식"}</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-2 flex-shrink-0 ${STATUS_LABEL[receiptDetail.status]?.className ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABEL[receiptDetail.status]?.label ?? receiptDetail.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">{fmtDateTime(receiptDetail.paid_at)}</p>

                <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">등록자</span>
                    <span className="font-medium text-gray-700">{receiptDetail.uploader_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">입력 방식</span>
                    <span className={`font-medium ${receiptDetail.source === "ocr" ? "text-green-600" : "text-gray-700"}`}>
                      {receiptDetail.source === "ocr" ? "OCR 인식" : "수기 입력"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">점심 시간</span>
                    <span className={`font-medium ${receiptDetail.is_lunch_time ? "text-green-600" : "text-orange-500"}`}>
                      {receiptDetail.is_lunch_time ? "시간 내 결제" : "시간 외 결제"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-2 mt-1">
                    <span className="font-semibold text-gray-700">합계</span>
                    <span className="font-bold text-gray-900">{receiptDetail.total_amount.toLocaleString()}원</span>
                  </div>
                </div>

                {/* 항목 내역 */}
                <p className="text-sm font-semibold text-gray-800 mb-2">항목 내역 ({receiptDetail.items.length}건)</p>
                <div className="flex flex-col gap-2">
                  {receiptDetail.items.map((item) => {
                    const st = STATUS_LABEL[item.status] ?? { label: item.status, className: "bg-gray-100 text-gray-500" };
                    const isPending = item.status === "pending" && item.assigned_user_id === user?.id;
                    return (
                      <div key={item.id} className={`rounded-xl p-3.5 border ${isPending ? "border-orange-100 bg-orange-50/40" : "border-gray-100 bg-white"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                          <p className="text-sm font-bold text-gray-900">{item.price.toLocaleString()}원</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">담당자: {item.assignee_name}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                        </div>
                        {item.responded_at && (
                          <p className="text-xs text-gray-300 mt-1">{fmtDateTime(item.responded_at)} 응답</p>
                        )}
                        {isPending && (
                          <div className="mt-3">
                            <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(item.id, "approved")}
                              disabled={actioning || item.price > remaining}
                              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                            >
                              {actioning ? (
                                <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "white", borderTopColor: "transparent" }} />
                              ) : (
                                <><Check size={13} />승인</>
                              )}
                            </button>
                            <button
                              onClick={() => handleAction(item.id, "rejected")}
                              disabled={actioning}
                              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <X size={13} />
                              반려
                            </button>
                            </div>
                            {item.price > remaining && (
                              <p className="text-xs text-red-400 mt-1.5">
                                식대 금액이 잔여 한도({remaining.toLocaleString()}원)를 초과합니다
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
