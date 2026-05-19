"use client";
import AppBar from "@/components/AppBar";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const VACATION_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조사", "면접", "시간 휴가"];

export default function VacationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ startDate: "", endDate: "", type: "연차", reason: "", startTime: "", endTime: "", lunchBreak: false });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHourly = form.type === "시간 휴가";

  const calcHours = (): number | null => {
    if (!form.startTime || !form.endTime) return null;
    const sh = Number(form.startTime);
    const eh = Number(form.endTime);
    let diff = eh - sh;
    if (form.lunchBreak) diff = Math.max(0, diff - 1);
    return diff > 0 ? diff : null;
  };

  const update = (key: string, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(prev => {
      const existing = prev.map(f => f.name);
      return [...prev, ...selected.filter(f => !existing.includes(f.name))];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleSubmit = async () => {
    if (!form.startDate) {
      showToast("시작일을 입력해주세요.", true);
      return;
    }
    if (!isHourly && !form.endDate) {
      showToast("종료일을 입력해주세요.", true);
      return;
    }
    if (!isHourly && form.startDate > form.endDate) {
      showToast("종료일이 시작일보다 빠를 수 없습니다.", true);
      return;
    }
    if (isHourly && (!form.startTime || !form.endTime)) {
      showToast("시작 시간과 종료 시간을 입력해주세요.", true);
      return;
    }
    if (isHourly && calcHours() === null) {
      showToast("종료 시간이 시작 시간보다 늦어야 합니다.", true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast("로그인이 필요합니다.", true); return; }

      let attachmentUrl: string | null = null;
      if (files.length > 0) {
        const uploadForm = new FormData();
        uploadForm.append("file", files[0]);
        uploadForm.append("userId", session.user.id);
        const uploadRes = await fetch("/api/attendance/vacation/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadRes.ok) { showToast("파일 업로드 중 오류가 발생했습니다.", true); return; }
        const { url } = await uploadRes.json();
        attachmentUrl = url;
      }

      const { error } = await supabase.from("vacation_requests").insert({
        user_id: session.user.id,
        type: form.type,
        start_date: form.startDate,
        end_date: isHourly ? form.startDate : form.endDate,
        reason: form.reason || null,
        attachment_url: attachmentUrl,
        hours: isHourly ? calcHours() : null,
        start_time: isHourly && form.startTime !== "" ? Number(form.startTime) : null,
        end_time: isHourly && form.endTime !== "" ? Number(form.endTime) : null,
      });

      if (error) {
        showToast("신청 중 오류가 발생했습니다.", true);
      } else {
        showToast("휴가 신청이 완료되었습니다.");
        setTimeout(() => router.push("/attendance"), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppBar title="휴가 신청" />

      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap ${toast.isError ? "bg-red-500" : "bg-gray-800"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">휴가 종류</label>
            <div className="flex flex-wrap gap-2">
              {VACATION_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => update("type", type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.type === type
                      ? type === "시간 휴가"
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {isHourly && (() => {
            const computed = calcHours();
            const invalid = !!form.startTime && !!form.endTime && computed === null;
            return (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">휴가 시간</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-400 mb-1 block">시작</label>
                    <select
                      value={form.startTime}
                      onChange={e => update("startTime", e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-gray-50"
                    >
                      <option value="">시 선택</option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={String(i)}>{i}시</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-400 mb-1 block">종료</label>
                    <select
                      value={form.endTime}
                      onChange={e => update("endTime", e.target.value)}
                      className={`w-full h-11 px-4 rounded-xl border text-sm outline-none bg-gray-50 ${invalid ? "border-red-400" : "border-gray-200 focus:border-green-500"}`}
                    >
                      <option value="">시 선택</option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={String(i)}>{i}시</option>
                      ))}
                    </select>
                  </div>
                </div>
                {invalid && <p className="text-xs text-red-500 mt-1.5">종료 시간이 시작 시간보다 늦어야 합니다.</p>}
                <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.lunchBreak}
                    onChange={e => update("lunchBreak", e.target.checked)}
                    className="w-5 h-5 rounded accent-[#8dc63f]"
                  />
                  <span className="text-sm text-gray-700">점심 시간 포함 (-1시간)</span>
                </label>
                {computed !== null && (
                  <p className="text-xs text-green-600 font-medium mt-2">{computed}시간 휴가</p>
                )}
              </div>
            );
          })()}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{isHourly ? "날짜" : "시작일"}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => update("startDate", e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>

          {!isHourly && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료일</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => update("endDate", e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">사유</label>
            <textarea
              value={form.reason}
              onChange={e => update("reason", e.target.value)}
              placeholder="휴가 사유를 입력하세요"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">증빙서류</label>
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {files.map(file => (
                  <div key={file.name} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-400 text-base flex-shrink-0">📎</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeFile(file.name)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0 ml-2 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-base">+</span>
              파일 첨부
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || (isHourly && !!form.startTime && !!form.endTime && calcHours() === null)}
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
