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
    startTime: "09:00",
    remaining: { businessTrip: 3, vacation: 10 },
    calendar: [],
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
