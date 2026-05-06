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
    startTime: "09:02",
    remaining: {
      vacation: 12,
      businessTrip: 5,
    },
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
    used: 21600,
    receipts: [
      // 4월 (영업일 22일, 공휴일 없음)
      { id: "r-a01", date: "2026-04-01", time: "12:05", store: "이삭토스트 수서점", menu: "클래식에그토스트+음료", amount: 6500, status: "승인완료" },
      { id: "r-a02", date: "2026-04-02", time: "12:30", store: "한솥도시락 수서점", menu: "제육볶음도시락", amount: 7000, status: "승인완료" },
      { id: "r-a03", date: "2026-04-03", time: "13:00", store: "GS25 수서점", menu: "도시락+음료", amount: 5200, status: "승인완료" },
      { id: "r-a04", date: "2026-04-06", time: "12:20", store: "맥도날드 수서점", menu: "맥스파이시상하이버거세트", amount: 9500, status: "승인완료" },
      { id: "r-a05", date: "2026-04-07", time: "12:30", store: "버거킹 수서점", menu: "와퍼세트", amount: 10500, status: "승인완료" },
      { id: "r-a06", date: "2026-04-08", time: "12:45", store: "뚜레쥬르 수서점", menu: "크로크무슈+아메리카노", amount: 8800, status: "승인완료" },
      { id: "r-a07", date: "2026-04-09", time: "13:10", store: "이마트24 수서점", menu: "도시락+커피", amount: 5500, status: "승인완료" },
      { id: "r-a08", date: "2026-04-10", time: "12:15", store: "김밥천국 수서점", menu: "돈까스+김밥", amount: 8000, status: "승인완료" },
      { id: "r-a09", date: "2026-04-13", time: "12:40", store: "KFC 수서점", menu: "징거버거세트", amount: 10200, status: "승인완료" },
      { id: "r-a10", date: "2026-04-14", time: "12:05", store: "한솥도시락 수서점", menu: "돈까스도시락", amount: 7500, status: "승인완료" },
      { id: "r-a11", date: "2026-04-15", time: "12:55", store: "CU 수서점", menu: "도시락+삼각김밥+음료", amount: 6000, status: "승인완료" },
      { id: "r-a12", date: "2026-04-16", time: "12:45", store: "파리바게뜨 수서점", menu: "샌드위치+음료", amount: 8200, status: "승인완료" },
      { id: "r-a13", date: "2026-04-17", time: "12:10", store: "써브웨이 수서점", menu: "이탈리안BMT세트", amount: 10500, status: "승인완료" },
      { id: "r-a14", date: "2026-04-20", time: "12:30", store: "버거킹 수서점", menu: "더블와퍼세트", amount: 11500, status: "승인완료" },
      { id: "r-a15", date: "2026-04-21", time: "12:20", store: "맘스터치 수서점", menu: "싸이버거세트", amount: 9800, status: "승인완료" },
      { id: "r-a16", date: "2026-04-22", time: "13:05", store: "본죽 수서점", menu: "새우야채죽", amount: 9500, status: "승인완료" },
      { id: "r-a17", date: "2026-04-23", time: "13:00", store: "노브랜드버거 수서점", menu: "트러플머쉬룸버거세트", amount: 9200, status: "승인대기" },
      { id: "r-a18", date: "2026-04-24", time: "12:50", store: "이마트24 수서점", menu: "도시락+커피", amount: 5500, status: "승인완료" },
      { id: "r-a19", date: "2026-04-27", time: "12:25", store: "아비꼬 수서점", menu: "세트C", amount: 11000, status: "승인완료" },
      { id: "r-a20", date: "2026-04-28", time: "12:10", store: "롯데리아 수서점", menu: "불고기버거세트", amount: 8500, status: "승인완료" },
      { id: "r-a21", date: "2026-04-29", time: "12:35", store: "교촌치킨 수서점", menu: "순살콤보", amount: 13000, status: "승인대기" },
      { id: "r-a22", date: "2026-04-30", time: "13:22", store: "빽다방 수서점", menu: "아메리카노+샌드위치", amount: 7200, status: "승인완료" },
      // 5월
      { id: "r-001", date: "2026-05-06", time: "13:05", store: "아비꼬 수서점", menu: "세트D", amount: 12000, status: "승인완료" },
      { id: "r-002", date: "2026-05-07", time: "12:34", store: "써브웨이 수서점", menu: "로스트치킨세트", amount: 9600, status: "승인대기" },
      { id: "r-003", date: "2026-05-08", time: "12:50", store: "GS25 수서점", menu: "도시락+음료", amount: 4800, status: "승인완료" },
      { id: "r-004", date: "2026-05-12", time: "12:15", store: "맥도날드 수서점", menu: "빅맥세트", amount: 9000, status: "승인대기" },
      { id: "r-005", date: "2026-05-13", time: "13:10", store: "교촌치킨 수서점", menu: "허니콤보", amount: 12000, status: "승인완료" },
      { id: "r-006", date: "2026-05-14", time: "12:40", store: "본죽 수서점", menu: "전복죽", amount: 11000, status: "승인완료" },
      { id: "r-007", date: "2026-05-19", time: "13:00", store: "한솥도시락 수서점", menu: "돈까스도시락", amount: 7500, status: "승인완료" },
      { id: "r-008", date: "2026-05-20", time: "12:25", store: "김밥천국 수서점", menu: "참치김밥+라면", amount: 6500, status: "승인완료" },
      { id: "r-009", date: "2026-05-21", time: "12:55", store: "CU 수서점", menu: "도시락+삼각김밥", amount: 5300, status: "승인대기" },
      { id: "r-010", date: "2026-05-22", time: "13:05", store: "파리바게뜨 수서점", menu: "클럽샌드위치+아메리카노", amount: 9100, status: "승인완료" },
      { id: "r-011", date: "2026-05-26", time: "12:30", store: "이마트24 수서점", menu: "도시락+커피", amount: 5800, status: "승인완료" },
      { id: "r-012", date: "2026-05-28", time: "12:45", store: "맘스터치 수서점", menu: "싸이버거세트", amount: 9800, status: "승인대기" },
    ],
  },
};
