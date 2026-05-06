"use client"
import AppBar from "@/components/AppBar"
import { useState } from "react"

const TEAM_MEMBERS = ["선택", "김○○", "이○○", "박○○", "최○○", "정○○"]

type MenuItem = {
  name: string
  unitPrice: number
  qty: number
  total: number
  assignee: string
}

type OcrResult = {
  storeName: string
  paidAt: string
  items: MenuItem[]
  totalAmount: number
  isLunchTime: boolean
}

type Status = "idle" | "loading" | "done" | "error"

export default function OcrPage() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<OcrResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhoto(URL.createObjectURL(file))
    setResult(null)
    setStatus("loading")
    setErrorMsg("")

    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/meals/ocr", { method: "POST", body: formData })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "인식 실패" }))
        throw new Error(error.error)
      }

      const data = await res.json()
      const itemsWithAssignee = data.items.map((item: Omit<MenuItem, "assignee">) => ({
        ...item,
        assignee: "",
      }))

      setResult({ ...data, items: itemsWithAssignee })
      setStatus("done")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "인식에 실패했습니다")
      setStatus("error")
    }
  }

  const updateAssignee = (index: number, assignee: string) => {
    if (!result) return
    const items = result.items.map((item, i) =>
      i === index ? { ...item, assignee } : item
    )
    setResult({ ...result, items })
  }

  const formatPaidAt = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
    } catch {
      return iso
    }
  }

  const canSubmit =
    status === "done" &&
    result &&
    result.items.length > 0 &&
    result.items.every((i) => i.assignee && i.assignee !== "선택")

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="영수증 등록" />

      <div className="flex flex-col gap-3 px-4 pt-5 pb-8">
        {/* 사진 영역 */}
        <label className="cursor-pointer block">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {photo ? (
              <img src={photo} alt="영수증" className="w-full h-52 object-cover" />
            ) : (
              <div className="h-52 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-green-500 flex items-center justify-center text-2xl">
                  📷
                </div>
                <p className="text-sm font-medium text-gray-700">영수증 사진 촬영</p>
                <p className="text-xs text-gray-400">탭하여 카메라 열기</p>
              </div>
            )}
          </div>
        </label>

        {status === "loading" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">영수증 인식 중...</span>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-500 text-center">
            {errorMsg || "인식에 실패했습니다. 다시 시도해주세요."}
          </div>
        )}

        {status === "done" && result && (
          <>
            {/* 가맹점 + 결제일시 */}
            <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{result.storeName || "가맹점 미인식"}</p>
                <p className="text-sm font-semibold text-gray-800">{formatPaidAt(result.paidAt)}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                OCR 인식 완료
              </span>
            </div>

            {/* 메뉴 항목 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">메뉴 항목 ({result.items.length}건)</p>
                <p className="text-sm font-bold text-gray-800">{result.totalAmount.toLocaleString()}원</p>
              </div>

              {result.items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">메뉴 항목을 인식하지 못했습니다</p>
              ) : (
                result.items.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0 ${
                      item.assignee && item.assignee !== "선택" ? "bg-green-50/40" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        {item.qty > 1 && (
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                            ×{item.qty}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.unitPrice.toLocaleString()}원
                        {item.qty > 1 && ` × ${item.qty} = ${item.total.toLocaleString()}원`}
                      </p>
                    </div>
                    <select
                      value={item.assignee || "선택"}
                      onChange={(e) => updateAssignee(i, e.target.value)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border outline-none appearance-none cursor-pointer transition-colors ${
                        item.assignee && item.assignee !== "선택"
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}
                    >
                      {TEAM_MEMBERS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* 점심 시간 검증 */}
            <div className={`rounded-2xl px-4 py-3 flex items-center gap-2 text-sm ${
              result.isLunchTime ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-600"
            }`}>
              <span>{result.isLunchTime ? "🕐" : "⚠️"}</span>
              <div>
                <p className="font-medium">{result.isLunchTime ? "점심 시간 검증 통과" : "점심 시간 외 결제"}</p>
                <p className="text-xs mt-0.5 opacity-70">11:30~14:00 사이에 결제됨</p>
              </div>
            </div>
          </>
        )}

        <button
          disabled={!canSubmit}
          className="w-full py-4 bg-green-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:active:scale-100"
        >
          저장 및 승인 요청
        </button>
      </div>
    </div>
  )
}
