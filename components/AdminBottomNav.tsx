"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, UtensilsCrossed, MessageSquare } from "lucide-react";
import { ADMIN_DUMMY } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/admin",            label: "홈",    Icon: Home },
  { href: "/admin/attendance", label: "근태",  Icon: ClipboardList },
  { href: "/admin/meals",      label: "식대",  Icon: UtensilsCrossed },
  { href: "/admin/inquiry",    label: "문의함", Icon: MessageSquare },
];

export default function AdminBottomNav() {
  const pathname = usePathname();
  const unreadCount = ADMIN_DUMMY.inquiries.filter((q) => !q.isRead).length;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 flex z-50">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        const isInquiry = href === "/admin/inquiry";
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <span className="relative inline-flex">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {isInquiry && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </span>
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
