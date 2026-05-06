"use client";
import { useRouter } from "next/navigation";

interface AppBarProps {
  title: string;
}

export default function AppBar({ title }: AppBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 w-full bg-white border-b border-gray-200 flex items-center h-14 px-4 z-10">
      <button
        onClick={() => router.back()}
        className="flex items-center justify-center w-8 h-8 mr-3 text-blue-600"
      >
        ←
      </button>
      <h1 className="font-semibold text-gray-900 text-base">{title}</h1>
    </header>
  );
}
