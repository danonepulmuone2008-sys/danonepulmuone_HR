"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, UtensilsCrossed, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",           label: "홈",  Icon: Home },
  { href: "/attendance", label: "근태", Icon: ClipboardList },
  { href: "/meals",      label: "식대", Icon: UtensilsCrossed },
  { href: "/mypage",     label: "마이", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 flex z-50">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
