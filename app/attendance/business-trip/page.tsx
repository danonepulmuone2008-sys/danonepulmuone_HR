"use client";
import AppBar from "@/components/AppBar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BusinessTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({ startDate: "", endDate: "", destination: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) {
      showToast("시작일과 종료일을 입력해주세요.", true);
      return;
    }
    if (!form.destination.trim()) {
      showToast("목적지를 입력해주세요.", true);
      return;
    }
    if (form.startDate > form.endDate) {
      showToast("종료일이 시작일보다 빠를 수 없습니다.", true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast("로그인이 필요합니다.", true);
        return;
      }

      const { error } = await supabase.from("business_trip_requests").insert({
        user_id: session.user.id,
        destination: form.destination.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
        reason: form.reason || null,
      });

      if (error) {
        showToast("신청 중 오류가 발생했습니다.", true);
      } else {
        showToast("출장 신청이 완료되었습니다.");
        setTimeout(() => router.push("/attendance"), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="출장 신청" />

      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap ${toast.isError ? "bg-red-500" : "bg-gray-800"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 시작일</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => update("startDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 종료일</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => update("endDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">목적지</label>
            <input
              type="text"
              value={form.destination}
              onChange={e => update("destination", e.target.value)}
              placeholder="예) 서울, 부산"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">출장 사유</label>
            <textarea
              value={form.reason}
              onChange={e => update("reason", e.target.value)}
              placeholder="출장 목적을 입력하세요"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-semibold active:scale-95 transition-all shadow-sm disabled:opacity-60 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : "신청하기"}
        </button>
      </div>
    </div>
  );
}
