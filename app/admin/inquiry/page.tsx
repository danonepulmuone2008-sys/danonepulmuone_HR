"use client";

import { useState } from "react";
import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";

const CATEGORY_COLOR: Record<string, string> = {
  "출퇴근 시간 수정": "bg-green-100 text-green-700",
  "휴가/출장 신청": "bg-teal-100 text-teal-700",
  "식대 수정": "bg-emerald-100 text-emerald-700",
  "기타 문의": "bg-lime-50 text-lime-600",
};

const INTERN_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626"];

type InquiryStatus = { id: string; isNew: boolean; isProcessed: boolean };

export default function AdminInquiryPage() {
  const { interns } = ADMIN_DUMMY;

  // isNew = 아직 클릭 안 한 새 문의 (N 뱃지)
  // isProcessed = 처리 완료 버튼 눌렀을 때
  const [statuses, setStatuses] = useState<InquiryStatus[]>(
    ADMIN_DUMMY.inquiries.map((q) => ({
      id: q.id,
      isNew: !q.isRead,
      isProcessed: q.isRead,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"미처리" | "처리완료">("미처리");

  const inquiries = ADMIN_DUMMY.inquiries.map((q) => {
    const s = statuses.find((s) => s.id === q.id)!;
    return { ...q, isNew: s.isNew, isProcessed: s.isProcessed };
  });

  const internColor = (internId: string) => {
    const idx = interns.findIndex((i) => i.id === internId);
    return INTERN_HEX[idx] ?? "#9CA3AF";
  };

  // 카드 클릭: N 뱃지만 제거 (미처리 유지) + 상세 열기
  const openInquiry = (id: string) => {
    setStatuses((prev) => prev.map((s) => s.id === id ? { ...s, isNew: false } : s));
    setSelectedId(id);
  };

  // 처리 완료 버튼: 처리완료로 이동
  const processInquiry = (id: string) => {
    setStatuses((prev) => prev.map((s) => s.id === id ? { ...s, isNew: false, isProcessed: true } : s));
    setSelectedId(null);
  };

  const newCount = inquiries.filter((q) => q.isNew).length;
  const unprocCount = inquiries.filter((q) => !q.isProcessed).length;
  const procCount = inquiries.filter((q) => q.isProcessed).length;
  const filtered = inquiries.filter((q) => activeTab === "미처리" ? !q.isProcessed : q.isProcessed);
  const selected = inquiries.find((q) => q.id === selectedId);

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-gray-50">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">문의함</h1>
          {newCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {newCount}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">인턴이 보낸 문의를 확인하세요</p>
      </header>

      {/* 처리 상태 탭 */}
      <div className="bg-white border-b border-gray-100 flex">
        <button
          onClick={() => setActiveTab("미처리")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "미처리" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"
          }`}
        >
          미처리
          <span className="text-gray-300 text-xs font-normal">{unprocCount}</span>
        </button>
        <button
          onClick={() => setActiveTab("처리완료")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "처리완료" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400"
          }`}
        >
          처리완료
          <span className="text-gray-300 text-xs font-normal">{procCount}</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl px-4 py-10 text-center text-sm text-gray-400 shadow-sm border border-gray-100">
            {activeTab === "미처리" ? "미처리 문의가 없습니다" : "처리완료된 문의가 없습니다"}
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.id}
              className="relative bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all overflow-visible"
              onClick={() => openInquiry(q.id)}
            >
              {/* N 뱃지: 새 문의만 표시 */}
              {q.isNew && (
                <div className="absolute -top-px -left-px bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-tl-2xl rounded-br-xl z-10 leading-none pointer-events-none">
                  N
                </div>
              )}

              <div className="px-4 pt-3.5 pb-2">
                <div className="flex items-start gap-3">
                  {/* 왼쪽 */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[q.category] ?? "bg-gray-100 text-gray-500"}`}>
                        {q.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate mb-1">{q.subject}</p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: internColor(q.internId) }}>
                        {q.senderName.slice(0, 1)}
                      </div>
                      <span className="text-xs text-gray-500">{q.senderName}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{q.content}</p>
                  </div>
                  {/* 오른쪽 */}
                  <div className="flex flex-col items-end flex-shrink-0 gap-1 pt-0.5">
                    <p className="text-[11px] text-gray-400 whitespace-nowrap">
                      {q.date.slice(5).replace("-", "/")} {q.time}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* 문의 상세 바텀시트 */}
      {selectedId !== null && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100 gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[selected.category] ?? "bg-gray-100 text-gray-500"}`}>
                    {selected.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{selected.subject}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: internColor(selected.internId) }}>
                    {selected.senderName.slice(0, 1)}
                  </div>
                  <p className="text-xs text-gray-400">
                    {selected.senderName} · {selected.date} {selected.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl flex-shrink-0"
              >×</button>
            </div>
            <div className="px-5 pt-5 pb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{selected.content}</p>
            </div>
            {/* 바텀시트 내 처리 완료 버튼 */}
            {!selected.isProcessed && (
              <div className="px-5 pb-2">
                <button
                  onClick={() => processInquiry(selected.id)}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all"
                >
                  처리 완료
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
