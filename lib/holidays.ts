// 한국 공휴일 목록 (연도별 하드코딩)
// 매년 업데이트 필요 — 공식 출처: 인사혁신처 공공데이터
const KOREAN_HOLIDAYS: Record<number, string[]> = {
  2025: [
    "2025-01-01", // 신정
    "2025-01-28", // 설날연휴
    "2025-01-29", // 설날
    "2025-01-30", // 설날연휴
    "2025-03-01", // 삼일절 (토요일)
    "2025-03-03", // 삼일절 대체공휴일
    "2025-05-05", // 어린이날·부처님오신날
    "2025-05-06", // 어린이날 대체공휴일
    "2025-06-06", // 현충일
    "2025-08-15", // 광복절
    "2025-10-03", // 개천절
    "2025-10-05", // 추석연휴
    "2025-10-06", // 추석
    "2025-10-07", // 추석연휴
    "2025-10-08", // 추석 대체공휴일
    "2025-10-09", // 한글날
    "2025-12-25", // 크리스마스
  ],
  2026: [
    "2026-01-01", // 신정
    "2026-02-16", // 설날연휴
    "2026-02-17", // 설날
    "2026-02-18", // 설날연휴
    "2026-03-01", // 삼일절 (일요일)
    "2026-03-02", // 삼일절 대체공휴일
    "2026-05-01", // 근로자의날
    "2026-05-04", // 사내 자체 휴일
    "2026-05-05", // 어린이날
    "2026-05-24", // 부처님오신날 (일요일)
    "2026-05-25", // 부처님오신날 대체공휴일
    "2026-06-03", // 지방선거일
    "2026-06-06", // 현충일
    "2026-08-15", // 광복절 (토요일)
    "2026-08-17", // 광복절 대체공휴일 (월)
    "2026-09-24", // 추석연휴
    "2026-09-25", // 추석
    "2026-09-26", // 추석연휴 (토요일)
    "2026-09-28", // 추석 대체공휴일
    "2026-10-03", // 개천절 (토요일)
    "2026-10-05", // 개천절 대체공휴일 (월)
    "2026-10-09", // 한글날
    "2026-12-25", // 크리스마스
  ],
};

function getHolidaySet(year: number): Set<string> {
  return new Set(KOREAN_HOLIDAYS[year] ?? []);
}

export function getMonthlyBusinessDays(year: number, month: number): number {
  const holidays = getHolidaySet(year);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay(); // 0=일, 6=토
    if (dow === 0 || dow === 6) continue;

    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (holidays.has(key)) continue;

    count++;
  }

  return count;
}

// 영업일 * 10,000원
export function getMealLimit(year: number, month: number): number {
  return getMonthlyBusinessDays(year, month) * 10000;
}

export function isHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.substring(0, 4));
  return getHolidaySet(year).has(dateStr);
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// 해당 주(monday 기준)의 영업일 수 반환 — 공휴일 제외한 월~금
export function getWorkingDaysInWeek(monday: Date): number {
  const yearSet = new Map<number, Set<string>>();
  let count = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const yr = d.getFullYear();
    if (!yearSet.has(yr)) yearSet.set(yr, getHolidaySet(yr));
    if (!yearSet.get(yr)!.has(fmtDate(d))) count++;
  }
  return count;
}
