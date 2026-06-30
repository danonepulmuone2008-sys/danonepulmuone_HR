"use client";
import AppBar from "@/components/AppBar";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TripDetail = {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  lunch_break: boolean;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewer_name?: string | null;
};

function statusKo(s: string) {
  if (s === "approved") return "승인완료";
  if (s === "rejected") return "반려";
  return "승인대기";
}

export default function BusinessTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: trip } = await supabase
        .from("business_trip_requests")
        .select("id, destination, start_date, end_date, start_time, end_time, lunch_break, reason, status, reviewed_by")
        .eq("id", id)
        .single();
      if (!trip) { setLoading(false); return; }

      let reviewer_name: string | null = null;
      if (trip.reviewed_by) {
        const { data: u } = await supabase.from("users").select("name").eq("id", trip.reviewed_by).single();
        reviewer_name = u?.name ?? null;
      }
      setData({ ...trip, lunch_break: trip.lunch_break ?? false, reviewer_name });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="출장 상세" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <AppBar title="출장 상세" />
        <p className="text-center text-gray-400 py-20 text-sm">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="출장 상세" />

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
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 시작일</label>
            <input
              type="date"
              value={data.start_date}
              readOnly
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 종료일</label>
            <input
              type="date"
              value={data.end_date}
              readOnly
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">목적지</label>
            <input
              type="text"
              value={data.destination}
              readOnly
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 시작 시간</label>
              <input
                type="time"
                value={data.start_time ?? ""}
                readOnly
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 종료 시간</label>
              <input
                type="time"
                value={data.end_time ?? ""}
                readOnly
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none pointer-events-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 select-none pointer-events-none">
            <input
              type="checkbox"
              checked={data.lunch_break}
              readOnly
              className="w-5 h-5 rounded accent-blue-600"
            />
            <span className="text-sm text-gray-700">점심 식사 포함 (-1시간)</span>
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 사유</label>
            <textarea
              value={data.reason ?? ""}
              readOnly
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-700 outline-none resize-none pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
