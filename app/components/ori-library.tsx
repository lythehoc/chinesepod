"use client";

import { useEffect, useState } from "react";
import episodes from "../data/ori.json";
import { normalizeSearch } from "../lib/lessons";

const STORAGE = "chinesepod:ori-watched-v1";
const words = [
  ["公主", "gōngzhǔ", "công chúa"], ["朋友", "péngyou", "bạn bè"],
  ["老师", "lǎoshī", "giáo viên"], ["学校", "xuéxiào", "trường học"],
  ["谢谢", "xièxie", "cảm ơn"], ["对不起", "duìbuqǐ", "xin lỗi"],
];

export default function OriLibrary() {
  const [query, setQuery] = useState("");
  const [watched, setWatched] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
        if (Array.isArray(stored)) setWatched(stored.filter((id): id is number => typeof id === "number" && episodes.some((item) => item.id === id)));
      } catch { /* Viewing works without saved progress. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(STORAGE, JSON.stringify(watched)); } catch { /* Storage is optional. */ } }
  }, [ready, watched]);
  const visible = episodes.filter((item) => normalizeSearch(`${item.id} ${item.title} Công chúa Ori Tập ${item.id}`).includes(normalizeSearch(query)));
  return <main className="ori-page">
    <div className="ori-intro"><span className="section-kicker">HỌC QUA HOẠT HÌNH</span><h1>Công chúa Ori <span lang="zh-Hans">甜心格格</span></h1><p>Một chút tiếng Trung cùng Ori. Xem một đoạn ngắn, nghe lại câu quen thuộc và thử nhắc theo.</p></div>
    <div className="ori-columns"><section className="ori-feature">
      <div className="ori-video">{showTrailer ? <iframe src="https://www.youtube-nocookie.com/embed/lhXTHGTJwJk" title="Công chúa Ori — trailer mùa 1 tiếng Quan thoại chính thức" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="ori-cover"><span lang="zh-Hans">甜心格格</span><p>Trailer tiếng Quan thoại · Mùa 1</p><button className="primary-button" onClick={() => setShowTrailer(true)}>▶ Xem trailer</button></div>}</div>
      <p className="publisher-credit">Trailer từ Asia Animation Channel. <a href="https://www.youtube.com/watch?v=lhXTHGTJwJk" target="_blank" rel="noreferrer">Mở trên YouTube ↗</a></p>
      <section className="recording-card"><span className="section-kicker">THỬ NGHE TRONG PHIM</span><h2>Sáu từ để bắt đầu</h2><div className="ori-words">{words.map(([hanzi, pinyin, meaning]) => <div key={hanzi}><strong lang="zh-Hans">{hanzi}</strong><span lang="zh-Latn-pinyin">{pinyin}</span><span>{meaning}</span></div>)}</div><p>Đây là từ vựng gợi ý để luyện nghe, không phải phụ đề của trailer. Mỗi lần xem, hãy chọn một câu ngắn và nhắc lại ba lần.</p></section>
    </section><section className="ori-episodes" aria-labelledby="ori-episodes-title"><div className="ori-list-heading"><span className="section-kicker">NGUỒN PHIM CHÍNH THỨC</span><h2 id="ori-episodes-title">{episodes.length} tập trên CCTV</h2><p>Tập đầy đủ mở trên trang CCTV. Tên tiếng Trung giữ theo nguồn phát; video có thể phụ thuộc khu vực hoặc trình duyệt.</p><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Tìm tập Công chúa Ori" placeholder="Tìm số tập hoặc tên tiếng Trung" value={query} onChange={(event) => setQuery(event.target.value)} /></label><p aria-live="polite">{watched.length} / {episodes.length} đã xem · {visible.length} kết quả</p></div><div className="ori-list">{visible.map((item) => <article className="ori-episode" key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><small>Mục {String(item.id).padStart(2, "0")} · Xem trên CCTV ↗</small><strong lang="zh-Hans">{item.title.replace(/\s*银河剧场.*$/, "")}</strong></a><button aria-label={`Đánh dấu mục ${item.id} ${watched.includes(item.id) ? "chưa xem" : "đã xem"}`} aria-pressed={watched.includes(item.id)} onClick={() => setWatched((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}>{watched.includes(item.id) ? "✓ Đã xem" : "Đánh dấu"}</button></article>)}{!visible.length && <p>Không tìm thấy tập phù hợp.</p>}</div><a className="source-link" href="https://tv.cctv.com/2013/04/19/VIDA1366343828951330.shtml" target="_blank" rel="noreferrer">Xem danh mục gốc trên CCTV ↗</a></section></div>
  </main>;
}
