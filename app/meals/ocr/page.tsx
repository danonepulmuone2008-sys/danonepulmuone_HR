"use client";
import AppBar from "@/components/AppBar";
import { useState } from "react";

export default function OcrPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [detail, setDetail] = useState("");

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto(url);
    // TODO: OCR API 호출 후 detail 자동 입력
    setDetail("식당명: 풀무원 구내식당\n금액: 9,000원\n날짜: 2026-05-06");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="영수증 등록" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
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

        {/* 내역 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-xs font-medium text-gray-400 mb-2 block">내역 (OCR 자동 입력)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="사진을 등록하면 자동으로 내역이 입력됩니다"
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
          />
        </div>

        {/* 저장 및 승인 요청 버튼 */}
        <button className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm">
          저장 및 승인 요청
        </button>
      </div>
    </div>
  );
}
