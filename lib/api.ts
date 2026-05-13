// API endpoints ???섏쨷??Supabase ?ㅼ젣 ?곕룞?쇰줈 援먯껜
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

// ?섎뱶肄붾뵫 ?붾? ?곗씠????Supabase ?곕룞 ???ъ슜
export const DUMMY = {
  user: {
    id: "user-001",
    name: "議고쁽??,
    department: "HR?",
    position: "?由?,
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
          { day: "??, hours: 5.0 },
          { day: "??, hours: 5.0 },
          { day: "??, hours: 5.0 },
          { day: "紐?, hours: 5.0 },
          { day: "湲?, hours: 5.0 },
        ],
      },
      {
        offset: -1,
        label: "4/27~5/1",
        range: "4/27~5/1",
        days: [
          { day: "??, hours: 5.0 },
          { day: "??, hours: 5.0 },
          { day: "??, hours: 4.5 },
          { day: "紐?, hours: 5.0 },
          { day: "湲?, hours: 4.5 },
        ],
      },
      {
        offset: 0,
        label: "?대쾲 二?,
        range: "5/4~5/8",
        days: [
          { day: "??, hours: 5.0 },
          { day: "??, hours: 4.5 },
          { day: "??, hours: 3.0 },
          { day: "紐?, hours: 0 },
          { day: "湲?, hours: 0 },
        ],
      },
    ],
    myEvents: [
      { date: "2026-05-12", type: "vacation", label: "?곗감", time: "醫낆씪", status: "?뱀씤?꾨즺" },
      { date: "2026-05-15", type: "businessTrip", label: "遺??異쒖옣", time: "09:00~18:00", destination: "遺??, status: "?뱀씤?湲? },
      { date: "2026-05-19", type: "vacation", label: "諛섏감(?ㅼ쟾)", time: "09:00~13:00", status: "?뱀씤?꾨즺" },
      { date: "2026-05-27", type: "businessTrip", label: "???異쒖옣", time: "10:00~17:00", destination: "???, status: "?뱀씤?꾨즺" },
      { date: "2026-05-28", type: "businessTrip", label: "愿묒＜ 異쒖옣", time: "09:00~18:00", destination: "愿묒＜", status: "?뱀씤?湲? },
    ],
    teamEvents: [
      { date: "2026-05-08", member: "源誘쇱?", type: "vacation", label: "?곗감", time: "醫낆씪" },
      { date: "2026-05-13", member: "?댁꽌??, type: "businessTrip", label: "異쒖옣", time: "10:00~17:00", destination: "?쒖슱" },
      { date: "2026-05-20", member: "諛뺤???, type: "vacation", label: "諛섏감(?ㅽ썑)", time: "13:00~18:00" },
      { date: "2026-05-22", member: "理쒖???, type: "businessTrip", label: "異쒖옣", time: "09:00~18:00", destination: "??? },
      // ?ㅼ젣 援ы쁽 ??Supabase?먯꽌 ????좎껌 ?댁뿭??fetch?섏뿬 ?泥?
    ],
    requests: [
      { id: "req-001", type: "businessTrip", label: "遺??異쒖옣", date: "2026-05-15", status: "?뱀씤?湲? },
      { id: "req-002", type: "vacation", label: "?곗감", date: "2026-05-12", status: "?뱀씤?꾨즺" },
      { id: "req-003", type: "vacation", label: "諛섏감(?ㅼ쟾)", date: "2026-05-19", status: "?뱀씤?꾨즺" },
    ],
    // ?ㅼ젣 援ы쁽 ??Supabase?먯꽌 ????좎뿰洹쇰Т ?쇱젙??fetch?섏뿬 ?泥?
    flexSchedules: [
      { date: "2026-05-06", member: "源誘쇱?", startTime: "09:00", endTime: "11:30" },
      { date: "2026-05-07", member: "?댁꽌??, startTime: "13:00", endTime: "17:00" },
      { date: "2026-05-12", member: "諛뺤???, startTime: "10:00", endTime: "14:00" },
      { date: "2026-05-14", member: "理쒖???, startTime: "08:00", endTime: "12:00" },
      { date: "2026-05-19", member: "源誘쇱?", startTime: "14:00", endTime: "18:00" },
      { date: "2026-05-21", member: "?댁꽌??, startTime: "09:00", endTime: "13:00" },
      // 2紐??좎뿰洹쇰Т ?덉떆 (27?? ????異쒖옣怨?寃뱀묠
      { date: "2026-05-27", member: "源誘쇱?", startTime: "09:00", endTime: "13:00" },
      { date: "2026-05-27", member: "?댁꽌??, startTime: "10:00", endTime: "15:00" },
      // 3紐??좎뿰洹쇰Т ?덉떆 (28?? ????異쒖옣怨?寃뱀묠
      { date: "2026-05-28", member: "源誘쇱?", startTime: "08:00", endTime: "12:00" },
      { date: "2026-05-28", member: "?댁꽌??, startTime: "13:00", endTime: "17:00" },
      { date: "2026-05-28", member: "諛뺤???, startTime: "09:00", endTime: "14:00" },
    ],
  },
  meals: {
    totalLimit: 200000,
    used: 21600,
    receipts: [
      // 4??(?곸뾽??22?? 怨듯쑕???놁쓬)
      { id: "r-a01", date: "2026-04-01", time: "12:05", store: "?댁궘?좎뒪???섏꽌??, menu: "?대옒?앹뿉洹명넗?ㅽ듃+?뚮즺", amount: 6500, status: "?뱀씤?꾨즺" },
      { id: "r-a02", date: "2026-04-02", time: "12:30", store: "?쒖넡?꾩떆???섏꽌??, menu: "?쒖쑁蹂띠쓬?꾩떆??, amount: 7000, status: "?뱀씤?꾨즺" },
      { id: "r-a03", date: "2026-04-03", time: "13:00", store: "GS25 ?섏꽌??, menu: "?꾩떆???뚮즺", amount: 5200, status: "?뱀씤?꾨즺" },
      { id: "r-a04", date: "2026-04-06", time: "12:20", store: "留λ룄?좊뱶 ?섏꽌??, menu: "留μ뒪?뚯씠?쒖긽?섏씠踰꾧굅?명듃", amount: 9500, status: "?뱀씤?꾨즺" },
      { id: "r-a05", date: "2026-04-07", time: "12:30", store: "踰꾧굅???섏꽌??, menu: "??쇱꽭??, amount: 10500, status: "?뱀씤?꾨즺" },
      { id: "r-a06", date: "2026-04-08", time: "12:45", store: "?쒕젅伊щⅤ ?섏꽌??, menu: "?щ줈?щТ???꾨찓由ъ뭅??, amount: 8800, status: "?뱀씤?꾨즺" },
      { id: "r-a07", date: "2026-04-09", time: "13:10", store: "?대쭏??4 ?섏꽌??, menu: "?꾩떆??而ㅽ뵾", amount: 5500, status: "?뱀씤?꾨즺" },
      { id: "r-a08", date: "2026-04-10", time: "12:15", store: "源諛μ쿇援??섏꽌??, menu: "?덇퉴??源諛?, amount: 8000, status: "?뱀씤?꾨즺" },
      { id: "r-a09", date: "2026-04-13", time: "12:40", store: "KFC ?섏꽌??, menu: "吏뺢굅踰꾧굅?명듃", amount: 10200, status: "?뱀씤?꾨즺" },
      { id: "r-a10", date: "2026-04-14", time: "12:05", store: "?쒖넡?꾩떆???섏꽌??, menu: "?덇퉴?ㅻ룄?쒕씫", amount: 7500, status: "?뱀씤?꾨즺" },
      { id: "r-a11", date: "2026-04-15", time: "12:55", store: "CU ?섏꽌??, menu: "?꾩떆???쇨컖源諛??뚮즺", amount: 6000, status: "?뱀씤?꾨즺" },
      { id: "r-a12", date: "2026-04-16", time: "12:45", store: "?뚮━諛붽쾶???섏꽌??, menu: "?뚮뱶?꾩튂+?뚮즺", amount: 8200, status: "?뱀씤?꾨즺" },
      { id: "r-a13", date: "2026-04-17", time: "12:10", store: "?⑤툕?⑥씠 ?섏꽌??, menu: "?댄깉由ъ븞BMT?명듃", amount: 10500, status: "?뱀씤?꾨즺" },
      { id: "r-a14", date: "2026-04-20", time: "12:30", store: "踰꾧굅???섏꽌??, menu: "?붾툝??쇱꽭??, amount: 11500, status: "?뱀씤?꾨즺" },
      { id: "r-a15", date: "2026-04-21", time: "12:20", store: "留섏뒪?곗튂 ?섏꽌??, menu: "?몄씠踰꾧굅?명듃", amount: 9800, status: "?뱀씤?꾨즺" },
      { id: "r-a16", date: "2026-04-22", time: "13:05", store: "蹂몄＝ ?섏꽌??, menu: "?덉슦?쇱콈二?, amount: 9500, status: "?뱀씤?꾨즺" },
      { id: "r-a17", date: "2026-04-23", time: "13:00", store: "?몃툕?쒕뱶踰꾧굅 ?섏꽌??, menu: "?몃윭?뚮㉧?щ８踰꾧굅?명듃", amount: 9200, status: "?뱀씤?湲? },
      { id: "r-a18", date: "2026-04-24", time: "12:50", store: "?대쭏??4 ?섏꽌??, menu: "?꾩떆??而ㅽ뵾", amount: 5500, status: "?뱀씤?꾨즺" },
      { id: "r-a19", date: "2026-04-27", time: "12:25", store: "?꾨퉬瑗??섏꽌??, menu: "?명듃C", amount: 11000, status: "?뱀씤?꾨즺" },
      { id: "r-a20", date: "2026-04-28", time: "12:10", store: "濡?뜲由ъ븘 ?섏꽌??, menu: "遺덇퀬湲곕쾭嫄곗꽭??, amount: 8500, status: "?뱀씤?꾨즺" },
      { id: "r-a21", date: "2026-04-29", time: "12:35", store: "援먯큿移섑궓 ?섏꽌??, menu: "?쒖궡肄ㅻ낫", amount: 13000, status: "?뱀씤?湲? },
      { id: "r-a22", date: "2026-04-30", time: "13:22", store: "鍮쎈떎諛??섏꽌??, menu: "?꾨찓由ъ뭅???뚮뱶?꾩튂", amount: 7200, status: "?뱀씤?꾨즺" },
      // 5??
      { id: "r-001", date: "2026-05-06", time: "13:05", store: "?꾨퉬瑗??섏꽌??, menu: "?명듃D", amount: 12000, status: "?뱀씤?꾨즺" },
      { id: "r-002", date: "2026-05-07", time: "12:34", store: "?⑤툕?⑥씠 ?섏꽌??, menu: "濡쒖뒪?몄튂?⑥꽭??, amount: 9600, status: "?뱀씤?湲? },
      { id: "r-003", date: "2026-05-08", time: "12:50", store: "GS25 ?섏꽌??, menu: "?꾩떆???뚮즺", amount: 4800, status: "?뱀씤?꾨즺" },
      { id: "r-004", date: "2026-05-12", time: "12:15", store: "留λ룄?좊뱶 ?섏꽌??, menu: "鍮낅㎘?명듃", amount: 9000, status: "?뱀씤?湲? },
      { id: "r-005", date: "2026-05-13", time: "13:10", store: "援먯큿移섑궓 ?섏꽌??, menu: "?덈땲肄ㅻ낫", amount: 12000, status: "?뱀씤?꾨즺" },
      { id: "r-006", date: "2026-05-14", time: "12:40", store: "蹂몄＝ ?섏꽌??, menu: "?꾨났二?, amount: 11000, status: "?뱀씤?꾨즺" },
      { id: "r-007", date: "2026-05-19", time: "13:00", store: "?쒖넡?꾩떆???섏꽌??, menu: "?덇퉴?ㅻ룄?쒕씫", amount: 7500, status: "?뱀씤?꾨즺" },
      { id: "r-008", date: "2026-05-20", time: "12:25", store: "源諛μ쿇援??섏꽌??, menu: "李몄튂源諛??쇰㈃", amount: 6500, status: "?뱀씤?꾨즺" },
      { id: "r-009", date: "2026-05-21", time: "12:55", store: "CU ?섏꽌??, menu: "?꾩떆???쇨컖源諛?, amount: 5300, status: "?뱀씤?湲? },
      { id: "r-010", date: "2026-05-22", time: "13:05", store: "?뚮━諛붽쾶???섏꽌??, menu: "?대읇?뚮뱶?꾩튂+?꾨찓由ъ뭅??, amount: 9100, status: "?뱀씤?꾨즺" },
      { id: "r-011", date: "2026-05-26", time: "12:30", store: "?대쭏??4 ?섏꽌??, menu: "?꾩떆??而ㅽ뵾", amount: 5800, status: "?뱀씤?꾨즺" },
      { id: "r-012", date: "2026-05-28", time: "12:45", store: "留섏뒪?곗튂 ?섏꽌??, menu: "?몄씠踰꾧굅?명듃", amount: 9800, status: "?뱀씤?湲? },
    ],
  },
};

