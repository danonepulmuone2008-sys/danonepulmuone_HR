"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import AppBar from "@/components/AppBar";
import { supabase } from "@/lib/supabase";

type Entry = { date: string; label: string; amount: number; kind: "grant" | "usage" | "transfer_in" | "transfer_out" };
type Employee = { id: string; name: string };

const KIND_COLOR: Record<string, string> = {
  grant: "text-blue-500",
  usage: "text-gray-700",
  transfer_in: "text-green-600",
  transfer_out: "text-orange-500",
};
const KIND_SIGN: Record<string, string> = {
  grant: "+", usage: "-", transfer_in: "+", transfer_out: "-",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function MealHistoryPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries]           = useState<Entry[]>([]);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [totalUsed, setTotalUsed]       = useState(0);
  const [remaining, setRemaining]       = useState(0);
  const [loading, setLoading]           = useState(true);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSent, setTransferSent] = useState(false);
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [toUserId, setToUserId]         = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  const fetchHistory = async () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`/api/meals/history?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setMonthlyLimit(data.monthlyLimit ?? 0);
        setTotalUsed(data.totalUsed ?? 0);
        setRemaining(data.remaining ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [user, year, month]);

  useEffect(() => {
    if (!showTransferModal || !user) return;
    supabase
      .from("users")
      .select("id, name")
      .eq("role", "employee")
      .eq("is_active", true)
      .neq("id", user.id)
      .order("name")
      .then(({ data }) => setEmployees(data ?? []));
  }, [showTransferModal, user]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const handleTransfer = async () => {
    if (!user?.token || !toUserId || !transferAmount) return;
    const amount = parseInt(transferAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) return;
    setTransferring(true);
    try {
      const res = await fetch("/api/meals/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ toUserId, amount, note: transferNote || null }),
      });
      if (!res.ok) { alert("양도 요청에 실패했습니다."); return; }
      setTransferSent(true);
      await fetchHistory();
    } finally {
      setTransferring(false);
    }
  };

  const closeModal = () => {
    setShowTransferModal(false);
    setTransferSent(false);
    setToUserId(""); setTransferAmount(""); setTransferNote("");
  };

  const totalTransferIn  = entries.filter(e => e.kind === "transfer_in").reduce((s, e) => s + e.amount, 0);
  const totalTransferOut = entries.filter(e => e.kind === "transfer_out").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="식대 내역" />

      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-5 py-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">‹</button>
        <span className="text-sm font-semibold text-gray-700">{year}년 {month}월</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">›</button>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-3 pb-10">
        {/* 요약 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">한도</span>
            <span className="font-medium text-gray-700">{monthlyLimit.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">사용</span>
            <span className="font-medium text-red-400">-{totalUsed.toLocaleString()}원</span>
          </div>
          {totalTransferIn > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">양도 받음</span>
              <span className="font-medium text-green-600">+{totalTransferIn.toLocaleString()}원</span>
            </div>
          )}
          {totalTransferOut > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">양도 보냄</span>
              <span className="font-medium text-orange-500">-{totalTransferOut.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-0.5">
            <span className="font-semibold text-gray-700">잔여</span>
            <span className="font-bold text-blue-600">{remaining.toLocaleString()}원</span>
          </div>
        </div>

        {/* 양도하기 버튼 */}
        <button
          onClick={() => setShowTransferModal(true)}
          className="w-full py-3 rounded-2xl border border-blue-200 text-blue-600 text-sm font-semibold active:scale-[0.98] transition-all"
        >
          식대 양도하기
        </button>

        {/* 내역 목록 */}
        {loading ? (
          <div className="bg-white rounded-2xl p-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-400">내역이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{entry.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(entry.date)}</p>
                </div>
                <span className={`text-sm font-bold ${KIND_COLOR[entry.kind]}`}>
                  {KIND_SIGN[entry.kind]}{entry.amount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 양도 완료 다이얼로그 */}
      {transferSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-[280px] px-6 py-8 flex flex-col items-center gap-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold text-gray-800">요청이 완료되었습니다</p>
            <p className="text-xs text-gray-400">상대방이 수락하면 식대가 양도됩니다</p>
            <button onClick={closeModal} className="mt-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold">확인</button>
          </div>
        </div>
      )}

      {/* 양도 입력 모달 */}
      {showTransferModal && !transferSent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-t-2xl w-full max-w-[390px] flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <p className="text-base font-bold text-gray-900">식대 양도</p>
              <button onClick={closeModal} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pt-4 pb-8 flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">받는 사람</p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {employees.map((emp) => (
                    <button key={emp.id} onClick={() => setToUserId(emp.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${toUserId === emp.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${toUserId === emp.id ? "bg-blue-500" : "bg-gray-300"}`}>
                        {emp.name[0]}
                      </div>
                      <span className={`text-sm font-medium ${toUserId === emp.id ? "text-blue-700" : "text-gray-700"}`}>{emp.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">양도 금액</p>
                <div className="relative">
                  <input type="text" inputMode="numeric" value={transferAmount}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setTransferAmount(v ? Number(v).toLocaleString() : ""); }}
                    placeholder="0" className="w-full h-11 px-4 pr-8 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">잔여 한도: {remaining.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">메모 (선택)</p>
                <input type="text" value={transferNote} onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="메모를 입력하세요" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50" />
              </div>
              <button onClick={handleTransfer} disabled={!toUserId || !transferAmount || transferring}
                className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
                {transferring ? "요청 중..." : "양도 요청"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
