"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "@/components/AdminBottomNav";
import { supabase } from "@/lib/supabase";
import { getInternColor, buildColorMap } from "@/lib/internColors";

type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export default function AdminHomePage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [todayStatusMap, setTodayStatusMap] = useState<Record<string, "출근" | "퇴근">>({});
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTodayAttendance();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users-profile");
    const json = await res.json();
    if (json.interns) setUsers(json.interns);
  }

  async function fetchTodayAttendance() {
    const res = await fetch("/api/admin/attendance/today");
    const json = await res.json();
    if (json.statusMap) setTodayStatusMap(json.statusMap);
  }

  function getAttendanceStatus(userId: string): "출근" | "퇴근" | null {
    return todayStatusMap[userId] ?? null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const colorMap = buildColorMap(users);

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
        {users.map((user) => {
          const status = getAttendanceStatus(user.id);
          const ci = colorMap.get(user.id) ?? 0;
          return (
            <div
              key={user.id}
              className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: getInternColor(ci) }}
                  >
                    {user.name.slice(0, 1)}
                  </div>
                  <p className="text-base font-bold text-gray-900">{user.name}</p>
                </div>
                <span
                  className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
                    status === "출근"
                      ? "bg-orange-100 text-orange-500"
                      : status === "퇴근"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {status ?? "미출근"}
                </span>
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

      <AdminBottomNav />
    </div>
  );
}
