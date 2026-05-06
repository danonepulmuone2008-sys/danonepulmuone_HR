// API endpoints — 나중에 Supabase 실제 연동으로 교체
export const API = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  attendance: {
    list: "/api/attendance",
    businessTrip: "/api/attendance/business-trip",
    vacation: "/api/attendance/vacation",
  },
  meals: {
    list: "/api/meals",
    ocr: "/api/meals/ocr",
  },
  user: {
    profile: "/api/user/profile",
  },
};

// 하드코딩 더미 데이터 — Supabase 연동 전 사용
export const DUMMY = {
  user: {
    id: "user-001",
    name: "조현희",
    department: "HR팀",
    position: "대리",
  },
  attendance: {
    weeklyData: [
      {
        offset: -2,
        label: "4/20~4/24",
        range: "4/20~4/24",
        days: [
          { day: "월", hours: 5.0 },
          { day: "화", hours: 5.0 },
          { day: "수", hours: 5.0 },
          { day: "목", hours: 5.0 },
          { day: "금", hours: 5.0 },
        ],
      },
      {
        offset: -1,
        label: "4/27~5/1",
        range: "4/27~5/1",
        days: [
          { day: "월", hours: 5.0 },
          { day: "화", hours: 5.0 },
          { day: "수", hours: 4.5 },
          { day: "목", hours: 5.0 },
          { day: "금", hours: 4.5 },
        ],
      },
      {
        offset: 0,
        label: "이번 주",
        range: "5/4~5/8",
        days: [
          { day: "월", hours: 5.0 },
          { day: "화", hours: 4.5 },
          { day: "수", hours: 3.0 },
          { day: "목", hours: 0 },
          { day: "금", hours: 0 },
        ],
      },
    ],
    myEvents: [
      { date: "2026-05-12", type: "vacation", label: "연차", time: "종일", status: "승인완료" },
      { date: "2026-05-15", type: "businessTrip", label: "부산 출장", time: "09:00~18:00", destination: "부산", status: "승인대기" },
      { date: "2026-05-19", type: "vacation", label: "반차(오전)", time: "09:00~13:00", status: "승인완료" },
      { date: "2026-05-27", type: "businessTrip", label: "대전 출장", time: "10:00~17:00", destination: "대전", status: "승인완료" },
      { date: "2026-05-28", type: "businessTrip", label: "광주 출장", time: "09:00~18:00", destination: "광주", status: "승인대기" },
    ],
    teamEvents: [
      { date: "2026-05-08", member: "김민준", type: "vacation", label: "연차", time: "종일" },
      { date: "2026-05-13", member: "이서연", type: "businessTrip", label: "출장", time: "10:00~17:00", destination: "서울" },
      { date: "2026-05-20", member: "박준혁", type: "vacation", label: "반차(오후)", time: "13:00~18:00" },
      { date: "2026-05-22", member: "최지영", type: "businessTrip", label: "출장", time: "09:00~18:00", destination: "대전" },
      // 실제 구현 시 Supabase에서 팀원 신청 내역을 fetch하여 대체
    ],
    requests: [
      { id: "req-001", type: "businessTrip", label: "부산 출장", date: "2026-05-15", status: "승인대기" },
      { id: "req-002", type: "vacation", label: "연차", date: "2026-05-12", status: "승인완료" },
      { id: "req-003", type: "vacation", label: "반차(오전)", date: "2026-05-19", status: "승인완료" },
    ],
    // 실제 구현 시 Supabase에서 팀원 유연근무 일정을 fetch하여 대체
    flexSchedules: [
      { date: "2026-05-06", member: "김민준", startTime: "09:00", endTime: "11:30" },
      { date: "2026-05-07", member: "이서연", startTime: "13:00", endTime: "17:00" },
      { date: "2026-05-12", member: "박준혁", startTime: "10:00", endTime: "14:00" },
      { date: "2026-05-14", member: "최지영", startTime: "08:00", endTime: "12:00" },
      { date: "2026-05-19", member: "김민준", startTime: "14:00", endTime: "18:00" },
      { date: "2026-05-21", member: "이서연", startTime: "09:00", endTime: "13:00" },
      // 2명 유연근무 예시 (27일) — 내 출장과 겹침
      { date: "2026-05-27", member: "김민준", startTime: "09:00", endTime: "13:00" },
      { date: "2026-05-27", member: "이서연", startTime: "10:00", endTime: "15:00" },
      // 3명 유연근무 예시 (28일) — 내 출장과 겹침
      { date: "2026-05-28", member: "김민준", startTime: "08:00", endTime: "12:00" },
      { date: "2026-05-28", member: "이서연", startTime: "13:00", endTime: "17:00" },
      { date: "2026-05-28", member: "박준혁", startTime: "09:00", endTime: "14:00" },
    ],
  },
  meals: {
    totalLimit: 200000,
    used: 85000,
    receipts: [
      { id: "r-001", date: "2026-05-01", amount: 12000, status: "승인완료" },
      { id: "r-002", date: "2026-05-05", amount: 9500, status: "승인대기" },
    ],
  },
};
