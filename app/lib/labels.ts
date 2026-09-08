const labels: Record<string, string> = {
  All: "Tất cả", Foundations: "Nền tảng", Beginner: "Sơ cấp", Everyday: "Hằng ngày",
  Newbie: "Mới bắt đầu", Elementary: "Cơ bản", "Pre Intermediate": "Tiền trung cấp",
  Intermediate: "Trung cấp", "Upper Intermediate": "Trung cấp cao",
  "To learn": "Chưa học", "To listen": "Chưa nghe", Finished: "Đã xong",
};
export const levelLabel = (value: string) => labels[value] ?? value;
