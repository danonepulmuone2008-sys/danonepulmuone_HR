"use client"
import AppBar from "@/components/AppBar"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { PenLine, ChevronDown, Check } from "lucide-react"

const BRAND = "#72BF44"

type TeamMember = { id: string; name: string; department: string }

type CurrentUser = { id: string; name: string; department: string; token: string }

type MenuItem = {
  name: string
  unitPrice: number
  qty: number
  total: number
  assigneeIds: string[]
}

type OcrResult = {
  storeName: string
  paidAt: string
  items: MenuItem[]
  totalAmount: number
  isLunchTime: boolean
  storagePath: string
}

type ManualItem = { amount: string; assigneeId: string }
type ManualForm = {
  date: string
  storeName: string
  items: ManualItem[]
}

type Mode = "ocr" | "manual"
type Status = "idle" | "loading" | "done" | "error"

export default function OcrPage() {
  const { user } = useAuth()
  const currentUser: CurrentUser | null = user
    ? { id: user.id, name: user.name, department: user.department, token: user.token }
    : null

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    supabase.from("users").select("id, name, department").then(({ data }) => {
      if (data) setTeamMembers(data)
    })
  }, [])

  // 사진
  const [photo, setPhoto] = useState<string | null>(null)

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
    items: [{ amount: "", assigneeId: "" }],
  })

  // 수기 담당자 바텀시트 (열린 항목 인덱스)
  const [manualAssigneeIdx, setManualAssigneeIdx] = useState<number | null>(null)

  const updateManualItem = (idx: number, field: keyof ManualItem, value: string) =>
    setManual((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
    }))

  const addManualItem = () =>
    setManual((prev) => ({ ...prev, items: [...prev.items, { amount: "", assigneeId: "" }] }))

  const removeManualItem = (idx: number) =>
    setManual((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))

  // 저장 상태
  const [submitting, setSubmitting] = useState(false)

  // 담당자 선택 바텀시트
  const [selectingItemIdx, setSelectingItemIdx] = useState<number | null>(null)

  // ─── 사진 선택 + OCR 시도 ───
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhoto(URL.createObjectURL(file))
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
        (item: Omit<MenuItem, "assigneeIds">) => ({
          ...item,
          assigneeIds: [],
        })
      )

      setResult({ ...data, items: itemsWithAssignee })
      setStatus("done")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "인식에 실패했습니다")
      setStatus("error")
    }
  }

  const toggleAssignee = (index: number, uid: string) => {
    if (!result) return
    setResult({
      ...result,
      items: result.items.map((item, i) => {
        if (i !== index) return item
        const isSelected = item.assigneeIds.includes(uid)
        if (!isSelected && item.assigneeIds.length >= item.qty) return item
        const ids = isSelected
          ? item.assigneeIds.filter((id) => id !== uid)
          : [...item.assigneeIds, uid]
        return { ...item, assigneeIds: ids }
      }),
    })
  }

  const switchToManual = () => {
    setMode("manual")
    if (result) {
      setManual({
        date: result.paidAt ? result.paidAt.slice(0, 10) : "",
        storeName: result.storeName ?? "",
        items: [{ amount: result.totalAmount ? String(result.totalAmount) : "", assigneeId: "" }],
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
    return teamMembers.find((m) => m.id === id)?.name ?? ""
  }

  const canSubmitOcr =
    mode === "ocr" &&
    status === "done" &&
    result &&
    result.items.length > 0 &&
    result.items.every((i) => i.assigneeIds.length > 0)

  const canSubmitManual =
    mode === "manual" &&
    !!manual.date &&
    !!manual.storeName &&
    manual.items.length > 0 &&
    manual.items.every((it) => !!it.amount && !!it.assigneeId)

  const canSubmit = canSubmitOcr || canSubmitManual

  const handleSubmit = async () => {
    if (!currentUser) { alert("로그인이 필요합니다."); return }
    setSubmitting(true)

    try {
      if (mode === "manual") {
        if (!manual.date) throw new Error("날짜를 입력해주세요.")
        if (!manual.storeName) throw new Error("식당명을 입력해주세요.")
        if (manual.items.some((it) => !it.amount)) throw new Error("금액을 모두 입력해주세요.")
        if (manual.items.some((it) => !it.assigneeId)) throw new Error("담당자를 모두 선택해주세요.")
        const total = manual.items.reduce((s, it) => s + Number(it.amount), 0)
        const summary = manual.items.map((it) => `• ${getAssigneeName(it.assigneeId)}: ${Number(it.amount).toLocaleString()}원`).join("\n")
        alert(`수기 입력 저장 완료!\n\n${manual.storeName} | ${manual.date}\n합계 ${total.toLocaleString()}원\n\n${summary}`)
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
              assigneeIds: item.assigneeIds,
            })),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "저장 실패" }))
          throw new Error(err.error)
        }

        const byAssignee = result.items.reduce((acc, item) => {
          const split = item.total / item.assigneeIds.length
          item.assigneeIds.forEach((id) => {
            if (!acc[id]) acc[id] = 0
            acc[id] += split
          })
          return acc
        }, {} as Record<string, number>)

        const summary = Object.entries(byAssignee)
          .map(([id, amt]) => `• ${getAssigneeName(id) || id}: ${Math.round(amt).toLocaleString()}원`)
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

        {/* 수기 입력 버튼 */}
        {!photo && (
          <button
            onClick={switchToManual}
            className="w-full py-3 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <PenLine size={15} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-500">수기 입력</p>
          </button>
        )}

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
                  className={`px-4 py-3.5 border-b border-gray-50 last:border-b-0 ${
                    item.assigneeIds.length > 0 ? "bg-green-50/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.name}
                      </p>
                      {item.qty > 1 && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          ×{item.qty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 ml-2 flex-shrink-0">
                      {item.total.toLocaleString()}원
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectingItemIdx(i)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors ${
                      item.assigneeIds.length > 0
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    }`}
                  >
                    <span className="truncate text-xs">
                      {item.assigneeIds.length === 0
                        ? "담당자 선택"
                        : item.assigneeIds.map((id) => getAssigneeName(id)).join(", ")}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs">{item.assigneeIds.length}/{item.qty}명</span>
                      <ChevronDown size={13} />
                    </span>
                  </button>
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
                  {result.isLunchTime
                    ? "11:30~14:00 사이에 결제됨"
                    : "점심 시간(11:30~14:00) 외에 결제됨"}
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

            {/* 금액 + 담당자 헤더 */}
            <div className="flex gap-3 px-0.5">
              <p className="flex-1 text-xs font-medium text-gray-500">금액 <span className="text-red-400">*</span></p>
              <p className="flex-1 text-xs font-medium text-gray-500">담당자 <span className="text-red-400">*</span></p>
              <div className="w-7" />
            </div>

            {/* 항목 행 */}
            {manual.items.map((it, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={it.amount}
                    onChange={(e) => updateManualItem(idx, "amount", e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 pr-7 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
                <div className="flex-1">
                  <button
                    onClick={() => setManualAssigneeIdx(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                      it.assigneeId
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    }`}
                  >
                    <span className="truncate">{it.assigneeId ? getAssigneeName(it.assigneeId) : "선택"}</span>
                    <ChevronDown size={12} className="flex-shrink-0 ml-1" />
                  </button>
                </div>
                <button
                  onClick={() => removeManualItem(idx)}
                  disabled={manual.items.length === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-0"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* 항목 추가 버튼 */}
            <button
              onClick={addManualItem}
              className="flex items-center gap-1.5 text-xs font-medium self-start px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors"
            >
              + 항목 추가
            </button>
          </div>
        )}

        {/* 저장 버튼 */}
        {(photo || mode === "manual") && (
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

      {/* 수기 입력 담당자 바텀시트 */}
      {manualAssigneeIdx !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setManualAssigneeIdx(null)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">담당자 선택</p>
            </div>
            <div className="overflow-y-auto max-h-64 py-1">
              {teamMembers.map((m) => {
                const selected = manual.items[manualAssigneeIdx]?.assigneeId === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      updateManualItem(manualAssigneeIdx, "assigneeId", m.id)
                      setManualAssigneeIdx(null)
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left active:bg-gray-50 transition-colors"
                  >
                    <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                      selected ? "bg-green-500 border-green-500" : "border-gray-300"
                    }`}>
                      {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-sm ${selected ? "text-green-700 font-semibold" : "text-gray-700"}`}>
                      {m.name}{m.id === currentUser?.id ? " (나)" : ""}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="px-5 py-4">
              <button
                onClick={() => setManualAssigneeIdx(null)}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold"
                style={{ background: BRAND }}
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 선택 바텀시트 */}
      {selectingItemIdx !== null && result && (() => {
        const item = result.items[selectingItemIdx]
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectingItemIdx(null)} />
            <div className="relative bg-white rounded-t-2xl shadow-xl z-10">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 truncate mr-3">{item.name}</p>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {item.assigneeIds.length}/{item.qty}명 선택
                </span>
              </div>
              <div className="overflow-y-auto max-h-64 py-1">
                {teamMembers.map((m) => {
                  const selected = item.assigneeIds.includes(m.id)
                  const maxReached = item.assigneeIds.length >= item.qty && !selected
                  return (
                    <button
                      key={m.id}
                      disabled={maxReached}
                      onClick={() => toggleAssignee(selectingItemIdx, m.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                        maxReached ? "opacity-40 cursor-not-allowed" : "active:bg-gray-50"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                        selected ? "bg-green-500 border-green-500" : "border-gray-300"
                      }`}>
                        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className={`text-sm ${selected ? "text-green-700 font-semibold" : "text-gray-700"}`}>
                        {m.name}{m.id === currentUser?.id ? " (나)" : ""}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="px-5 py-4">
                <button
                  onClick={() => setSelectingItemIdx(null)}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold"
                  style={{ background: BRAND }}
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}