// API endpoints → Supabase 실제 동작으로 교체 예정
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
