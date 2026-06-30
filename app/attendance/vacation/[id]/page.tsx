"use client";
import AppBar from "@/components/AppBar";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const VACATION_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조사", "면접", "시간 휴가"];

type VacDetail = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  start_time: number | null;
  end_time: number | null;
  lunch_break: boolean | null;
  hours: number | null;
  attachment_url: string | null;
  reviewed_by: string | null;
  reviewer_name?: string | null;
};

function statusKo(s: string) {
  if (s === "approved") return "승인완료";
  if (s === "rejected") return "반려";
  return "승인대기";
}

export default function VacationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<VacDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: vac } = await supabase
        .from("vacation_requests")
        .select("id, type, start_date, end_date, reason, status, start_time, end_time, lunch_break, hours, attachment_url, reviewed_by")
        .eq("id", id)
        .single();
      if (!vac) { setLoading(false); return; }

      let reviewer_name: string | null = null;
      if (vac.reviewed_by) {
        const { data: u } = await supabase.from("users").select("name").eq("id", vac.reviewed_by).single();
        reviewer_name = u?.name ?? null;
      }
      setData({ ...vac, reviewer_name });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="휴가 상세" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="휴가 상세" />
        <p className="text-center text-gray-400 py-20 text-sm">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const isHourly = data.type === "시간 휴가";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="휴가 상세" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        {/* 승인 상태 */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${data.status === "approved" ? "bg-green-50 border-green-100" : data.status === "rejected" ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"}`}>
          <span className="text-sm font-semibold text-gray-700">신청 상태</span>
          <div className="flex items-center gap-2">
            {data.reviewer_name && (
              <span className="text-xs text-gray-400">{data.status === "approved" ? "승인" : "처리"}: {data.reviewer_name}</span>
            )}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${data.status === "approved" ? "bg-green-100 text-green-700" : data.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
              {statusKo(data.status)}
            </span>
          </div>
        </div>

        {/* 폼 카드 (읽기 전용) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
          {/* 휴가 종류 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">휴가 종류</label>
            <div className="flex flex-wrap gap-2">
              {VACATION_TYPES.map(type => (
                <span
                  key={type}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    data.type === type
                      ? type === "시간 휴가"
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  }`}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* 시간 휴가: 시간 범위 */}
          {isHourly && data.start_time != null && data.end_time != null && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">휴가 시간</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">시작</label>
                  <div className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 flex items-center text-gray-700">
                    {data.start_time}시
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">종료</label>
                  <div className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 flex items-center text-gray-700">
                    {data.end_time}시
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2.5 mt-3 select-none">
                <input type="checkbox" checked={data.lunch_break ?? false} readOnly className="w-5 h-5 rounded accent-[#8dc63f] pointer-events-none" />
                <span className="text-sm text-gray-700">점심 시간 포함 (-1시간)</span>
              </label>
              {data.hours != null && (
                <p className="text-xs text-green-600 font-medium mt-2">{data.hours}시간 휴가</p>
              )}
            </div>
          )}

          {/* 시작일 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{isHourly ? "날짜" : "시작일"}</label>
            <input
              type="date"
              value={data.start_date}
              readOnly
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
            />
          </div>

          {/* 종료일 (시간 휴가 아닌 경우) */}
          {!isHourly && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료일</label>
              <input
                type="date"
                value={data.end_date}
                readOnly
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
              />
            </div>
          )}

          {/* 사유 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">사유</label>
            <textarea
              value={data.reason ?? ""}
              readOnly
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none resize-none pointer-events-none"
            />
          </div>

          {/* 증빙서류 */}
          {data.attachment_url ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">증빙서류</label>
              <a
                href={data.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-dashed border-blue-300 text-sm text-blue-500 hover:bg-blue-50 transition-all"
              >
                <span className="text-base">📎</span>
                파일 보기
              </a>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">증빙서류</label>
              <div className="w-full h-11 rounded-xl border border-dashed border-gray-200 text-sm text-gray-300 flex items-center justify-center">
                첨부 없음
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
