"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import { ko } from "react-day-picker/locale"
import type { Matcher } from "react-day-picker"

interface Props {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  placeholder?: string
  className?: string
  triggerClass?: string
}

function parseYMD(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + "T00:00:00")
  return isNaN(d.getTime()) ? undefined : d
}

function fmtDisplay(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}. ${m}. ${day}`
}

function fmtValue(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "날짜 선택",
  className = "",
  triggerClass = "h-11 px-4",
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const selected = parseYMD(value)
  const minDate = parseYMD(min)
  const maxDate = parseYMD(max)

  const disabled: Matcher[] = []
  if (minDate) disabled.push({ before: minDate })
  if (maxDate) disabled.push({ after: maxDate })

  const sheet = open && mounted ? createPortal(
    <>
      {/* 배경 딤 */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={() => setOpen(false)}
      />
      {/* 바텀시트 */}
      <div
        className="fixed bottom-0 z-[9999] bg-white rounded-t-3xl w-full"
        style={{ maxWidth: 390, left: "50%", transform: "translateX(-50%)" }}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">날짜 선택</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-gray-400 font-medium"
          >
            닫기
          </button>
        </div>
        {/* 달력 */}
        <div className="dp-sheet flex justify-center px-2 py-3 pb-6">
          <DayPicker
            mode="single"
            locale={ko}
            navLayout="around"
            selected={selected}
            defaultMonth={selected ?? minDate}
            disabled={disabled.length ? disabled : undefined}
            onSelect={d => {
              if (d) {
                onChange(fmtValue(d))
                setOpen(false)
              }
            }}
          />
        </div>
      </div>
    </>,
    document.body
  ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-left outline-none focus:border-blue-500 ${triggerClass}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400 shrink-0"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? fmtDisplay(selected) : placeholder}
        </span>
      </button>
      {sheet}
    </div>
  )
}
