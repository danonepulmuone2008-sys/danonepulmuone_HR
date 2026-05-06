"use client";
import AppBar from "@/components/AppBar";
import { useState } from "react";

const VACATION_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조사"];

export default function VacationPage() {
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    type: "연차",
    reason: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="휴가 신청" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">휴가 종류</label>
            <div className="flex flex-wrap gap-2">
              {VACATION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => update("type", type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.type === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">시작일</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료일</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">사유</label>
            <textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="휴가 사유를 입력하세요"
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
