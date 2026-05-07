"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_DUMMY } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/admin", label: "홈", icon: "⊞" },
  { href: "/admin/attendance", label: "근태", icon: "📋" },
  { href: "/admin/meals", label: "식대", icon: "🍽" },
  { href: "/admin/inquiry", label: "문의함", icon: "✉️" },
];

export default function AdminBottomNav() {
  const pathname = usePathname();
  const unreadCount = ADMIN_DUMMY.inquiries.filter((q) => !q.isRead).length;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-100 flex z-50">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const isInquiry = item.href === "/admin/inquiry";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              active ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <span className="text-lg leading-none relative inline-block">
              {item.icon}
              {isInquiry && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
