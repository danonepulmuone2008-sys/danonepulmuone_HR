import BottomNav from "@/components/BottomNav";
import { DUMMY } from "@/lib/api";

export default function MyPage() {
  const { user } = DUMMY;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* 헤더 */}
      <header className="bg-blue-600 px-5 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-blue-600 text-xl font-bold">
            {user.name[0]}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{user.name}</p>
            <p className="text-blue-200 text-sm">{user.department} · {user.position}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-5">
        {/* 계정 정보 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-xs font-medium text-gray-400 px-4 pt-4 pb-2">계정 정보</p>
          {[
            { label: "이름", value: user.name },
            { label: "부서", value: user.department },
            { label: "직급", value: user.position },
            { label: "사번", value: user.id },
          ].map((item) => (
            <div
              key={item.label}
              className="flex justify-between items-center px-4 py-3.5 border-t border-gray-50"
            >
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>

        {/* 로그아웃 */}
        <button className="w-full py-4 bg-white border border-gray-200 text-red-500 rounded-2xl text-sm font-semibold active:scale-95 transition-all">
          로그아웃
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
