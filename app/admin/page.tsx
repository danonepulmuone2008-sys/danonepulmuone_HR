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
  department: string;
  position: string;
  role: string;
  is_active: boolean;
};

type EditForm = {
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
};

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export default function AdminHomePage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [todayStatusMap, setTodayStatusMap] = useState<Record<string, "출근" | "퇴근">>({});
  const [showLogout, setShowLogout] = useState(false);

  // 정보 수정
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTodayAttendance();
  }, []);

  async function fetchUsers() {
    const token = await getToken();
    const res = await fetch("/api/admin/users-profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
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

  function openEdit(user: User) {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      department: user.department ?? "",
      position: user.position ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
      role: user.role ?? "employee",
      is_active: user.is_active,
    });
  }

  async function saveEdit() {
    if (!editTarget || !editForm) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/users-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editTarget.id, ...editForm }),
      });
      if (res.ok) {
        await fetchUsers();
        setEditTarget(null);
        setEditForm(null);
      }
    } finally {
      setSaving(false);
    }
  }

  const colorMap = buildColorMap(users);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="bg-white px-5 pt-5 pb-2 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">관리자</h1>
          <p className="text-xs text-gray-400 mt-0.5">직원 현황</p>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="mt-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </header>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {users.map((user) => {
          const status = getAttendanceStatus(user.id);
          const ci = colorMap.get(user.id) ?? 0;
          const inactive = !user.is_active;
          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl px-4 py-3 shadow-sm border transition-opacity ${inactive ? "border-gray-100 opacity-50" : "border-gray-100"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                    style={{ backgroundColor: inactive ? "#ccc" : getInternColor(ci) }}
                  >
                    {user.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      {inactive && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">비활성</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{user.department}{user.position ? ` · ${user.position}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!inactive && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      status === "출근" ? "bg-orange-100 text-orange-500"
                      : status === "퇴근" ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                    }`}>
                      {status ?? "미출근"}
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(user)}
                    className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors"
                  >
                    수정
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 pl-13">
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12">전화</span>
                    <span className="text-xs text-gray-600">{user.phone}</span>
                  </div>
                )}
                {user.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12">이메일</span>
                    <span className="text-xs text-gray-600">{user.email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 로그아웃 모달 */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-6 py-5 mx-6 shadow-xl w-full max-w-xs">
            <p className="text-base font-semibold text-gray-900 text-center mb-5">로그아웃하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">아니오</button>
              <button onClick={handleLogout} className="flex-1 h-11 rounded-xl text-sm text-white font-semibold" style={{ backgroundColor: "#8dc63f" }}>예</button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 수정 바텀시트 */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-8" onClick={() => { setEditTarget(null); setEditForm(null); }}>
          <div className="bg-white rounded-t-2xl w-full max-w-[390px] pb-10 flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">{editTarget.name} 정보 수정</h3>
                <p className="text-xs text-gray-400 mt-0.5">직원 정보를 수정하세요</p>
              </div>
              <button onClick={() => { setEditTarget(null); setEditForm(null); }} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl hover:text-gray-600">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pt-4 pb-2">
              <div className="flex flex-col gap-3">
                {([
                  { key: "name", label: "이름" },
                  { key: "department", label: "부서" },
                  { key: "position", label: "직급" },
                  { key: "phone", label: "연락처" },
                  { key: "email", label: "이메일" },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</label>
                    <input
                      type={key === "email" ? "email" : "text"}
                      value={editForm[key]}
                      onChange={(e) => setEditForm((f) => f ? { ...f, [key]: e.target.value } : f)}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-gray-50"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">권한</label>
                  <div className="flex gap-2">
                    {["employee", "admin"].map((r) => (
                      <button key={r} onClick={() => setEditForm((f) => f ? { ...f, role: r } : f)}
                        className={`flex-1 h-11 rounded-xl text-sm font-medium border transition-colors ${editForm.role === r ? "bg-blue-500 text-white border-blue-500" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {r === "employee" ? "직원" : "관리자"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">재직 상태</label>
                  <div className="flex gap-2">
                    {([true, false] as const).map((v) => (
                      <button key={String(v)} onClick={() => setEditForm((f) => f ? { ...f, is_active: v } : f)}
                        className={`flex-1 h-11 rounded-xl text-sm font-medium border transition-colors ${editForm.is_active === v ? (v ? "bg-green-500 text-white border-green-500" : "bg-gray-400 text-white border-gray-400") : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {v ? "활성" : "비활성"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={saveEdit} disabled={saving}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40 mt-1"
                  style={{ backgroundColor: "#8dc63f" }}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminBottomNav />
    </div>
  );
}
