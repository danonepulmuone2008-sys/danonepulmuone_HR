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

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`flex ${multiline ? "flex-col gap-1" : "items-start justify-between gap-4"}`}>
      <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-700 ${multiline ? "" : "text-right"}`}>{value}</span>
    </div>
  );
}

export default function BusinessTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: trip } = await supabase
        .from("business_trip_requests")
        .select("id, destination, start_date, end_date, start_time, end_time, reason, status, reviewed_by")
        .eq("id", id)
        .single();
      if (!trip) { setLoading(false); return; }

      let reviewer_name: string | null = null;
      if (trip.reviewed_by) {
        const { data: u } = await supabase.from("users").select("name").eq("id", trip.reviewed_by).single();
        reviewer_name = u?.name ?? null;
      }
      setData({ ...trip, reviewer_name });
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="출장 상세" />
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-20 text-sm">데이터를 불러올 수 없습니다</p>
      ) : (
        <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">신청 상태</span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${data.status === "approved" ? "bg-green-50 text-green-600" : data.status === "rejected" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"}`}>
                {statusKo(data.status)}
              </span>
            </div>

            <div className="h-px bg-gray-100" />

            <Row label="목적지" value={data.destination} />
            <Row
              label="날짜"
              value={data.start_date === data.end_date ? data.start_date : `${data.start_date} ~ ${data.end_date}`}
            />
            {data.start_time && data.end_time && (
              <Row label="시간" value={`${data.start_time} ~ ${data.end_time}`} />
            )}
            {data.reason ? (
              <Row label="사유" value={data.reason} multiline />
            ) : null}

            {data.reviewer_name && (
              <>
                <div className="h-px bg-gray-100" />
                <Row
                  label={data.status === "approved" ? "승인자" : "처리자"}
                  value={data.reviewer_name ?? ""}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
