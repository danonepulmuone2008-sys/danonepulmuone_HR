"use client";
import AppBar from "@/components/AppBar";
import { useState } from "react";

export default function BusinessTripPage() {
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    destination: "",
    reason: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="출장 신청" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 시작일</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 종료일</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">목적지</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              placeholder="예) 서울, 부산"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 사유</label>
            <textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="출장 목적을 입력하세요"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
            />
          </div>
        </div>

        <button className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm">
          신청하기
        </button>
      </div>
    </div>
  );
}
