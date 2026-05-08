"use client"
import AppBar from "@/components/AppBar"
import { useState } from "react"
import { useAuth } from "@/components/AuthProvider"

const BRAND = "#72BF44"

const TEAM_MEMBERS = [
  { id: "user-001", name: "조현희", department: "HR" },
  { id: "user-002", name: "김풀무", department: "인사팀" },
  { id: "user-003", name: "이무원", department: "개발팀" },
  { id: "user-004", name: "박팀장", department: "개발팀" },
  { id: "user-005", name: "최이사", department: "경영지원" },
]

type CurrentUser = { id: string; name: string; department: string; token: string }

type MenuItem = {
  name: string
  unitPrice: number
  qty: number
  total: number
  assigneeId: string  // user_id 저장 (이름 X)
}

type OcrResult = {
  storeName: string
  paidAt: string
  items: MenuItem[]
  totalAmount: number
  isLunchTime: boolean
  storagePath: string
}

type ManualForm = {
  date: string
  storeName: string
  amount: string
}

type Mode = "ocr" | "manual"
type Status = "idle" | "loading" | "done" | "error"

export default function OcrPage() {
  const { user } = useAuth()
  const currentUser: CurrentUser | null = user
    ? { id: user.id, name: user.name, department: user.department, token: user.token }
    : null

  // 사진
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // OCR 상태
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<OcrResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  // 모드
  const [mode, setMode] = useState<Mode>("ocr")

  // 수기 입력
  const [manual, setManual] = useState<ManualForm>({
    date: "",
    storeName: "",
    amount: "",
  })

  // 저장 상태
  const [submitting, setSubmitting] = useState(false)

  // ─── 사진 선택 + OCR 시도 ───
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhoto(URL.createObjectURL(file))
    setPhotoFile(file)
    setResult(null)
    setStatus("loading")
    setErrorMsg("")
    setMode("ocr")

    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/meals/ocr", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentUser?.token ?? ""}` },
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "인식 실패" }))
        throw new Error(error.error)
      }

      const data = await res.json()

      if (!data.items || data.items.length === 0) {
        throw new Error("영수증에서 메뉴를 인식하지 못했어요")
      }

      const itemsWithAssignee = data.items.map(
        (item: Omit<MenuItem, "assigneeId">) => ({
          ...item,
          assigneeId: "",
        })
      )

      setResult({ ...data, items: itemsWithAssignee })
      setStatus("done")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "인식에 실패했습니다")
      setStatus("error")
    }
  }

  const updateAssignee = (index: number, assigneeId: string) => {
    if (!result) return
    const items = result.items.map((item, i) =>
      i === index ? { ...item, assigneeId } : item
    )
    setResult({ ...result, items })
  }

  const switchToManual = () => {
    setMode("manual")
    if (result) {
      setManual({
        date: result.paidAt ? result.paidAt.slice(0, 10) : "",
        storeName: result.storeName ?? "",
        amount: result.totalAmount ? String(result.totalAmount) : "",
      })
    }
  }

  const switchToOcr = () => {
    setMode("ocr")
  }

  const formatPaidAt = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } catch {
      return iso
    }
  }

  // 항목 대상자 이름 가져오기 (표시용)
  const getAssigneeName = (id: string): string => {
    return TEAM_MEMBERS.find((m) => m.id === id)?.name ?? ""
  }

  const canSubmitOcr =
    mode === "ocr" &&
    status === "done" &&
    result &&
    result.items.length > 0 &&
    result.items.every((i) => i.assigneeId !== "")

  const canSubmitManual =
    mode === "manual" &&
    photo &&
    manual.date &&
    manual.storeName &&
    manual.amount

  const canSubmit = canSubmitOcr || canSubmitManual

  const handleSubmit = async () => {
    if (!currentUser) { alert("로그인이 필요합니다."); return }
    setSubmitting(true)

    try {
      if (mode === "manual") {
        if (!photoFile) throw new Error("영수증 사진을 첨부해주세요.")
        if (!manual.date) throw new Error("날짜를 입력해주세요.")
        if (!manual.storeName) throw new Error("식당명을 입력해주세요.")
        if (!manual.amount) throw new Error("금액을 입력해주세요.")
        alert(`수기 입력 저장 완료!\n\n${manual.storeName}\n${Number(manual.amount).toLocaleString()}원\n${manual.date}`)
      } else {
        if (!result) throw new Error("OCR 결과 없음")

        const res = await fetch("/api/meals/receipts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({
            storagePath: result.storagePath,
            storeName: result.storeName,
            paidAt: result.paidAt,
            totalAmount: result.totalAmount,
            isLunchTime: result.isLunchTime,
            ocrRaw: null,
            items: result.items.map((item) => ({
              name: item.name,
              unitPrice: item.unitPrice,
              qty: item.qty,
              total: item.total,
              assigneeId: item.assigneeId,
            })),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "저장 실패" }))
          throw new Error(err.error)
        }

        const byAssignee = result.items.reduce((acc, item) => {
          if (!acc[item.assigneeId]) acc[item.assigneeId] = 0
          acc[item.assigneeId] += item.total
          return acc
        }, {} as Record<string, number>)

        const summary = Object.entries(byAssignee)
          .map(([id, amt]) => `• ${getAssigneeName(id) || id}: ${amt.toLocaleString()}원`)
          .join("\n")

        alert(`저장 완료!\n\n${result.storeName} ${result.totalAmount.toLocaleString()}원\n\n승인 요청 발송:\n${summary}`)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "저장 실패")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="영수증 등록" />

      <div className="flex flex-col gap-3 px-4 pt-5 pb-8">
        {/* 사진 영역 */}
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {photo ? (
              <img src={photo} alt="영수증" className="w-full h-52 object-cover" />
            ) : (
              <div className="h-52 flex flex-col items-center justify-center gap-2">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl"
                  style={{ borderColor: BRAND }}
                >
                  📷
                </div>
                <p className="text-sm font-medium text-gray-700">영수증 사진 촬영</p>
                <p className="text-xs text-gray-400">탭하여 카메라 열기</p>
              </div>
            )}
          </div>
        </label>

        {/* 로딩 */}
        {status === "loading" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: BRAND, borderTopColor: "transparent" }}
            />
            <span className="text-sm text-gray-500">영수증 인식 중...</span>
          </div>
        )}

        {/* OCR 실패 */}
        {status === "error" && mode === "ocr" && (
          <>
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-500 text-center">
              {errorMsg || "인식에 실패했습니다."}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-400 mb-3">
                OCR 인식이 어려우신가요?
              </p>
              <button
                onClick={switchToManual}
                className="w-full h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="text-2xl">✏️</span>
                <p className="text-sm text-gray-500">직접 입력하기</p>
              </button>
            </div>
          </>
        )}

        {/* OCR 성공 */}
        {status === "done" && result && mode === "ocr" && (
          <>
            <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  {result.storeName || "가맹점 미인식"}
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatPaidAt(result.paidAt)}
                </p>
              </div>
              <span
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ color: BRAND, background: `${BRAND}15` }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: BRAND }}
                />
                OCR 인식 완료
              </span>
            </div>

            {/* 메뉴 항목 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">
                  메뉴 항목 ({result.items.length}건)
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {result.totalAmount.toLocaleString()}원
                </p>
              </div>

              {result.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0 ${
                    item.assigneeId ? "bg-green-50/40" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.name}
                      </p>
                      {item.qty > 1 && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          ×{item.qty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.unitPrice.toLocaleString()}원
                      {item.qty > 1 &&
                        ` × ${item.qty} = ${item.total.toLocaleString()}원`}
                    </p>
                  </div>
                  <select
                    value={item.assigneeId}
                    onChange={(e) => updateAssignee(i, e.target.value)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border outline-none appearance-none cursor-pointer transition-colors ml-2 ${
                      item.assigneeId
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    <option value="">선택</option>
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.id === currentUser?.id ? " (나)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* 점심 시간 검증 */}
            <div
              className={`rounded-2xl px-4 py-3 flex items-center gap-2 text-sm ${
                result.isLunchTime
                  ? "bg-green-50 text-green-700"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              <span>{result.isLunchTime ? "🕐" : "⚠️"}</span>
              <div>
                <p className="font-medium">
                  {result.isLunchTime ? "점심 시간 검증 통과" : "점심 시간 외 결제"}
                </p>
                <p className="text-xs mt-0.5 opacity-70">
                  11:30~14:00 사이에 결제됨
                </p>
              </div>
            </div>

            <button
              onClick={switchToManual}
              className="text-xs text-gray-400 underline self-center mt-1"
            >
              인식 결과가 다른가요? 직접 입력하기
            </button>
          </>
        )}

        {/* 수기 입력 모드 */}
        {mode === "manual" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={switchToOcr}
                className="text-gray-400 text-lg font-bold leading-none"
              >
                ←
              </button>
              <span className="text-sm font-medium text-gray-600">
                직접 입력하기
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                날짜 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={manual.date}
                onChange={(e) => setManual({ ...manual, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                식당명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={manual.storeName}
                onChange={(e) => setManual({ ...manual, storeName: e.target.value })}
                placeholder="예) 풀무원 구내식당"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                금액 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={manual.amount}
                  onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  원
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        {photo && (
          <button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="w-full py-4 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:active:scale-100"
            style={{ background: BRAND }}
          >
            {submitting ? "저장 중..." : "저장 및 승인 요청"}
          </button>
        )}
      </div>
    </div>
  )
}