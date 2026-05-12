"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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

interface ReceiptItem {
  id: string
  item_name: string
  unit_price: number
  qty: number
  price: number
  assignee_name: string
  status: string
}

interface ReceiptDetail {
  id: string
  store_name: string
  paid_at: string
  total_amount: number
  status: string
  uploader_name: string
  items: ReceiptItem[]
}

export default function AdminReceiptDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user: authUser } = useAuth()

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser?.token || !id) return
    setLoading(true)
    fetch(`/api/admin/meals/receipts/${id}`, {
      headers: { Authorization: `Bearer ${authUser.token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setReceipt(data) })
      .finally(() => setLoading(false))
  }, [authUser?.token, id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
        <header className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-gray-500 text-2xl leading-none">‹</button>
          <div className="h-5 w-36 bg-gray-100 rounded-lg animate-pulse" />
        </header>
        <div className="px-4 pt-3 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-16 border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="flex flex-col min-h-screen pb-20 bg-gray-50 items-center justify-center gap-3">
        <p className="text-sm text-gray-400">영수증을 불러오지 못했습니다</p>
        <button onClick={() => router.back()} className="text-sm text-blue-500">뒤로가기</button>
      </div>
    )
  }

  const d = new Date(receipt.paid_at)
  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-gray-500 text-2xl leading-none">‹</button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{receipt.store_name}</h1>
      </header>

      <div className="px-4 pt-3 flex flex-col gap-3">
        {/* 영수증 요약 */}
        <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400">{dateStr}</p>
              <p className="text-xs text-gray-400 mt-0.5">업로드: {receipt.uploader_name}</p>
              <span className={`text-xs mt-1 block ${STATUS_COLOR[receipt.status] ?? "text-gray-400"}`}>
                {STATUS_LABEL[receipt.status] ?? receipt.status}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{receipt.total_amount.toLocaleString()}원</p>
          </div>
        </div>

        {/* 항목 목록 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">항목별 내역</h2>
          </div>
          {receipt.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">항목이 없습니다</p>
          ) : (
            receipt.items.map((item, i) => (
              <div
                key={item.id}
                className={`px-4 py-3 flex items-center justify-between gap-3 ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.item_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(item.unit_price ?? 0).toLocaleString()}원 × {item.qty ?? 1} · {item.assignee_name}
                  </p>
                  <span className={`text-xs ${STATUS_COLOR[item.status] ?? "text-gray-400"}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-800 shrink-0">{(item.price ?? 0).toLocaleString()}원</p>
              </div>
            ))
          )}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">합계</span>
            <span className="text-sm font-bold text-gray-900">{receipt.total_amount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <AdminBottomNav />
    </div>
  )
}
