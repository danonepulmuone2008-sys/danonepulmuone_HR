"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "⊞" },
  { href: "/attendance", label: "근태", icon: "📋" },
  { href: "/meals", label: "식대", icon: "🍽" },
  { href: "/mypage", label: "마이", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 flex z-50">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className={active ? "font-semibold" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
