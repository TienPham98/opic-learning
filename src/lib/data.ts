export const TOPICS = [
  { id: "movies",      icon: "🎬", name: "Xem phim" },
  { id: "music",       icon: "🎵", name: "Âm nhạc" },
  { id: "sports",      icon: "⚽", name: "Thể thao" },
  { id: "travel",      icon: "✈️", name: "Du lịch" },
  { id: "cooking",     icon: "🍳", name: "Nấu ăn" },
  { id: "reading",     icon: "📚", name: "Đọc sách" },
  { id: "technology",  icon: "💻", name: "Công nghệ" },
  { id: "environment", icon: "🌿", name: "Môi trường" },
  { id: "health",      icon: "🏃", name: "Sức khỏe" },
  { id: "shopping",    icon: "🛍️", name: "Mua sắm" },
  { id: "family",      icon: "👨‍👩‍👧", name: "Gia đình" },
  { id: "work",        icon: "💼", name: "Công việc" },
] as const;

export const SURVEY_QUESTIONS = [
  { id: "job",       q: "Nghề nghiệp của bạn là gì?",              multi: false, opts: ["Nhân viên văn phòng", "Nội trợ", "Giáo viên", "Học sinh / Sinh viên", "Chưa có việc làm"] },
  { id: "study",     q: "Nếu là sinh viên, mục đích học tập?",     multi: false, opts: ["Lấy bằng cấp", "Học nâng cao", "Học ngôn ngữ", "Không áp dụng"] },
  { id: "dwelling",  q: "Bạn đang sống ở đâu?",                    multi: false, opts: ["Nhà/căn hộ (một mình)", "Nhà/căn hộ (với bạn bè)", "Nhà/căn hộ (với gia đình)", "Ký túc xá", "Nhà tập thể"] },
  { id: "freetime",  q: "Bạn làm gì trong thời gian rảnh?",        multi: true,  opts: ["Xem phim", "Đi xem hòa nhạc", "Đi công viên", "Cắm trại", "Đi biển", "Xem thể thao", "Chơi game", "Giúp việc nhà"] },
  { id: "hobbies",   q: "Sở thích của bạn là gì?",                 multi: true,  opts: ["Nghe nhạc", "Chơi nhạc cụ", "Hát", "Nhảy múa", "Viết lách", "Vẽ tranh", "Nấu ăn", "Làm vườn", "Nuôi thú cưng"] },
  { id: "sports_q",  q: "Bạn chơi thể thao hoặc tập thể dục gì?", multi: true,  opts: ["Bóng đá", "Bơi lội", "Đi xe đạp", "Chạy bộ", "Đi bộ", "Yoga", "Cầu lông", "Bóng bàn", "Tập gym", "Không tập"] },
  { id: "travel_q",  q: "Bạn đã từng đi du lịch loại nào?",        multi: true,  opts: ["Công tác trong nước", "Công tác nước ngoài", "Nghỉ tại nhà", "Du lịch trong nước", "Du lịch nước ngoài"] },
];

export const LEVELS = [
  { id: "IM1", label: "IM1", sub: "Intermediate Mid 1" },
  { id: "IM2", label: "IM2", sub: "Intermediate Mid 2" },
  { id: "IM3", label: "IM3", sub: "Intermediate Mid 3" },
  { id: "IH",  label: "IH",  sub: "Intermediate High" },
  { id: "AL",  label: "AL",  sub: "Advanced Low" },
];

export const TYPE_GROUPS = [
  { range: [0, 2]   as [number, number], tag: "Q1–3",   label: "Describe",        vi: "Mô tả" },
  { range: [3, 5]   as [number, number], tag: "Q4–6",   label: "Compare",         vi: "So sánh" },
  { range: [6, 8]   as [number, number], tag: "Q7–9",   label: "Past Experience", vi: "Kinh nghiệm" },
  { range: [9, 11]  as [number, number], tag: "Q10–12", label: "Role-play",        vi: "Tình huống" },
  { range: [12, 14] as [number, number], tag: "Q13–15", label: "Mixed",            vi: "Hỗn hợp" },
];

export const CRITERIA_LABELS: Record<string, string> = {
  functions:         "Hoàn thành nhiệm vụ",
  textType:          "Cấu trúc câu",
  content:           "Nội dung & Chủ đề",
  comprehensibility: "Mạch lạc & Logic",
  languageControl:   "Kiểm soát ngôn ngữ",
};
