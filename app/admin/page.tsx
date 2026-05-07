import AdminBottomNav from "@/components/AdminBottomNav";
import { ADMIN_DUMMY } from "@/lib/api";

const INTERN_COLORS = ["bg-blue-500", "bg-green-500", "bg-orange-400", "bg-purple-500", "bg-pink-500"];

export default function AdminHomePage() {
  const { interns } = ADMIN_DUMMY;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="bg-white px-5 pt-8 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">관리자</h1>
        <p className="text-xs text-gray-400 mt-0.5">인턴 현황</p>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-3">
        {interns.map((intern, i) => (
          <div
            key={intern.id}
            className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0 ${INTERN_COLORS[i]}`}>
                {intern.name.slice(0, 1)}
              </div>
              <p className="text-base font-bold text-gray-900">{intern.name}</p>
            </div>
            <div className="flex flex-col gap-1 pl-13">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">전화</span>
                <span className="text-sm text-gray-700">{intern.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">이메일</span>
                <span className="text-sm text-gray-700">{intern.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminBottomNav />
    </div>
  );
}
