"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminBottomNav from "@/components/AdminBottomNav";
import { getMonthlyBusinessDays } from "@/lib/holidays";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

const now = new Date();

const INTERN_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626", "#FF7A00", "#1A2D6E", "#00B4A6", "#FFB6C8"];

interface LimitInfo {
  source: "db" | "calculated";
  monthlyLimit: number;
  dailyLimit: number;
  businessDays: number;
  holidayCount: number;
}

interface User {
  id: string;
  name: string;
  used: number;
}

interface Receipt {
  id: string;
  store_name: string;
  paid_at: string;
  total_amount: number;
  my_amount: number;
  status: string;
  items: ReceiptItem[];
}

interface ReceiptItem {
  id: string;
  item_name: string;
  unit_price: number;
  qty: number;
  price: number;
  status: string;
}

export default function AdminMealsPage() {
  const { user: authUser } = useAuth();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  function navigatePrev() {
    setViewYear((y) => viewMonth === 1 ? y - 1 : y);
    setViewMonth((m) => m === 1 ? 12 : m - 1);
    closeSheet();
  }
  function navigateNext() {
    setViewYear((y) => viewMonth === 12 ? y + 1 : y);
    setViewMonth((m) => m === 12 ? 1 : m + 1);
    closeSheet();
  }

  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const [limitLoading, setLimitLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showNumericAlert, setShowNumericAlert] = useState(false);
  function alertNumeric() { setShowNumericAlert(true); }

  const [changingItemStatusId, setChangingItemStatusId] = useState<string | null>(null);

  async function changeItemStatus(receiptId: string, itemId: string, itemStatus: "approved" | "rejected" | "pending") {
    const token = await getToken();
    if (!token) return;
    setChangingItemStatusId(itemId);
    try {
      const res = await fetch(`/api/admin/meals/receipts/${receiptId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemStatus }),
      });
      if (!res.ok) return;
      setReceipts((prev) =>
        prev.map((r) =>
          r.id !== receiptId ? r : {
            ...r,
            items: r.items.map((i) => i.id === itemId ? { ...i, status: itemStatus } : i),
          }
        )
      );
    } finally {
      setChangingItemStatusId(null);
    }
  }

  // 한도 편집 상태
  const [showLimitEdit, setShowLimitEdit] = useState(false);
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [editBusinessDays, setEditBusinessDays] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);

  const fetchLimit = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLimitLoading(true);
    try {
      const res = await fetch(`/api/admin/meals/limit?year=${viewYear}&month=${viewMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLimitInfo(await res.json());
    } finally {
      setLimitLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (!authUser) return;
    fetchLimit();
    (async () => {
      setUsersLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`/api/admin/users?year=${viewYear}&month=${viewMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setUsers(await res.json());
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [authUser?.id, viewYear, viewMonth, fetchLimit]);

  const fetchReceipts = useCallback(async (userId: string) => {
    const token = await getToken();
    if (!token) return;
    setReceiptsLoading(true);
    setReceipts([]);
    try {
      const res = await fetch(
        `/api/admin/meals/receipts?userId=${userId}&year=${viewYear}&month=${viewMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setReceipts(await res.json());
    } finally {
      setReceiptsLoading(false);
    }
  }, [viewYear, viewMonth]);

  function openSheet(userId: string) {
    setSelectedUserId(userId);
    setEditingId(null);
    fetchReceipts(userId);
  }

  function closeSheet() {
    setSelectedUserId(null);
    setEditingId(null);
    setReceipts([]);
  }

function startEditItem(item: ReceiptItem) {
  setEditingId(item.id);
  setEditValue(String(item.price ?? 0));
}

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

async function saveItemAmount(receiptId: string, itemId: string) {
  const amount = Number(editValue.replace(/,/g, ""));
  if (isNaN(amount) || amount < 0) return;

  const token = await getToken();
  if (!token) return;

  const targetReceipt = receipts.find((r) => r.id === receiptId);
  const targetItem = targetReceipt?.items.find((item) => item.id === itemId);
  const oldAmount = targetItem?.price ?? 0;
  const qty = targetItem?.qty && targetItem.qty > 0 ? targetItem.qty : 1;
  const unitPrice = Math.round(amount / qty);
  const diff = amount - oldAmount;

  setSavingId(itemId);

  try {
    const res = await fetch(`/api/admin/meals/receipts/${receiptId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId,
        price: amount,
      }),
    });

    if (!res.ok) return;

    const { new_total_amount } = await res.json();

    setReceipts((prev) =>
      prev.map((receipt) => {
        if (receipt.id !== receiptId) return receipt;

        return {
          ...receipt,
          total_amount: new_total_amount ?? receipt.total_amount + diff,
          my_amount: receipt.my_amount + diff,
          items: receipt.items.map((item) =>
            item.id === itemId
              ? { ...item, price: amount, unit_price: unitPrice }
              : item
          ),
        };
      })
    );

    if (selectedUserId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserId ? { ...u, used: u.used + diff } : u
        )
      );
    }

    setEditingId(null);
    setEditValue("");
  } finally {
    setSavingId(null);
  }
}

  function openLimitEdit() {
    if (!limitInfo) return;
    setEditDailyLimit(String(limitInfo.dailyLimit));
    setEditBusinessDays(String(limitInfo.businessDays));
    setShowLimitEdit(true);
  }

  async function saveLimit() {
    const token = await getToken();
    if (!token) return;
    const dailyLimit   = Number(editDailyLimit);
    const businessDays = Number(editBusinessDays);
    if (!dailyLimit || !businessDays) return;
    setSavingLimit(true);
    try {
      const res = await fetch("/api/admin/meals/limit", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ year: viewYear, month: viewMonth, dailyLimit, businessDays }),
      });
      if (!res.ok) return;
      await fetchLimit();
      setShowLimitEdit(false);
    } finally {
      setSavingLimit(false);
    }
  }

  const totalLimit = limitInfo?.monthlyLimit ?? 0;
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const previewLimit = Number(editDailyLimit) * Number(editBusinessDays);

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">식대 관리</h1>
          <Link href="/admin/meals/receipts">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <span className="text-base leading-none">🧾</span>
              <span>영수증 보관함</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={navigatePrev}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800 w-24 text-center">
            {viewYear}년 {viewMonth}월
          </span>
          <button
            onClick={navigateNext}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          >
            ›
          </button>
        </div>
      </header>

      {/* 이달 식대 한도 카드 */}
      <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
        {limitLoading ? (
          <div className="h-12 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">
                {viewMonth}월 식대 한도
                {limitInfo?.source === "calculated" && (
                  <span className="ml-1.5 text-orange-400">자동 계산</span>
                )}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {totalLimit.toLocaleString()}원
              </p>
              {limitInfo && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {limitInfo.dailyLimit.toLocaleString()}원 × {limitInfo.businessDays}일
                </p>
              )}
            </div>
            <button
              onClick={openLimitEdit}
              className="flex items-center gap-1 text-xs text-blue-500 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              ✏️ 수정
            </button>
          </div>
        )}
      </div>

      {/* 인턴별 카드 */}
      <div className="flex flex-col gap-2 px-4 pt-2">
        {usersLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 h-24 animate-pulse" />
          ))
        ) : (
          users.map((user, i) => {
            const remaining = totalLimit - user.used;
            const pct = totalLimit > 0 ? Math.min(Math.round((user.used / totalLimit) * 100), 100) : 0;
            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => openSheet(user.id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{ backgroundColor: INTERN_HEX[i % INTERN_HEX.length] }}
                    >
                      {user.name.slice(0, 1)}
                    </div>
                    <p className="text-base font-bold text-gray-900">{user.name}</p>
                  </div>
                  <span className="text-xs text-gray-400">{pct}% 사용</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.used.toLocaleString()}원</p>
                    <p className="text-xs text-gray-400">사용</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{remaining.toLocaleString()}원</p>
                    <p className="text-xs text-gray-400">잔여</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ backgroundColor: INTERN_HEX[i % INTERN_HEX.length], width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">한도 {totalLimit.toLocaleString()}원</p>
              </div>
            );
          })
        )}
      </div>

      {/* 영수증 내역 바텀시트 */}
      {selectedUserId !== null && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-8"
          onClick={closeSheet}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10 flex flex-col"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedUser.name} 영수증 내역</h3>
                <p className="text-xs text-gray-400 mt-0.5">{viewYear}년 {viewMonth}월</p>
              </div>
              <button onClick={closeSheet} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl hover:text-gray-600">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pt-4 pb-2">
              {receiptsLoading ? (
                <div className="flex flex-col gap-3 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">내역이 없습니다</p>
              ) : (
<div className="flex flex-col gap-3">
  {receipts.map((r) => {
    const d = new Date(r.paid_at);
    const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    return (
      <div
        key={r.id}
        className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400">
            {dateStr} {timeStr}
          </p>

          <div className="flex items-start justify-between gap-3 mt-0.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {r.store_name}
              </p>
              <span className={`text-xs mt-0.5 block ${
                r.status === "approved" ? "text-green-500"
                : r.status === "rejected" ? "text-red-400"
                : "text-orange-400"
              }`}>
                {r.status === "approved" ? "승인완료" : r.status === "rejected" ? "반려" : "승인대기"}
              </span>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">영수증 총액</p>
              <p className="text-sm font-bold text-gray-800">
                {r.total_amount.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-1">
            담당 항목
          </p>

          {r.items.map((item) => {
            const isEditing = editingId === item.id;
            const isSaving = savingId === item.id;

            return (
              <div
                key={item.id}
                className="py-2 border-b border-gray-50 last:border-b-0"
              >
                {/* 상단: 이름 + 금액/편집 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(item.unit_price ?? 0).toLocaleString()}원 × {item.qty ?? 1}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editValue}
                          onChange={(e) => {
                            if (/\D/.test(e.target.value)) {
                              alertNumeric();
                            } else {
                              setEditValue(e.target.value);
                            }
                          }}
                          className="w-24 h-8 px-2 text-sm text-right border border-blue-300 rounded-lg outline-none focus:border-blue-500 bg-blue-50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveItemAmount(r.id, item.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <button
                          onClick={() => saveItemAmount(r.id, item.id)}
                          disabled={isSaving}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-500 text-white font-medium disabled:opacity-50"
                        >
                          {isSaving ? "…" : "저장"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-green-500">
                          {(item.price ?? 0).toLocaleString()}원
                        </p>
                        <button
                          onClick={() => startEditItem(item)}
                          className="text-gray-300 hover:text-gray-500 text-sm"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 하단: 상태 + 승인/반려 버튼 */}
                {!isEditing && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs ${
                      item.status === "approved" ? "text-green-500"
                      : item.status === "rejected" ? "text-red-400"
                      : "text-orange-400"
                    }`}>
                      {item.status === "approved" ? "승인완료" : item.status === "rejected" ? "반려" : "승인대기"}
                    </span>
                    <button
                      onClick={() => changeItemStatus(r.id, item.id, "approved")}
                      disabled={item.status === "approved" || changingItemStatusId === item.id}
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium transition-colors disabled:opacity-40 ${
                        item.status === "approved"
                          ? "bg-green-500 text-white border-green-500"
                          : "border-green-400 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      승인
                    </button>
                    <button
                      onClick={() => changeItemStatus(r.id, item.id, "rejected")}
                      disabled={item.status === "rejected" || changingItemStatusId === item.id}
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium transition-colors disabled:opacity-40 ${
                        item.status === "rejected"
                          ? "bg-red-500 text-white border-red-500"
                          : "border-red-400 text-red-400 hover:bg-red-50"
                      }`}
                    >
                      반려
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">담당 합계</span>
          <span className="text-sm font-bold text-green-600">
            {r.my_amount.toLocaleString()}원
          </span>
        </div>
      </div>
    );
  })}
</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 식대 한도 수정 바텀시트 */}
      {showLimitEdit && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-12"
          onClick={() => !savingLimit && setShowLimitEdit(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] flex flex-col"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900">{viewYear}년 {viewMonth}월 식대 한도 설정</h3>
              <button onClick={() => setShowLimitEdit(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl">×</button>
            </div>

            <div className="px-5 pt-4 flex flex-col gap-4 overflow-y-auto flex-1 pb-10">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">하루 식대 한도</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editDailyLimit}
                    onChange={(e) => { if (/\D/.test(e.target.value)) { alertNumeric(); } else { setEditDailyLimit(e.target.value); } }}
                    className="w-full h-11 px-4 pr-8 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50"
                    placeholder="10000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">영업일 수</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editBusinessDays}
                    onChange={(e) => { if (/\D/.test(e.target.value)) { alertNumeric(); } else { setEditBusinessDays(e.target.value); } }}
                    className="w-full h-11 px-4 pr-8 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50"
                    placeholder={String(getMonthlyBusinessDays(viewYear, viewMonth))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">일</span>
                </div>
              </div>

              {editDailyLimit && editBusinessDays && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-blue-600">
                    {Number(editDailyLimit).toLocaleString()}원 × {editBusinessDays}일
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    = {previewLimit.toLocaleString()}원
                  </span>
                </div>
              )}

              <button
                onClick={saveLimit}
                disabled={savingLimit || !editDailyLimit || !editBusinessDays}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                style={{ backgroundColor: "#8dc63f" }}
              >
                {savingLimit ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNumericAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-8">
          <div className="bg-white rounded-2xl w-full max-w-[300px] overflow-hidden shadow-xl">
            <div className="px-6 pt-6 pb-4 text-center">
              <p className="text-sm text-gray-500">숫자만 입력해주세요</p>
            </div>
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowNumericAlert(false)}
                className="w-full h-12 text-sm font-semibold"
                style={{ color: "#8dc63f" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
