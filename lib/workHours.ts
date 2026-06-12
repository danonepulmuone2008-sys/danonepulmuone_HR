// 근무시간 계산 보조: 시간 휴가(시간 단위)와 겹치는 근무 구간을 차감하기 위한 유틸

const KST = 9 * 60 * 60 * 1000

// timestamptz → KST 기준 하루 중 분(0~1439)
export function kstMinutesOfDay(ts: string): number {
  const d = new Date(new Date(ts).getTime() + KST)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

export type HourlyVacWindow = { startMin: number; endMin: number }

// vacation_requests 행(시간 휴가)의 start_time/end_time(시 단위 정수)으로 분 단위 창 생성
export function toWindow(startHour: number | null, endHour: number | null): HourlyVacWindow | null {
  if (startHour == null || endHour == null) return null
  const startMin = startHour * 60
  const endMin = endHour * 60
  if (endMin <= startMin) return null
  return { startMin, endMin }
}

// 근무 구간 [inMin, outMin]과 시간 휴가 창들이 겹치는 시간(시간 단위)
export function overlapHours(inMin: number, outMin: number, windows: HourlyVacWindow[]): number {
  if (outMin <= inMin || windows.length === 0) return 0
  let totalMin = 0
  for (const w of windows) {
    totalMin += Math.max(0, Math.min(outMin, w.endMin) - Math.max(inMin, w.startMin))
  }
  return totalMin / 60
}
