# chinesepod 🎧

Mỗi ngày một chút tiếng Trung.

[![Học ngay](https://img.shields.io/badge/Học_ngay-GitHub_Pages-16796b)](https://lythehoc.github.io/chinesepod/)
[![Follow lythehoc](https://img.shields.io/github/followers/lythehoc?label=Follow%20lythehoc&style=social)](https://github.com/lythehoc)

`chinesepod` là thư viện học tiếng Trung dành cho người Việt, dùng trên điện thoại
và máy tính. Nghe, đọc pinyin, ôn từ vựng và tiếp tục từ vị trí đã dừng.

## Điểm nổi bật

- **24 bài nhập môn** với chữ Hán giản thể, pinyin, nghĩa và hướng dẫn tiếng Việt.
- **288 đoạn phát âm có sẵn**, không cần cài giọng đọc trên thiết bị.
- **1.920 tập ChinesePod** ở 5 trình độ, có tìm kiếm, phát ngẫu nhiên và lọc tiến độ.
- **Công chúa Ori — 甜心格格**: trailer tiếng Quan thoại chính thức và liên kết 104 tập trên CCTV.
- Tốc độ phát, lặp lại, tự chuyển bài, hẹn giờ và lưu tiến độ trong trình duyệt.
- Không cần tài khoản; giao diện sáng/tối, nút GitHub và theo dõi tác giả.

Bản thu ChinesePod giữ nguyên hội thoại tiếng Trung và lời giảng tiếng Anh;
tên tập, tài liệu ngoài giữ theo nguồn. Phần nhập môn dùng nghĩa tiếng Việt.
Phim đầy đủ mở trên CCTV; khả năng xem phụ thuộc nguồn phát và khu vực.

## Chạy tại máy

Cài Node.js 24 trở lên:

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Kiểm tra bằng `npm run lint` và `npm test`.

## GitHub Pages

Trang chính: **https://lythehoc.github.io/chinesepod/**.

Push vào `main` sẽ chạy kiểm tra và xuất bản qua GitHub Actions.
Ứng dụng xuất tĩnh vào `out/`, tự nhận đường dẫn `/chinesepod` khi build trên
GitHub. Không cần máy chủ, khóa API hay dịch vụ hosting khác.

## Nguồn và ghi nhận

- Podcast phát trực tiếp từ các nguồn RSS công khai của [ChinesePod](https://www.chinesepod.com):
  [cơ bản](https://anchor.fm/s/109bf914/podcast/rss),
  [trung cấp](https://anchor.fm/s/317bc3a8/podcast/rss).
  Bản thu và tài liệu thuộc ChinesePod; một số tài liệu yêu cầu tài khoản.
- Công chúa Ori: [CCTV](https://tv.cctv.com/2013/04/19/VIDA1366343828951330.shtml)
  và [Asia Animation Channel](https://www.youtube.com/watch?v=lhXTHGTJwJk).
- Bài nhập môn biên soạn riêng; âm thanh tạo sẵn bằng giọng Mandarin Tingting.
- Phông [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand),
  theo [SIL Open Font License](public/fonts/PatrickHand-OFL.txt).

Cập nhật podcast bằng `scripts/import-podcasts.py` với hai tệp RSS đã tải.
`scripts/check-podcast-audio.py` kiểm tra mẫu 50 tập (`--all` để kiểm tra toàn bộ).
`scripts/generate-starter-audio.py` tạo và kiểm tra âm thanh nhập môn trên macOS.
