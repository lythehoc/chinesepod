"use client";
import { levelLabel } from "../lib/labels";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import podcastData from "../data/podcasts.json";
import { normalizeSearch } from "../lib/lessons";
import { UiIcon } from "./icons";

type Episode = (typeof podcastData)[number];
const episodes: Episode[] = podcastData;
const levels = ["Newbie", "Elementary", "Pre Intermediate", "Intermediate", "Upper Intermediate"];
const RESUME_KEY = "mandarinsteps:podcast-resume-v1";
const COMPLETED_KEY = "mandarinsteps:podcast-completed-v1";
const firstEpisode = episodes.find((item) => item.level === "Newbie" && /greeting|hello|introducing yourself/i.test(item.title)) ?? episodes[0];
const searchIndex = new Map(episodes.map((item) => [item.id, normalizeSearch(`${item.title} ${levelLabel(item.level)}`)]));

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
function time(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function PodcastLibrary() {
  const [episode, setEpisode] = useState(firstEpisode);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(80);
  const [completed, setCompleted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [sleepUntil, setSleepUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [position, setPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeRef = useRef(episode);
  const restoreRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const savePosition = useCallback(() => {
    const audio = audioRef.current;
    if (audio && restoreRef.current === null && Number.isFinite(audio.currentTime)) {
      write(RESUME_KEY, { id: activeRef.current.id, position: audio.currentTime });
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = read(RESUME_KEY);
      if (saved && typeof saved === "object" && "id" in saved && "position" in saved) {
        const match = episodes.find((item) => item.id === saved.id);
        if (match && typeof saved.position === "number" && Number.isFinite(saved.position) && saved.position >= 0) {
          restoreRef.current = saved.position;
          activeRef.current = match;
          setEpisode(match);
          // The default episode may already have loaded before storage hydration.
          const audio = audioRef.current;
          if (match.id === firstEpisode.id && audio && audio.readyState >= 1) {
            audio.currentTime = Math.min(saved.position, Math.max(0, audio.duration - 1));
            restoreRef.current = null;
          }
        }
      }
      const finished = read(COMPLETED_KEY);
      if (Array.isArray(finished)) setCompleted([...new Set(finished.filter((id): id is string => typeof id === "string" && episodes.some((item) => item.id === id)))]);
      setReady(true);
    });
    const saveOnHide = () => { if (document.visibilityState === "hidden") savePosition(); };
    window.addEventListener("pagehide", savePosition);
    document.addEventListener("visibilitychange", saveOnHide);
    const audio = audioRef.current;
    return () => {
      cancelAnimationFrame(frame);
      if (audio && restoreRef.current === null) write(RESUME_KEY, { id: activeRef.current.id, position: audio.currentTime });
      audio?.pause();
      window.removeEventListener("pagehide", savePosition);
      document.removeEventListener("visibilitychange", saveOnHide);
    };
  }, [savePosition]);

  useEffect(() => { if (ready) write(COMPLETED_KEY, completed); }, [completed, ready]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = rate; }, [rate]);
  useEffect(() => {
    if (!sleepUntil) return;
    const timer = window.setInterval(() => {
      const value = Math.max(0, Math.ceil((sleepUntil - Date.now()) / 1000));
      setRemaining(value);
      if (!value) { audioRef.current?.pause(); setSleepUntil(null); }
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepUntil]);
  useEffect(() => {
    if (!sidebarOpen) return;
    sidebarRef.current?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSidebarOpen(false); menuRef.current?.focus(); }
      if (event.key === "Tab") {
        const elements = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("button, input") ?? []).filter((element) => !element.hasAttribute("disabled") && element.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const matches = useMemo(() => {
    const search = normalizeSearch(query);
    return episodes.filter((item) => (level === "All" || item.level === level) && (!search || searchIndex.get(item.id)?.includes(search)));
  }, [query, level]);
  const finished = useMemo(() => new Set(completed), [completed]);
  const visible = matches.filter((item) => filter === "all" || (filter === "finished" ? finished.has(item.id) : !finished.has(item.id)));
  const counts = { all: matches.length, unfinished: matches.filter((item) => !finished.has(item.id)).length, finished: matches.filter((item) => finished.has(item.id)).length };

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (audio.ended) audio.currentTime = 0;
    void audio.play().catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("Chưa phát được âm thanh. Nhấn Phát lần nữa hoặc chọn Mở âm thanh để nghe trực tiếp.");
    });
  }, []);

  const select = useCallback((item: Episode, autoplay = true) => {
    savePosition();
    restoreRef.current = null;
    activeRef.current = item;
    setEpisode(item);
    setPosition(0);
    setError(null);
    setSidebarOpen(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = item.audioUrl;
      audio.load();
      audio.playbackRate = rate;
      if (autoplay) start();
    }
    write(RESUME_KEY, { id: item.id, position: 0 });
    requestAnimationFrame(() => document.getElementById("podcast-title")?.focus());
  }, [rate, savePosition, start]);

  const next = (direction: number, autoplay = playing) => {
    const pool = visible.length ? visible : episodes;
    const index = pool.findIndex((item) => item.id === episode.id);
    select(pool[(Math.max(0, index) + direction + pool.length) % pool.length], autoplay);
  };
  const toggleFinished = (id: string) => setCompleted((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const random = useCallback(() => {
    const pool = visible.filter((item) => item.id !== episode.id);
    if (pool.length) select(pool[Math.floor(Math.random() * pool.length)]);
  }, [visible, episode.id, select]);

  return <main className={`app-shell podcast-shell ${sidebarOpen ? "drawer-open" : ""}`}>
    {sidebarOpen && <button className="mobile-scrim" aria-label="Đóng danh sách tập" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} />}
    <aside className={`library-panel ${sidebarOpen ? "is-open" : ""}`} ref={sidebarRef} aria-label="Thư viện podcast">
      <div className="brand-block"><div className="brand-row"><span className="brand-mark" lang="zh-Hans" aria-hidden="true">中</span><div className="brand-name"><h1>Mandarin<span> Steps</span></h1><p>NGHE TIẾNG TRUNG MỖI NGÀY</p></div><button className="mobile-close" aria-label="Đóng danh sách tập" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }}><UiIcon name="close" /></button></div><div className="course-progress"><span>{episodes.length.toLocaleString("vi-VN")} tập thu âm · {completed.length} đã nghe</span></div></div>
      <div className="library-tools"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" aria-label="Tìm tập podcast" placeholder="Tìm tên tập gốc hoặc trình độ" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(80); }} /></label><div className="level-filters" role="group" aria-label="Trình độ tập">{["All", ...levels].map((value) => <button key={value} className={level === value ? "is-selected" : ""} aria-pressed={level === value} onClick={() => { setLevel(value); setLimit(80); }}>{levelLabel(value)}</button>)}</div><div className="completion-filters" role="group" aria-label="Tiến độ nghe">{([['all', 'All'], ['unfinished', 'To listen'], ['finished', 'Finished']] as const).map(([value, label]) => <button key={value} className={filter === value ? "is-selected" : ""} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(80); }}>{levelLabel(label)}<span>{counts[value]}</span></button>)}</div></div>
      <div className="episode-list"><div className="results-line" aria-live="polite"><span>{visible.length.toLocaleString("vi-VN")} tập</span><span>ChinesePod</span></div>{visible.slice(0, limit).map((item) => <div className={`episode-row ${item.id === episode.id ? "is-active" : ""}`} key={item.id}><button className="episode-select" aria-current={item.id === episode.id ? "true" : undefined} onClick={() => select(item)}><span className="episode-number" aria-hidden="true">▶</span><span className="episode-copy"><strong>{item.title}</strong><small>{levelLabel(item.level)} · {time(item.duration)}</small></span></button><button className={`episode-complete ${finished.has(item.id) ? "is-finished" : ""}`} aria-label={`Đánh dấu ${item.title}: ${finished.has(item.id) ? "chưa nghe" : "đã xong"}`} aria-pressed={finished.has(item.id)} onClick={() => toggleFinished(item.id)}>✓</button></div>)}{visible.length > limit && <button className="load-more" onClick={() => setLimit((value) => value + 80)}>Xem thêm · {visible.length - limit} tập còn lại</button>}{!visible.length && <div className="empty-state"><strong>Không tìm thấy tập phù hợp</strong><button onClick={() => { setQuery(""); setLevel("All"); setFilter("all"); }}>Xóa bộ lọc</button></div>}</div>
    </aside>
    <section className="content-panel"><header className="topbar"><button ref={menuRef} className="menu-button" aria-label="Mở danh sách tập" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>☰</button><p>Mỗi ngày một chút tiếng Trung.</p><div className="topbar-actions"><button onClick={random}>Ngẫu nhiên</button><button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}><UiIcon name={dark ? "sun" : "moon"} /></button></div></header>
      <div className="lesson-scroll"><div className="lesson"><div className="lesson-heading"><div><div className="eyebrow"><span className="recording-badge">PODCAST THU ÂM</span><span>{levelLabel(episode.level)} · {time(episode.duration)}</span></div><h2 id="podcast-title" tabIndex={-1}>{episode.title}</h2><p className="lesson-description">ChinesePod · Hội thoại tiếng Trung cùng người dẫn chương trình</p></div><button className={`heading-complete ${finished.has(episode.id) ? "is-finished" : ""}`} aria-label="Đánh dấu đã nghe tập này" aria-pressed={finished.has(episode.id)} onClick={() => toggleFinished(episode.id)}>✓</button></div>
        <section className="recording-card"><span className="section-kicker">CÙNG LUYỆN NGHE</span><h3>Học tiếng Trung qua tình huống.</h3><p>Nghe hội thoại và phát lại đoạn bạn muốn luyện. Bản thu gốc có hội thoại tiếng Trung và lời giảng tiếng Anh. Chọn Bài nhập môn để học với nghĩa và hướng dẫn hoàn toàn bằng tiếng Việt.</p><button className="primary-button" disabled={!ready} onClick={() => playing ? audioRef.current?.pause() : start()}>{playing ? "Tạm dừng" : position > 1 ? `Nghe tiếp từ ${time(position)}` : "Phát tập này"}</button><div className="recording-facts"><span>✓ Podcast do người thật thu âm</span><span>✓ Không cần cài giọng đọc</span><span>✓ Nhớ vị trí đang nghe</span></div></section>
        <section className="language-note"><span className="note-symbol" lang="zh-Hans" aria-hidden="true">读</span><div><span className="section-kicker">ĐỌC VÀ ÔN TẬP</span><h3>Tài liệu gốc từ ChinesePod</h3><p>Mở trang bài học của nhà xuất bản để xem hội thoại, pinyin và từ vựng có sẵn. Tài liệu gốc có thể dùng tiếng Anh và yêu cầu tài khoản ChinesePod. Tên tập trong thư viện giữ theo nguồn gốc để dễ đối chiếu.</p><a className="source-link" href={episode.sourceUrl} target="_blank" rel="noreferrer">Mở tài liệu bài học ↗</a></div></section>
        <p className="publisher-credit">Âm thanh phát từ nguồn podcast công khai của ChinesePod. Bản thu và tài liệu thuộc ChinesePod. <a href="https://www.chinesepod.com" target="_blank" rel="noreferrer">Đến ChinesePod ↗</a></p>
      </div></div>
      <section className="player recorded-player" aria-label="Trình phát podcast tiếng Trung">
        {error && <p className="speech-notice" role="alert">{error} <button onClick={() => { audioRef.current?.load(); start(); }}>Thử lại</button></p>}
        <audio ref={audioRef} src={episode.audioUrl} controls preload="metadata" loop={loop} onPlay={() => { setPlaying(true); setError(null); }} onPause={() => { setPlaying(false); savePosition(); }} onError={() => { setPlaying(false); setError("Không tải được tập này. Kiểm tra kết nối, thử lại hoặc mở âm thanh trực tiếp."); }} onLoadedMetadata={() => { const audio = audioRef.current; if (!audio) return; audio.playbackRate = rate; if (restoreRef.current !== null && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(restoreRef.current, Math.max(0, audio.duration - 1)); setPosition(audio.currentTime); restoreRef.current = null; } }} onTimeUpdate={() => { const audio = audioRef.current; if (!audio) return; setPosition(audio.currentTime); if (Date.now() - lastSaveRef.current > 1000) { savePosition(); lastSaveRef.current = Date.now(); } }} onEnded={() => { setPlaying(false); if (autoNext && (!sleepUntil || sleepUntil > Date.now())) next(1, true); }} />
        <div className="recorded-controls"><div className="recorded-transport"><button onClick={() => next(-1)} aria-label="Tập trước">Trước</button><button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}>−10s</button><button onClick={() => { const audio = audioRef.current; if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); }}>+10s</button><button onClick={() => next(1)} aria-label="Tập tiếp">Tiếp</button></div><div className="player-options"><button className={loop ? "is-on" : ""} aria-pressed={loop} onClick={() => setLoop((value) => !value)}>Lặp lại</button><button className={autoNext ? "is-on" : ""} aria-pressed={autoNext} onClick={() => setAutoNext((value) => !value)}>Tự chuyển</button><button className={sleepUntil ? "is-on" : ""} aria-pressed={!!sleepUntil} onClick={() => { setSleepUntil(sleepUntil ? null : Date.now() + 15 * 60 * 1000); setRemaining(900); }}>{sleepUntil ? time(remaining) : "Hẹn 15 phút"}</button><label><span className="sr-only">Tốc độ phát</span><select aria-label="Tốc độ phát" value={rate} onChange={(event) => setRate(Number(event.target.value))}>{[0.65, 0.85, 1, 1.15, 1.25, 1.5].map((value) => <option value={value} key={value}>{value}×</option>)}</select></label></div></div>
        <div className="voice-row"><span>ChinesePod · Bản thu gốc</span><a href={episode.audioUrl} target="_blank" rel="noreferrer">Mở âm thanh ↗</a></div>
      </section>
    </section>
  </main>;
}

export const PODCAST_COUNT = episodes.length;
