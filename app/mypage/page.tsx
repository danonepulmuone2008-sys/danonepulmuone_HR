'use client';

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import type { LucideIcon } from "lucide-react";
import {
  Pencil, User, Bell, AlarmClock, Utensils,
  Lock, KeyRound, MessageCircle, Phone, LogOut, Trash2,
} from "lucide-react";

const BRAND_BLUE = "#72bf44";
const BRAND_GREEN = "#62a83a";

const MenuItem = ({
  Icon, label, danger = false, onClick,
}: {
  Icon: LucideIcon; label: string; danger?: boolean; onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex justify-between items-center px-4 py-2.5 border-t border-gray-50 active:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Icon size={16} className={danger ? "text-red-400" : "text-gray-400"} strokeWidth={1.8} />
      <span className={`text-sm ${danger ? "text-red-500 font-semibold" : "text-gray-700"}`}>{label}</span>
    </div>
    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

const SectionLabel = ({ Icon, label, color }: { Icon: LucideIcon; label: string; color: string }) => (
  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
    <Icon size={13} style={{ color }} strokeWidth={2} />
    <p className="text-xs font-semibold text-gray-400 tracking-wide">{label}</p>
  </div>
);

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="flex-shrink-0 focus:outline-none"
    style={{
      position: "relative",
      width: 52,
      height: 30,
      borderRadius: 15,
      background: on ? BRAND_BLUE : "#D1D5DB",
      transition: "background 0.3s",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 3,
        left: 3,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        transition: "transform 0.3s",
        transform: on ? "translateX(22px)" : "translateX(0)",
      }}
    />
  </button>
);

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const daysLabel = (days: string[]) => {
  if (days.length === 0) return "반복 없음";
  if (days.length === 7) return "매일";
  if (["월","화","수","목","금"].every((d) => days.includes(d)) && days.length === 5) return "주중";
  if (["토","일"].every((d) => days.includes(d)) && days.length === 2) return "주말";
  return days.join(" ");
};

/* 알람 행 (목록) */
const AlarmRow = ({
  Icon, label, on, time, days, onToggle, onOpenDetail,
}: {
  Icon: LucideIcon; label: string; on: boolean; time: string; days: string[];
  onToggle: () => void; onOpenDetail: () => void;
}) => {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const timeDisplay = `${period} ${h12}:${String(m).padStart(2, "0")}`;
  return (
    <div className="flex items-center border-t border-gray-50">
      {/* 왼쪽: 탭하면 세부 설정(시간·요일) 모달 열림 */}
      <button
        onClick={onOpenDetail}
        className="flex-1 flex items-center gap-3 px-4 py-2.5 active:bg-gray-50 transition-colors text-left"
      >
        <Icon size={16} className="text-gray-400" strokeWidth={1.8} />
        <div>
          <p className="text-sm text-gray-700">{label}</p>
          <p className="text-xs mt-0.5" style={{ color: on ? BRAND_BLUE : "#9CA3AF" }}>
            {on ? `${timeDisplay} · ${daysLabel(days)}` : "꺼짐"}
          </p>
        </div>
      </button>
      {/* 오른쪽: 즉시 ON/OFF 토글 */}
      <div className="pr-4">
        <Toggle on={on} onToggle={onToggle} />
      </div>
    </div>
  );
};

/* 알람 시간 피커 (▲▼ 버튼) */
const TimePicker = ({ time, onChange }: { time: string; onChange: (t: string) => void }) => {
  const [h, m] = time.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const setH = (v: number) => onChange(`${pad((v + 24) % 24)}:${pad(m)}`);
  const setM = (v: number) => onChange(`${pad(h)}:${pad((v + 60) % 60)}`);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;

  const ArrowBtn = ({ onClick, up }: { onClick: () => void; up: boolean }) => (
    <button
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
    >
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d={up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
      </svg>
    </button>
  );

  const togglePeriod = () => setH(h < 12 ? h + 12 : h - 12);

  return (
    <div className="flex flex-col items-center py-4">
      <button
        onClick={togglePeriod}
        className="text-sm font-semibold px-5 py-1.5 rounded-full mb-3 active:opacity-70 transition-opacity"
        style={{ background: `${BRAND_BLUE}18`, color: BRAND_BLUE }}
      >
        {period}
      </button>
      <div className="flex items-center gap-2">
        {/* 시 */}
        <div className="flex flex-col items-center">
          <ArrowBtn onClick={() => setH(h + 1)} up />
          <span className="text-5xl font-bold w-20 text-center" style={{ color: BRAND_BLUE }}>
            {pad(h12)}
          </span>
          <ArrowBtn onClick={() => setH(h - 1)} up={false} />
        </div>

        <span className="text-4xl font-bold text-gray-300 mb-1">:</span>

        {/* 분 */}
        <div className="flex flex-col items-center">
          <ArrowBtn onClick={() => setM(m + 1)} up />
          <span className="text-5xl font-bold w-20 text-center" style={{ color: BRAND_BLUE }}>
            {pad(m)}
          </span>
          <ArrowBtn onClick={() => setM(m - 1)} up={false} />
        </div>
      </div>
    </div>
  );
};

/* 알람 모달 */
const AlarmModal = ({
  title, time, days, onTimeChange, onDaysChange, onSave, onClose,
}: {
  title: string; time: string; days: string[];
  onTimeChange: (t: string) => void;
  onDaysChange: (d: string[]) => void;
  onSave: () => void; onClose: () => void;
}) => {
  const toggleDay = (day: string) => {
    onDaysChange(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl z-10">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-base font-bold text-gray-800">{title}</p>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        {/* 시간 피커 */}
        <TimePicker time={time} onChange={onTimeChange} />
        {/* 요일 선택 */}
        <div className="flex justify-center gap-2 pb-5 px-5">
          {DAYS.map((day) => {
            const selected = days.includes(day);
            const isWeekend = day === "토" || day === "일";
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className="w-9 h-9 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: selected ? BRAND_BLUE : "#F3F4F6",
                  color: selected ? "#fff" : isWeekend ? "#EF4444" : "#6B7280",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
        {/* 저장 */}
        <div className="px-5 pb-10 pt-1">
          <button
            onClick={onSave}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:opacity-90 transition-opacity"
            style={{ background: BRAND_BLUE }}
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────── 메인 ───────────────────── */
export default function MyPage() {
  const { user: authUser } = useAuth();

  /* 프로필 */
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const [form, setForm] = useState({ name: "", department: "", position: "", phone: "", email: "" });
  const [saved, setSaved] = useState({ ...form });

  useEffect(() => {
    if (!authUser) return;
    const profile = {
      name: authUser.name,
      department: authUser.department,
      position: authUser.position,
      phone: authUser.phone,
      email: authUser.email,
    };
    setForm(profile);
    setSaved(profile);
  }, [authUser]);

  /* 로그아웃 확인 */
  const [showLogout, setShowLogout] = useState(false);

  /* 회원 탈퇴 */
  const WITHDRAW_REASONS = [
    "인턴 기간이 종료되어서",
    "서비스 이용이 불편해서",
    "개인정보 보호를 위해",
    "더 이상 이용하지 않아서",
    "기타",
  ];
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAgree, setWithdrawAgree] = useState(false);
  const [withdrawPw, setWithdrawPw] = useState("");

  const closeWithdraw = () => {
    setShowWithdraw(false);
    setWithdrawStep(1);
    setWithdrawReason("");
    setWithdrawAgree(false);
    setWithdrawPw("");
  };

  /* 관리자 문의 모달 */
  const ADMIN_EMAIL = "admin@pulmuonedanone.com";
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiry, setInquiry] = useState({ subject: "", content: "" });
  const [inquirySent, setInquirySent] = useState(false);

  const handleSendInquiry = async () => {
    if (authUser) {
      await supabase.from("inquiries").insert({ user_id: authUser.id, subject: inquiry.subject, content: inquiry.content });
    }
    const mailto = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(`[인턴 문의] ${inquiry.subject}`)}&body=${encodeURIComponent(`보내는 사람: ${saved.name} (${saved.department} · ${saved.position})\n\n${inquiry.content}`)}`;
    window.location.href = mailto;
    setInquirySent(true);
  };

  const closeInquiry = () => {
    setShowInquiry(false);
    setInquiry({ subject: "", content: "" });
    setInquirySent(false);
  };

  /* 보안 모달 */
  const [showPwChange, setShowPwChange] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  /* 알람 저장값 */
  const [alarmOn, setAlarmOn] = useState(false);
  const [alarmTime, setAlarmTime] = useState("09:00");
  const [alarmDays, setAlarmDays] = useState<string[]>(["월","화","수","목","금"]);
  const [mealAlarmOn, setMealAlarmOn] = useState(false);
  const [mealAlarmTime, setMealAlarmTime] = useState("12:00");
  const [mealAlarmDays, setMealAlarmDays] = useState<string[]>(["월","화","수","목","금"]);

  useEffect(() => {
    const registerPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        await navigator.serviceWorker.register('/sw.js');
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        });
        if (authUser) {
          await supabase.from('push_subscriptions').upsert({
            user_id: authUser.id,
            subscription: JSON.parse(JSON.stringify(subscription)),
          }, { onConflict: 'user_id' });
        }
      } catch (e) {
        console.warn('Push subscription failed:', e);
      }
    };
    registerPush();
  }, [authUser]);

  useEffect(() => {
    const fetchAlarm = async () => {
      if (!authUser) return;
      const { data } = await supabase.from("alarm_settings").select("*").eq("id", authUser.id).single();
      if (data) {
        setAlarmOn(data.alarm_on ?? false);
        setAlarmTime(data.alarm_time ?? "09:00");
        setAlarmDays(data.alarm_days ?? ["월","화","수","목","금"]);
        setMealAlarmOn(data.meal_alarm_on ?? false);
        setMealAlarmTime(data.meal_alarm_time ?? "12:00");
        setMealAlarmDays(data.meal_alarm_days ?? ["월","화","수","목","금"]);
      }
    };
    fetchAlarm();
  }, [authUser]);

  /* 알람 모달 임시값 */
  const [activeAlarm, setActiveAlarm] = useState<"근태" | "식대" | null>(null);
  const [tempTime, setTempTime] = useState("09:00");
  const [tempDays, setTempDays] = useState<string[]>([]);

  const openAlarm = (type: "근태" | "식대") => {
    setTempTime(type === "근태" ? alarmTime : mealAlarmTime);
    setTempDays(type === "근태" ? alarmDays : mealAlarmDays);
    setActiveAlarm(type);
  };
  const saveAlarm = async () => {
    const newAlarmTime = activeAlarm === "근태" ? tempTime : alarmTime;
    const newAlarmDays = activeAlarm === "근태" ? tempDays : alarmDays;
    const newMealTime = activeAlarm === "식대" ? tempTime : mealAlarmTime;
    const newMealDays = activeAlarm === "식대" ? tempDays : mealAlarmDays;
    if (activeAlarm === "근태") { setAlarmTime(tempTime); setAlarmDays(tempDays); }
    else { setMealAlarmTime(tempTime); setMealAlarmDays(tempDays); }
    if (authUser) {
      await supabase.from("alarm_settings").upsert({
        id: authUser.id,
        alarm_on: alarmOn,
        alarm_time: newAlarmTime,
        alarm_days: newAlarmDays,
        meal_alarm_on: mealAlarmOn,
        meal_alarm_time: newMealTime,
        meal_alarm_days: newMealDays,
      });
    }
    setActiveAlarm(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-white text-gray-800 text-sm px-5 py-3 rounded-2xl shadow-2xl border border-gray-100">
            <span className="text-green-500 text-base">✓</span>
            {toast}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="flex-shrink-0 px-5 pt-10 pb-4 bg-blue-600">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl font-bold shadow" style={{ color: BRAND_BLUE }}>
            {saved.name[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg leading-tight">{saved.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
              {saved.department} · {saved.position}
            </p>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <div className="flex flex-col gap-2.5 px-4 pt-3 pb-24">

        {/* 내 계정 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <SectionLabel Icon={Pencil} label="내 계정" color={BRAND_BLUE} />
          <MenuItem Icon={User} label="프로필 수정" onClick={() => setShowEdit(true)} />
        </section>

        {/* 알림 설정 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <SectionLabel Icon={Bell} label="알림 설정" color={BRAND_BLUE} />
          <AlarmRow Icon={AlarmClock} label="근태" on={alarmOn} time={alarmTime} days={alarmDays} onToggle={() => setAlarmOn((v) => !v)} onOpenDetail={() => openAlarm("근태")} />
          <AlarmRow Icon={Utensils} label="식대" on={mealAlarmOn} time={mealAlarmTime} days={mealAlarmDays} onToggle={() => setMealAlarmOn((v) => !v)} onOpenDetail={() => openAlarm("식대")} />
        </section>

        {/* 보안 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <SectionLabel Icon={Lock} label="보안" color={BRAND_GREEN} />
          <MenuItem Icon={KeyRound} label="비밀번호 변경" onClick={() => setShowPwChange(true)} />
        </section>

        {/* 문의 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <SectionLabel Icon={MessageCircle} label="문의" color={BRAND_BLUE} />
          <MenuItem Icon={Phone} label="관리자 문의" onClick={() => setShowInquiry(true)} />
        </section>

        {/* 로그아웃 + 회원탈퇴 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <MenuItem Icon={LogOut} label="로그아웃" onClick={() => setShowLogout(true)} />
          <MenuItem Icon={Trash2} label="회원탈퇴" onClick={() => setShowWithdraw(true)} />
        </section>

      </div>

      <BottomNav />

      {/* 프로필 수정 모달 */}
      {showEdit && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setForm({ ...saved }); setShowEdit(false); }} />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-800">프로필 수정</p>
              <button onClick={() => { setForm({ ...saved }); setShowEdit(false); }} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {[
                { key: "name", label: "이름", placeholder: "이름을 입력하세요" },
                { key: "department", label: "부서", placeholder: "부서를 입력하세요" },
                { key: "position", label: "직급", placeholder: "직급을 입력하세요" },
                { key: "phone", label: "연락처", placeholder: "010-0000-0000" },
                { key: "email", label: "이메일", placeholder: "example@pulmuonedanone.com" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    placeholder={placeholder}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                  />
                </div>
              ))}
            </div>
            <div className="px-5 pb-8 pt-1">
              <button
                onClick={async () => {
                  if (!authUser) return;
                  await supabase.from("users").update({ name: form.name, department: form.department, position: form.position, phone: form.phone }).eq("id", authUser.id);
                  setSaved({ ...form });
                  setShowEdit(false);
                  showToast("프로필이 수정되었습니다.");
                }}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: BRAND_BLUE }}
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {showPwChange && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPw({ current: "", next: "", confirm: "" }); setShowPwChange(false); }} />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-800">비밀번호 변경</p>
              <button onClick={() => { setPw({ current: "", next: "", confirm: "" }); setShowPwChange(false); }} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {/* 새 비밀번호 조건 안내 - 항상 표시 */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-500 mb-0.5">새 비밀번호 조건</p>
                {[
                  { label: "9자 이상",   met: pw.next.length >= 9 },
                  { label: "영문자 포함", met: /[a-zA-Z]/.test(pw.next) },
                  { label: "숫자 포함",  met: /[0-9]/.test(pw.next) },
                ].map(({ label, met }) => (
                  <p key={label} className="text-xs flex items-center gap-1.5"
                    style={{ color: met ? BRAND_GREEN : "#9CA3AF" }}>
                    <span>{met ? "✓" : "○"}</span>{label}
                  </p>
                ))}
              </div>

              {[
                { key: "current", label: "현재 비밀번호",   placeholder: "현재 비밀번호 입력" },
                { key: "next",    label: "새 비밀번호",     placeholder: "새 비밀번호 입력" },
                { key: "confirm", label: "새 비밀번호 확인", placeholder: "새 비밀번호 재입력" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <input
                    type="password"
                    value={pw[key as keyof typeof pw]}
                    placeholder={placeholder}
                    onChange={(e) => setPw((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                  />
                </div>
              ))}
              {pw.next && pw.confirm && pw.next !== pw.confirm && (
                <p className="text-xs text-red-400">새 비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            <div className="px-5 pb-8 pt-1">
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.updateUser({ password: pw.next });
                  if (error) { alert("비밀번호 변경에 실패했습니다."); return; }
                  alert("비밀번호가 변경되었습니다.");
                  setPw({ current: "", next: "", confirm: "" });
                  setShowPwChange(false);
                }}
                disabled={
                  !pw.current || pw.next.length < 9 ||
                  !/[a-zA-Z]/.test(pw.next) || !/[0-9]/.test(pw.next) ||
                  pw.next !== pw.confirm
                }
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
                style={{ background: BRAND_BLUE }}
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그아웃 확인 다이얼로그 */}
      {showLogout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogout(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl z-10 w-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center">
              <p className="text-sm text-gray-700">로그아웃 하시겠습니까?</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-500 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setShowLogout(false);
                  window.location.href = "/login";
                }}
                className="flex-1 py-3.5 text-sm font-semibold active:bg-red-50 transition-colors"
                style={{ color: "#EF4444" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 문의 모달 */}
      {showInquiry && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeInquiry} />
          <div className="relative bg-white rounded-t-2xl shadow-xl z-10">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-800">관리자 문의</p>
              <button onClick={closeInquiry} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {inquirySent ? (
              /* 전송 완료 화면 */
              <div className="flex flex-col items-center py-10 px-5 gap-3">
                <span className="text-4xl">✅</span>
                <p className="text-base font-bold text-gray-800">문의가 전송되었습니다</p>
                <p className="text-xs text-gray-400 text-center">
                  관리자가 확인 후 등록된 이메일로<br />답변 드릴 예정입니다.
                </p>
                <button
                  onClick={closeInquiry}
                  className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: BRAND_BLUE }}
                >
                  확인
                </button>
              </div>
            ) : (
              /* 작성 화면 */
              <>
                <div className="px-5 py-4 flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">제목</p>
                    <input
                      type="text"
                      value={inquiry.subject}
                      placeholder="문의 제목을 입력해주세요"
                      onChange={(e) => setInquiry((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">문의 내용</p>
                    <textarea
                      value={inquiry.content}
                      placeholder="문의 내용을 자세히 작성해주세요"
                      rows={5}
                      onChange={(e) => setInquiry((p) => ({ ...p, content: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none"
                    />
                  </div>
                  <p className="text-xs text-gray-300">
                    수신: {ADMIN_EMAIL}
                  </p>
                </div>
                <div className="px-5 pb-8 pt-1">
                  <button
                    onClick={handleSendInquiry}
                    disabled={!inquiry.subject.trim() || !inquiry.content.trim()}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
                    style={{ background: BRAND_BLUE }}
                  >
                    전송하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 회원 탈퇴 모달 */}
      {showWithdraw && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeWithdraw} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl z-10">

            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  {withdrawStep} / 3
                </span>
                <p className="text-base font-bold text-gray-800">
                  {withdrawStep === 1 ? "탈퇴 안내" : withdrawStep === 2 ? "탈퇴 사유" : "최종 확인"}
                </p>
              </div>
              <button onClick={closeWithdraw} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {/* ── STEP 1: 탈퇴 안내 ── */}
            {withdrawStep === 1 && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  {/* 비활성화 안내 */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50">
                    <span className="text-lg mt-0.5">🔒</span>
                    <p className="text-xs text-orange-500 font-medium leading-relaxed">
                      탈퇴 시 계정이 <span className="font-bold">즉시 비활성화</span>되어 로그인이 불가능해집니다.<br />
                      단, 데이터는 <span className="font-bold">1년간 보관</span>되며 관리자를 통해 복구 요청이 가능합니다.
                    </p>
                  </div>
                  {/* 비활성화 항목 */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-500">탈퇴 후 비활성화</p>
                    {["계정 로그인 불가", "앱 서비스 이용 불가", "알림 수신 중단"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="text-xs text-orange-400">●</span>
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>
                  {/* 보관 항목 */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-500">1년간 보관 후 완전 삭제 (복구 가능)</p>
                    {["프로필 및 계정 정보", "근태 기록 전체", "식대 사용 내역"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: BRAND_GREEN }}>●</span>
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-1">
                      * 복구 요청은 관리자 문의를 통해 가능합니다.
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-8 flex gap-3">
                  <button onClick={closeWithdraw}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 active:bg-gray-50">
                    취소
                  </button>
                  <button onClick={() => setWithdrawStep(2)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#EF4444" }}>
                    다음
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: 탈퇴 사유 ── */}
            {withdrawStep === 2 && (
              <>
                <div className="px-5 py-4 flex flex-col gap-2">
                  <p className="text-xs text-gray-400 mb-1">탈퇴 사유를 선택해주세요 (선택)</p>
                  {WITHDRAW_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setWithdrawReason(reason)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left"
                      style={{
                        borderColor: withdrawReason === reason ? "#EF4444" : "#E5E7EB",
                        background: withdrawReason === reason ? "#FEF2F2" : "#fff",
                      }}
                    >
                      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: withdrawReason === reason ? "#EF4444" : "#D1D5DB" }}>
                        {withdrawReason === reason && (
                          <span className="w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
                        )}
                      </span>
                      <span className="text-sm text-gray-700">{reason}</span>
                    </button>
                  ))}
                </div>
                <div className="px-5 pb-8 flex gap-3">
                  <button onClick={() => setWithdrawStep(1)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500">
                    이전
                  </button>
                  <button onClick={() => setWithdrawStep(3)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#EF4444" }}>
                    다음
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: 최종 확인 ── */}
            {withdrawStep === 3 && (
              <>
                <div className="px-5 py-4 flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">비밀번호 확인</p>
                    <input
                      type="password"
                      value={withdrawPw}
                      placeholder="현재 비밀번호를 입력해주세요"
                      onChange={(e) => setWithdrawPw(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <button
                    onClick={() => setWithdrawAgree((v) => !v)}
                    className="flex items-start gap-3 text-left"
                  >
                    <span className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                      style={{ borderColor: withdrawAgree ? "#EF4444" : "#D1D5DB", background: withdrawAgree ? "#EF4444" : "#fff" }}>
                      {withdrawAgree && <span className="text-white text-xs font-bold">✓</span>}
                    </span>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      탈퇴 시 계정이 비활성화되며, 데이터는 1년간 보관 후 완전 삭제됨을 확인했습니다.
                    </span>
                  </button>
                </div>
                <div className="px-5 pb-8 flex gap-3">
                  <button onClick={() => setWithdrawStep(2)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500">
                    이전
                  </button>
                  <button
                    disabled={!withdrawPw || !withdrawAgree}
                    onClick={async () => {
                      if (!authUser) return;
                      await supabase.from("users").update({ is_active: false }).eq("id", authUser.id);
                      await supabase.auth.signOut();
                      closeWithdraw();
                      window.location.href = "/login";
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                    style={{ background: "#EF4444" }}>
                    탈퇴하기
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 알람 모달 */}
      {activeAlarm && (
        <AlarmModal
          title={`${activeAlarm} 알림`}
          time={tempTime}
          days={tempDays}
          onTimeChange={setTempTime}
          onDaysChange={setTempDays}
          onSave={saveAlarm}
          onClose={() => setActiveAlarm(null)}
        />
      )}
    </div>
  );
}
