import { create } from "zustand"

export interface AttendanceProfile {
  name: string
  department: string
  position: string
  is_remote: boolean
  use_session_tracking: boolean
}

interface AttendanceState {
  profile: AttendanceProfile
  clockIn: string | null
  clockOut: string | null
  openSessionId: string | null
  todaySessions: { start: string; end: string | null; date?: string }[]
  weeklyHours: number
  weeklyGoal: number
  loaded: boolean
  loading: boolean

  fetchAll: (token: string) => Promise<void>
  doClockIn: (time: string, sessionId?: string | null) => void
  doClockOut: (time: string) => void
  addSession: (start: string, sessionId: string, date?: string) => void
  closeSession: (endTime: string) => void
  addWeeklyHours: (delta: number) => void
  reset: () => void
}

const DEFAULT_PROFILE: AttendanceProfile = {
  name: "", department: "", position: "", is_remote: false, use_session_tracking: false,
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  clockIn: null,
  clockOut: null,
  openSessionId: null,
  todaySessions: [],
  weeklyHours: 0,
  weeklyGoal: 0,
  loaded: false,
  loading: false,

  fetchAll: async (token: string) => {
    if (get().loading) return
    set({ loading: true })
    try {
      const res = await fetch("/api/attendance/home-summary", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      set({
        profile: data.profile ?? DEFAULT_PROFILE,
        clockIn: data.today?.clockIn ?? null,
        clockOut: data.today?.clockOut ?? null,
        openSessionId: data.today?.openSessionId ?? null,
        todaySessions: data.today?.todaySessions ?? [],
        weeklyHours: data.weeklyHours ?? 0,
        weeklyGoal: data.weeklyGoal ?? 0,
        loaded: true,
      })
    } finally {
      set({ loading: false })
    }
  },

  doClockIn: (time, sessionId = null) => {
    set({ clockIn: time, clockOut: null })
    if (sessionId !== null) {
      set((s) => ({
        openSessionId: sessionId,
        todaySessions: [...s.todaySessions, { start: time, end: null }],
      }))
    }
  },

  doClockOut: (time) => {
    set((s) => {
      if (s.profile.use_session_tracking) {
        return {
          clockIn: null,
          openSessionId: null,
          todaySessions: s.todaySessions.map(sess =>
            sess.end === null ? { ...sess, end: time } : sess
          ),
        }
      }
      return { clockOut: time }
    })
  },

  addSession: (start, sessionId, date) => {
    set((s) => ({
      clockIn: start,
      openSessionId: sessionId,
      todaySessions: [...s.todaySessions, { start, end: null, date }],
    }))
  },

  closeSession: (endTime) => {
    set((s) => ({
      clockIn: null,
      openSessionId: null,
      todaySessions: s.todaySessions.map(sess =>
        sess.end === null ? { ...sess, end: endTime } : sess
      ),
    }))
  },

  addWeeklyHours: (delta) => {
    set((s) => ({ weeklyHours: s.weeklyHours + delta }))
  },

  reset: () => {
    set({
      profile: DEFAULT_PROFILE,
      clockIn: null, clockOut: null,
      openSessionId: null, todaySessions: [],
      weeklyHours: 0, weeklyGoal: 0,
      loaded: false, loading: false,
    })
  },
}))
