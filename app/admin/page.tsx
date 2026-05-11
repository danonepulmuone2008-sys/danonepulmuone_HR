"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "@/components/AdminBottomNav";
import { supabase } from "@/lib/supabase";

const INTERN_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626"];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "09:02" + "2026-05-11" → "2026-05-11T09:02:00+09:00"
function toTimestamptz(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

// "2026-05-11T09:02:00+09:00" → "09:02"
function toTimeStr(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type AttendanceRecord = {
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
};

export default function AdminHomePage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [showLogout, setShowLogout] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(getTodayStr());
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTodayAttendance();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("id, name, phone, email")
      .eq("is_active", true)
      .order("name");
    if (data) setUsers(data);
  }

  async function fetchTodayAttendance() {
    const { data } = await supabase
      .from("attendance_records")
      .select("user_id, date, clock_in, clock_out")
      .eq("date", getTodayStr());
    if (data) setTodayAttendance(data);
  }

  function getAttendanceStatus(userId: string): "출근" | "퇴근" | null {
    const record = todayAttendance.find((r) => r.user_id === userId);
    if (!record || !record.clock_in) return null;
    return record.clock_out ? "퇴근" : "출근";
  }

  function openEdit(userId: string) {
    const record = todayAttendance.find((r) => r.user_id === userId);
    setEditDate(getTodayStr());
    setEditCheckIn(record?.clock_in ? toTimeStr(record.clock_in) : "");
    setEditCheckOut(record?.clock_out ? toTimeStr(record.clock_out) : "");
    setEditUserId(userId);
  }

  async function handleDateChange(date: string) {
    setEditDate(date);
    if (!editUserId) return;
    const { data } = await supabase
      .from("attendance_records")
      .select("clock_in, clock_out")
      .eq("user_id", editUserId)
      .eq("date", date)
      .single();
    setEditCheckIn(data?.clock_in ? toTimeStr(data.clock_in) : "");
    setEditCheckOut(data?.clock_out ? toTimeStr(data.clock_out) : "");
  }

  async function saveAttendance() {
    if (!editUserId) return;
    setSaving(true);
    const { error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          user_id: editUserId,
          date: editDate,
          clock_in: editCheckIn ? toTimestamptz(editDate, editCheckIn) : null,
          clock_out: editCheckOut ? toTimestamptz(editDate, editCheckOut) : null,
        },
        { onConflict: "user_id,date" }
      );

    if (!error) {
      await fetchTodayAttendance();
      setEditUserId(null);
    } else {
      alert("저장 중 오류가 발생했습니다: " + error.message);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const editUser = users.find((u) => u.id === editUserId);
  const editUserIndex = users.findIndex((u) => u.id === editUserId);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="bg-white px-5 pt-5 pb-2 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">관리자</h1>
          <p className="text-xs text-gray-400 mt-0.5">인턴 현황</p>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="mt-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </header>

      <div className="flex flex-col gap-2 px-4 pt-2">
        {users.map((user, i) => {
          const status = getAttendanceStatus(user.id);
          return (
            <div
              key={user.id}
              className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: INTERN_HEX[i % INTERN_HEX.length] }}
                  >
                    {user.name.slice(0, 1)}
                  </div>
                  <p className="text-base font-bold text-gray-900">{user.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
                      status === "출근"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {status ?? "미출근"}
                  </span>
                  <button
                    onClick={() => openEdit(user.id)}
                    className="text-base text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 pl-13">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">전화</span>
                  <span className="text-sm text-gray-700">{user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-12">이메일</span>
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 로그아웃 확인 */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-6 py-5 mx-6 shadow-xl w-full max-w-xs">
            <p className="text-base font-semibold text-gray-900 text-center mb-5">
              로그아웃하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
              >
                아니오
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-xl text-sm text-white font-semibold"
                style={{ backgroundColor: "#8dc63f" }}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 바텀시트 */}
      {editUserId && editUser && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setEditUserId(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: INTERN_HEX[editUserIndex % INTERN_HEX.length] }}
                >
                  {editUser.name.slice(0, 1)}
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editUser.name} 수정
                </h3>
              </div>
              <button
                onClick={() => setEditUserId(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl"
              >
                ×
              </button>
            </div>

            {/* 출퇴근 시간 수정 */}
            <div className="px-5 pt-4">
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1.5 block">날짜</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              <div className="flex gap-3 mb-5">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1.5 block">출근 시간</label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1.5 block">퇴근 시간</label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#8dc63f" }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
