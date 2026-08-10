"use client";

const ELLIPSIS_THRESHOLD = 10;

function getPageNumbers(current: number, total: number, siblings: number): (number | "…")[] {
  const result: (number | "…")[] = [1];
  if (current > siblings + 2) result.push("…");
  for (let p = Math.max(2, current - siblings); p <= Math.min(total - 1, current + siblings); p++) result.push(p);
  if (current < total - siblings - 1) result.push("…");
  result.push(total);
  return result;
}

interface PaginationProps {
  current: number;
  total: number;
  onChange: (page: number) => void;
  activeClass?: string;
  size?: "sm" | "md";
}

export default function Pagination({
  current,
  total,
  onChange,
  activeClass = "bg-[#8dc63f] text-white",
  size = "md",
}: PaginationProps) {
  if (total <= 1) return null;
  const btn = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  const useEllipsis = total > ELLIPSIS_THRESHOLD;
  const siblings = size === "sm" ? 1 : 2;
  const pages: (number | "…")[] = useEllipsis
    ? getPageNumbers(current, total, siblings)
    : Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1">
      {useEllipsis && (
        <button
          onClick={() => onChange(1)}
          disabled={current === 1}
          className={`${btn} flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30`}
        >«</button>
      )}
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className={`${btn} flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 text-xl leading-none`}
      >‹</button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`el-${i}`} className={`${btn} flex items-center justify-center text-gray-400`}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btn} flex items-center justify-center rounded-full font-medium transition-colors ${
              p === current ? activeClass : "text-gray-500 hover:bg-gray-100"
            }`}
          >{p}</button>
        )
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className={`${btn} flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30 text-xl leading-none`}
      >›</button>
      {useEllipsis && (
        <button
          onClick={() => onChange(total)}
          disabled={current === total}
          className={`${btn} flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30`}
        >»</button>
      )}
    </div>
  );
}
