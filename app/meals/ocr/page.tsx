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

const BRAND = "#72BF44";

export default function OcrPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [manualPhoto, setManualPhoto] = useState<string | null>(null);
  const [mode, setMode] = useState<"ocr" | "manual">("ocr");
  const [manual, setManual] = useState({
    date: "",
    amount: "",
    storeName: "",
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto(url);
    setMode("ocr");
  };

  const handleManualPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setManualPhoto(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="영수증 등록" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">

        {/* OCR 모드 */}
        {mode === "ocr" && (
          <>
            {/* 사진 영역 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-xs font-medium text-gray-400 px-4 pt-4 mb-3">사진</p>
              <label className="cursor-pointer block mx-4 mb-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhoto}
                />
                {photo ? (
                  <img src={photo} alt="영수증" className="w-full h-48 object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl">📷</span>
                    <p className="text-sm text-gray-400">카메라로 촬영하거나 사진을 선택하세요</p>
                  </div>
                )}
              </label>
            </div>

            {/* 직접 입력하기 박스 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-400 mb-3">OCR 인식이 어렵다면?</p>
              <button
                onClick={() => setMode("manual")}
                className="w-full h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="text-2xl">✏️</span>
                <p className="text-sm text-gray-400">직접 입력하기</p>
              </button>
            </div>
          </>
        )}

        {/* 수기 입력 모드 */}
        {mode === "manual" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
            {/* 헤더 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("ocr")}
                className="text-gray-400 text-lg font-bold leading-none"
              >
                ←
              </button>
              <span className="text-sm font-medium text-gray-600">직접 입력하기</span>
            </div>

            {/* 사진 첨부 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">사진 첨부 <span className="text-red-400">*</span></label>
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleManualPhoto}
                />
                {manualPhoto ? (
                  <img src={manualPhoto} alt="영수증" className="w-full h-32 object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📷</span>
                    <p className="text-xs text-gray-400">영수증 사진을 첨부해주세요</p>
                  </div>
                )}
              </label>
            </div>

            {/* 날짜 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                value={manual.date}
                onChange={(e) => setManual({ ...manual, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
              />
            </div>

            {/* 식당명 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">식당명</label>
              <input
                type="text"
                value={manual.storeName}
                onChange={(e) => setManual({ ...manual, storeName: e.target.value })}
                placeholder="예) 풀무원 구내식당"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
              />
            </div>

            {/* 금액 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">금액</label>
              <div className="relative">
                <input
                  type="number"
                  value={manual.amount}
                  onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:border-green-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
              </div>
            </div>
          </div>
        )}

        {/* 저장 및 승인 요청 버튼 */}
        <button
          onClick={() => {
            if (mode === "manual") {
              if (!manualPhoto) { alert("영수증 사진을 첨부해주세요."); return; }
              if (!manual.date) { alert("날짜를 입력해주세요."); return; }
              if (!manual.storeName) { alert("식당명을 입력해주세요."); return; }
              if (!manual.amount) { alert("금액을 입력해주세요."); return; }
            }
          }}
          className="w-full py-4 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm"
          style={{ background: BRAND }}
        >
          저장 및 승인 요청
        </button>
      </div>
    </div>
  )
}
