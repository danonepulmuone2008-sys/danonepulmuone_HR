"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import AdminBottomNav from "@/components/AdminBottomNav"

const STATUS_LABEL: Record<string, string> = {
  approved: "승인완료",
  pending: "승인대기",
  rejected: "반려",
}
const STATUS_COLOR: Record<string, string> = {
  approved: "text-green-500",
  pending: "text-orange-400",
  rejected: "text-red-400",
}

interface ReceiptSummary {
  id: string
  store_name: string
  paid_at: string
  total_amount: number
  status: string
  uploader_name: string
  extra_assignee_count: number
}

export default function AdminReceiptsArchivePage() {
  const router = useRouter()
  const { user: authUser } = useAuth()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReceipts = useCallback(async () => {
    if (!authUser?.token) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/meals/receipts?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${authUser.token}` } }
      )
      if (res.ok) setReceipts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [authUser?.token, year, month])

  useEffect(() => { fetchReceipts() }, [fetchReceipts])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-gray-500 text-2xl leading-none"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold text-gray-900">영수증 보관함</h1>
      </header>

      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">‹</button>
        <span className="text-sm font-semibold text-gray-700">{year}년 {month}월</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">›</button>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
          ))
        ) : receipts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">영수증이 없습니다</p>
        ) : (
          receipts.map((r) => {
            const d = new Date(r.paid_at)
            const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => router.push(`/admin/meals/receipts/${r.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    {dateStr} · {r.uploader_name}{r.extra_assignee_count > 0 ? ` 외 ${r.extra_assignee_count}명` : ""}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{r.store_name}</p>
                  <span className={`text-xs ${STATUS_COLOR[r.status] ?? "text-gray-400"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <p className="text-base font-bold text-gray-800">{r.total_amount.toLocaleString()}원</p>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
