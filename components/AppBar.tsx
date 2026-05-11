"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface AppBarProps {
  title: string;
}

export default function AppBar({ title }: AppBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 w-full bg-white border-b border-gray-100 flex items-center h-14 px-4 z-10">
      <button
        onClick={() => router.back()}
        className="p-1.5 -ml-1.5 rounded-full active:bg-gray-100 mr-2"
      >
        <ChevronLeft size={20} className="text-gray-700" />
      </button>
      <h1 className="font-semibold text-gray-900 text-base">{title}</h1>
    </header>
  );
}
