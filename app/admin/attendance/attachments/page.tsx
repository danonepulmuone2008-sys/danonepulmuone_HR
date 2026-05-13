"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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

interface AttachmentItem {
  id: string
  user_name: string
  type: string
  start_date: string
  end_date: string
  status: string
  created_at: string
  attachment_url: string
}

async function downloadFile(url: string, filename?: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = filename ?? url.split("/").pop() ?? "attachment"
  a.click()
  URL.revokeObjectURL(blobUrl)
}

function FileViewerModal({ url, meta, onClose }: { url: string; meta?: { date: string; name: string }; onClose: () => void }) {
  const isPdf = url.toLowerCase().includes(".pdf")
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-[390px] overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">첨부파일</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ext = url.split(".").pop() ?? "png";
                const filename = meta ? `${meta.date}_${meta.name}.${ext}` : url.split("/").pop() ?? "attachment";
                downloadFile(url, filename);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#8dc63f] text-white text-xs font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              저장
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 overflow-auto" style={{ maxHeight: "78vh" }}>
          {isPdf ? (
            <iframe src={url} className="w-full rounded-xl border border-gray-100" style={{ minHeight: "65vh" }} />
          ) : (
            <img src={url} alt="첨부파일" className="max-w-full object-contain rounded-xl" style={{ maxHeight: "68vh" }} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AttendanceAttachmentsPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [items, setItems] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [viewMeta, setViewMeta] = useState<{ date: string; name: string } | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setItems([])
    try {
      const res = await fetch(`/api/admin/attendance/attachments?year=${year}&month=${month}`)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchItems() }, [fetchItems])

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
      {viewUrl && <FileViewerModal url={viewUrl} meta={viewMeta ?? undefined} onClose={() => { setViewUrl(null); setViewMeta(null); }} />}

      <header className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-gray-500 text-2xl leading-none"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold text-gray-900">첨부파일 보관함</h1>
      </header>

      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">‹</button>
        <span className="text-sm font-semibold text-gray-700">{year}년 {month}월</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 text-2xl leading-none">›</button>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
          ))
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">첨부파일이 없습니다</p>
        ) : (
          items.map((item) => {
            const d = new Date(item.created_at)
            const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
            const periodStr = item.start_date === item.end_date
              ? item.start_date
              : `${item.start_date} ~ ${item.end_date}`
            return (
              <button
                key={item.id}
                onClick={() => {
                  setViewUrl(item.attachment_url);
                  setViewMeta({ date: item.created_at.slice(0, 10), name: item.user_name });
                }}
                className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center justify-between gap-3 active:scale-[0.98] transition-all text-left w-full"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{dateStr} · {item.user_name}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                    {item.type} · {periodStr}
                  </p>
                  <span className={`text-xs ${STATUS_COLOR[item.status] ?? "text-gray-400"}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-blue-400">파일 보기</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
