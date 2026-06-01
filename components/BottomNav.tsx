"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, UtensilsCrossed, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/",           label: "홈",  Icon: Home },
  { href: "/attendance", label: "근태", Icon: ClipboardList },
  { href: "/meals",      label: "식대", Icon: UtensilsCrossed },
  { href: "/mypage",     label: "마이", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasPendingMeals, setHasPendingMeals] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    Promise.all([
      supabase.from("receipt_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
      fetch("/api/meals/transfers", { headers: { Authorization: `Bearer ${user.token}` } })
        .then((r) => r.ok ? r.json() : [])
        .then((data: unknown[]) => ({ count: Array.isArray(data) ? data.length : 0 })),
    ]).then(([receipts, transfers]) => {
      setHasPendingMeals(((receipts.count ?? 0) + transfers.count) > 0);
    });
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 flex z-50">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        const showBadge = href === "/meals" && hasPendingMeals;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
