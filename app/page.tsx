"use client";
import { levelLabel } from "./lib/labels";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MediaIcon, UiIcon } from "./components/icons";
import { lessons, LEVELS, matchesLesson, type Lesson } from "./lib/lessons";
import { useStarterAudio } from "./lib/use-starter-audio";
import OriLibrary from "./components/ori-library";
import PodcastLibrary, { PODCAST_COUNT } from "./components/podcast-library";

type CompletionFilter = "all" | "unfinished" | "finished";
type Preferences = {
  theme: "light" | "dark"; pinyin: boolean; english: boolean; rate: number;
  loop: boolean; autoplayNext: boolean; level: string; completion: CompletionFilter;
};
type SleepTimer = { until: number | null; remaining: number };
type Session = { lessonId: number; initialLine: number; autoplay: boolean; revision: number };
const DEFAULTS: Preferences = { theme: "light", pinyin: true, english: true, rate: 0.85, loop: false, autoplayNext: false, level: "All", completion: "all" };
const STORAGE = { settings: "mandarinsteps:settings-v1", completed: "mandarinsteps:completed-v1", resume: "mandarinsteps:resume-v1" };
const RATES = [0.65, 0.85, 1, 1.15];

function readStored(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function saveStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Learning works without storage. */ }
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function Home() {
  const [mode, setMode] = useState<"recordings" | "practice" | "ori">("recordings");
  return <div className="workspace"><nav className="course-switcher" aria-label="Thư viện học tiếng Trung"><div className="course-tabs"><button aria-pressed={mode === "recordings"} onClick={() => setMode("recordings")}>Podcast <span>{PODCAST_COUNT.toLocaleString("vi-VN")}</span></button><button aria-pressed={mode === "practice"} onClick={() => setMode("practice")}>Bài nhập môn <span>24</span></button><button aria-pressed={mode === "ori"} onClick={() => setMode("ori")}>Công chúa Ori <span>104</span></button></div><div className="github-links"><a href="https://github.com/lythehoc/chinesepod" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://github.com/lythehoc" target="_blank" rel="noreferrer" aria-label="Theo dõi lythehoc trên GitHub">Theo dõi @lythehoc ↗</a></div></nav>{mode === "recordings" ? <PodcastLibrary /> : mode === "practice" ? <StarterCourse /> : <OriLibrary />}</div>;
}

function StarterCourse() {
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [session, setSession] = useState<Session>({ lessonId: 1, initialLine: 0, autoplay: false, revision: 0 });
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<SleepTimer>({ until: null, remaining: 0 });
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const guideRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = record(readStored(STORAGE.settings));
      const next = { ...DEFAULTS };
      if (saved.theme === "light" || saved.theme === "dark") next.theme = saved.theme;
      for (const key of ["pinyin", "english", "loop", "autoplayNext"] as const) {
        if (typeof saved[key] === "boolean") next[key] = saved[key];
      }
      if (typeof saved.rate === "number" && RATES.includes(saved.rate)) next.rate = saved.rate;
      if (typeof saved.level === "string" && ["All", ...LEVELS].includes(saved.level)) next.level = saved.level;
      if (saved.completion === "all" || saved.completion === "finished" || saved.completion === "unfinished") next.completion = saved.completion;
      setPreferences(next);
      const completed = readStored(STORAGE.completed);
      if (Array.isArray(completed)) setCompletedIds([...new Set(completed.filter((id): id is number => typeof id === "number" && lessons.some((lesson) => lesson.id === id)))]);
      const resume = record(readStored(STORAGE.resume));
      const lesson = lessons.find((item) => item.id === resume.lessonId);
      if (lesson) setSession({ lessonId: lesson.id, initialLine: typeof resume.line === "number" && Number.isInteger(resume.line) ? Math.max(0, Math.min(lesson.dialogue.length - 1, resume.line)) : 0, autoplay: false, revision: 1 });
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    if (ready) saveStored(STORAGE.settings, preferences);
  }, [preferences, ready]);
  useEffect(() => { if (ready) saveStored(STORAGE.completed, completedIds); }, [completedIds, ready]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const panel = sidebarRef.current;
    const mobile = window.matchMedia("(max-width: 980px)").matches;
    if (mobile) panel?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (guideRef.current?.open) return;
      if (event.key === "Escape") { setSidebarOpen(false); menuRef.current?.focus(); }
      if (event.key === "Tab" && mobile && panel) {
        const buttons = Array.from(panel.querySelectorAll<HTMLElement>("button, input")).filter((element) => element.getClientRects().length > 0);
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    panel?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" });
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const lesson = lessons.find((item) => item.id === session.lessonId) ?? lessons[0];
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const matching = useMemo(() => lessons.filter((item) => (preferences.level === "All" || item.level === preferences.level) && matchesLesson(item, query)), [preferences.level, query]);
  const counts = { all: matching.length, finished: matching.filter((item) => completed.has(item.id)).length, unfinished: matching.filter((item) => !completed.has(item.id)).length };
  const visible = matching.filter((item) => preferences.completion === "all" || (preferences.completion === "finished" ? completed.has(item.id) : !completed.has(item.id)));
  const updatePreference = useCallback(<K extends keyof Preferences,>(key: K, value: Preferences[K]) => setPreferences((previous) => ({ ...previous, [key]: value })), []);
  const selectLesson = useCallback((item: Lesson, autoplay = false) => {
    setSession((previous) => ({ lessonId: item.id, initialLine: 0, autoplay, revision: previous.revision + 1 }));
    saveStored(STORAGE.resume, { lessonId: item.id, line: 0 });
    setSidebarOpen(false);
    requestAnimationFrame(() => document.getElementById("lesson-title")?.focus());
  }, []);
  const toggleCompleted = (id: number) => setCompletedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const randomLesson = useCallback(() => {
    const unfinished = visible.filter((item) => item.id !== lesson.id && !completed.has(item.id));
    const candidates = unfinished.length ? unfinished : lessons.filter((item) => item.id !== lesson.id);
    selectLesson(candidates[Math.floor(Math.random() * candidates.length)]);
  }, [visible, lesson.id, completed, selectLesson]);
  const navigate = (direction: number, autoplay: boolean) => {
    const index = lessons.findIndex((item) => item.id === lesson.id);
    selectLesson(lessons[(index + direction + lessons.length) % lessons.length], autoplay);
  };

  return (
    <main className={`app-shell ${sidebarOpen ? "drawer-open" : ""}`}>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Đóng danh sách bài học" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} />}
      <aside className={`library-panel ${sidebarOpen ? "is-open" : ""}`} aria-label="Danh sách bài học" ref={sidebarRef}>
        <div className="brand-block">
          <div className="brand-row">
            <span className="brand-mark" lang="zh-Hans" aria-hidden="true">中</span>
            <div className="brand-name"><h1>Mandarin<span> Steps</span></h1><p>LUYỆN TIẾNG TRUNG MỖI NGÀY</p></div>
            <button className="guide-icon-button" onClick={() => guideRef.current?.showModal()} aria-label="Mở hướng dẫn"><UiIcon name="help" /></button>
            <button className="mobile-close" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} aria-label="Đóng danh sách bài học"><UiIcon name="close" /></button>
          </div>
          <div className="course-progress"><span>{completedIds.length} / {lessons.length} bài đã xong</span><progress value={completedIds.length} max={lessons.length} aria-label="Tiến độ học" /></div>
        </div>
        <div className="library-tools">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chữ Hán, pinyin hoặc tiếng Việt" aria-label="Tìm bài học" />{query && <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">×</button>}</label>
          <div className="level-filters" role="group" aria-label="Lọc trình độ">
            {["All", ...LEVELS].map((level) => <button key={level} className={preferences.level === level ? "is-selected" : ""} onClick={() => updatePreference("level", level)} aria-pressed={preferences.level === level}>{levelLabel(level)}</button>)}
          </div>
          <div className="completion-filters" role="group" aria-label="Lọc tiến độ">
            {([["all", "All"], ["unfinished", "To learn"], ["finished", "Finished"]] as const).map(([value, label]) => <button key={value} className={preferences.completion === value ? "is-selected" : ""} onClick={() => updatePreference("completion", value)} aria-pressed={preferences.completion === value}>{levelLabel(label)}<span>{counts[value]}</span></button>)}
          </div>
        </div>
        <div className="episode-list">
          <div className="results-line" aria-live="polite"><span>{visible.length} bài học</span><span>Tiếng Trung giản thể</span></div>
          {visible.map((item) => <div className={`episode-row ${item.id === lesson.id ? "is-active" : ""}`} key={item.id}>
            <button className="episode-select" onClick={() => selectLesson(item)} aria-current={item.id === lesson.id ? "true" : undefined}>
              <span className="episode-number" aria-hidden="true">{String(item.id).padStart(2, "0")}</span><span className="episode-copy"><strong>{item.title}</strong><span lang="zh-Hans">{item.hanzi}</span><small>{levelLabel(item.level)}</small></span>
            </button>
            <button className={`episode-complete ${completed.has(item.id) ? "is-finished" : ""}`} onClick={() => toggleCompleted(item.id)} aria-label={`Đánh dấu ${item.title}: ${completed.has(item.id) ? "chưa học" : "đã xong"}`} aria-pressed={completed.has(item.id)}><span aria-hidden="true">✓</span></button>
          </div>)}
          {!visible.length && <div className="empty-state"><strong>Không tìm thấy bài học</strong><p>Thử tìm 你好, ni hao hoặc xin chào.</p><button onClick={() => { setQuery(""); setPreferences((previous) => ({ ...previous, level: "All", completion: "all" })); }}>Xóa bộ lọc</button></div>}
        </div>
      </aside>
      <section className="content-panel">
        <header className="topbar">
          <button ref={menuRef} className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Mở danh sách bài học" aria-expanded={sidebarOpen}>☰</button>
          <p>Mỗi ngày một chút tiếng Trung.</p>
          <div className="topbar-actions"><button onClick={randomLesson} title="Mở bài ngẫu nhiên"><span aria-hidden="true">🎲</span> <span className="topbar-label">Ngẫu nhiên</span></button><button className="theme-toggle" onClick={() => updatePreference("theme", preferences.theme === "light" ? "dark" : "light")} aria-label={`Chuyển giao diện ${preferences.theme === "light" ? "tối" : "sáng"}`}><UiIcon name={preferences.theme === "light" ? "moon" : "sun"} /><span>{preferences.theme === "light" ? "Tối" : "Sáng"}</span></button></div>
        </header>
        <LessonView key={`${lesson.id}-${session.revision}`} lesson={lesson} session={session} preferences={preferences} ready={ready} completed={completed.has(lesson.id)} onCompleted={() => toggleCompleted(lesson.id)} onPreference={updatePreference} onNavigate={navigate} sleepTimer={sleepTimer} onSleepTimer={setSleepTimer} onLevel={() => { updatePreference("level", lesson.level); if (window.matchMedia("(max-width: 980px)").matches) setSidebarOpen(true); }} />
      </section>
      <dialog className="guide-modal" ref={guideRef} aria-labelledby="guide-title" onClick={(event) => { if (event.target === event.currentTarget) guideRef.current?.close(); }}>
        <span className="section-kicker">HƯỚNG DẪN NHANH</span><h2 id="guide-title">Tạo thói quen học tiếng Trung</h2>
        <ol><li><strong>Lắng nghe thanh điệu</strong><span>Nghe từng câu rồi đọc lại thành tiếng. Tiếng Trung có bốn thanh điệu và thanh nhẹ.</span></li><li><strong>Đọc cùng gợi ý</strong><span>Pinyin giúp bạn phát âm. Hãy ẩn pinyin hoặc tiếng Việt khi muốn tự kiểm tra.</span></li><li><strong>Ôn lại để nhớ lâu</strong><span>Ôn từ vựng và ghi chú, sau đó đánh dấu hoàn thành bài học.</span></li></ol>
        <p className="guide-note">Âm thanh luyện tập tiếng Trung có sẵn trong ứng dụng, không cần cài giọng đọc. Khi tiếp tục sau khi tạm dừng, câu hiện tại sẽ được đọc lại từ đầu.</p>
        <p className="guide-note">Phím cách: phát hoặc dừng; ← / →: chuyển câu. Tiến độ được lưu trong trình duyệt này.</p>
        <button className="primary-button" onClick={() => guideRef.current?.close()}>Bắt đầu học</button>
      </dialog>
    </main>
  );
}

function LessonView({ lesson, session, preferences, ready, completed, onCompleted, onPreference, onNavigate, onLevel, sleepTimer, onSleepTimer }: {
  lesson: Lesson; session: Session; preferences: Preferences; ready: boolean; completed: boolean;
  onCompleted: () => void; onPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  onNavigate: (direction: number, autoplay: boolean) => void; onLevel: () => void;
  sleepTimer: SleepTimer; onSleepTimer: (timer: SleepTimer) => void;
}) {
  const [tab, setTab] = useState<"dialogue" | "vocabulary">("dialogue");
  const { until: sleepUntil, remaining: sleepRemaining } = sleepTimer;
  const scrollRef = useRef<HTMLDivElement>(null);
  const onPositionChange = useCallback((line: number) => { if (ready) saveStored(STORAGE.resume, { lessonId: lesson.id, line }); }, [ready, lesson.id]);
  const speech = useStarterAudio({ lessonId: lesson.id, lines: lesson.dialogue, rate: preferences.rate, loop: preferences.loop, autoplayNext: preferences.autoplayNext, initialLine: session.initialLine, autoplay: session.autoplay, onNext: () => onNavigate(1, true), onPositionChange });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || target.closest("button, input, select, textarea, dialog, [contenteditable='true']") || document.querySelector("dialog[open], .drawer-open")) return;
      if (event.code === "Space") { event.preventDefault(); speech.toggle(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); speech.seekLine(speech.activeLine - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); speech.seekLine(speech.activeLine + 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speech]);
  useEffect(() => {
    if (speech.isPlaying && tab === "dialogue") scrollRef.current?.querySelector(`[data-line='${speech.activeLine}']`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [speech.activeLine, speech.isPlaying, tab]);
  const pauseSpeech = speech.pause;
  useEffect(() => {
    if (sleepUntil === null) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepUntil - Date.now()) / 1000));
      if (!remaining) pauseSpeech();
      onSleepTimer({ until: remaining ? sleepUntil : null, remaining });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleepUntil, pauseSpeech, onSleepTimer]);
  const canSpeak = ready;
  const audioMessage = speech.error;

  return <>
    <div className="lesson-scroll" ref={scrollRef}>
      <div className="lesson">
        <div className="lesson-heading">
          <div><div className="eyebrow"><button className="level-shortcut" onClick={onLevel} aria-label={`Open ${levelLabel(lesson.level)} lessons`}>{levelLabel(lesson.level)}</button><span>Bài {String(lesson.id).padStart(2, "0")} / {lessons.length}</span></div><h2 id="lesson-title" tabIndex={-1}>{lesson.title}</h2><p className="lesson-hanzi" lang="zh-Hans">{lesson.hanzi}</p>{preferences.pinyin && <p className="lesson-pinyin" lang="zh-Latn-pinyin">{lesson.pinyin}</p>}<p className="lesson-description">{lesson.description}</p></div>
          <button className={`heading-complete ${completed ? "is-finished" : ""}`} onClick={onCompleted} aria-label={`Đánh dấu ${completed ? "chưa học" : "đã xong"}`} aria-pressed={completed} title={completed ? "Đã xong" : "Đánh dấu hoàn thành"}><span aria-hidden="true">✓</span></button>
        </div>
        <section className="transcript-card" aria-label="Nội dung bài học">
          <div className="card-heading"><div><span className="section-kicker">NGHE · ĐỌC · NHẮC LẠI</span><h3>Luyện nói từng câu</h3></div><span className="lesson-size">{lesson.dialogue.length} câu</span></div>
          <div className="study-toolbar"><div className="study-tabs" role="tablist" aria-label="Phần học">{(["dialogue", "vocabulary"] as const).map((value) => <button id={`${value}-tab`} key={value} role="tab" aria-selected={tab === value} aria-controls="study-panel" tabIndex={tab === value ? 0 : -1} className={tab === value ? "is-selected" : ""} onClick={() => setTab(value)} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "dialogue" : event.key === "End" ? "vocabulary" : tab === "dialogue" ? "vocabulary" : "dialogue"; setTab(next); document.getElementById(`${next}-tab`)?.focus(); } }}>{value === "dialogue" ? "Hội thoại" : "Từ vựng"}</button>)}</div><div className="reading-toggles" role="group" aria-label="Gợi ý khi đọc"><button aria-pressed={preferences.pinyin} onClick={() => onPreference("pinyin", !preferences.pinyin)}>Pinyin <span aria-hidden="true">{preferences.pinyin ? "✓" : "+"}</span></button><button aria-pressed={preferences.english} onClick={() => onPreference("english", !preferences.english)}>Tiếng Việt <span aria-hidden="true">{preferences.english ? "✓" : "+"}</span></button></div></div>
          <div className="transcript-content" id="study-panel" role="tabpanel" aria-labelledby={`${tab}-tab`} tabIndex={0}>
            {tab === "dialogue" ? <div className="dialogue-block">{lesson.dialogue.map((line, index) => <div className={`line ${speech.activeLine === index ? "is-current" : ""}`} key={index} data-line={index}>
              <div className="line-meta"><span className="speaker">{line.speaker}</span><span className="line-number">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="line-copy"><p className="hanzi" lang="zh-Hans">{line.hanzi}</p>{preferences.pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{line.pinyin}</p>}{preferences.english && <p className="translation">{line.vietnamese}</p>}</div>
              <button className="sentence-play" disabled={!canSpeak} onClick={() => speech.playLine(index)} aria-label={`Nghe câu ${index + 1}: ${line.hanzi}`} title="Nghe từ câu này"><MediaIcon name="play" /></button>
            </div>)}</div> : <div className="vocab-block">{lesson.vocabulary.map((word) => <article className="vocab-item" key={word.hanzi}><div className="vocab-top"><h4 className="hanzi" lang="zh-Hans">{word.hanzi}</h4><button className="sentence-play" disabled={!canSpeak} onClick={() => speech.speakText(word.hanzi)} aria-label={`Nghe ${word.hanzi}`}><MediaIcon name="play" /></button></div>{preferences.pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{word.pinyin}</p>}{preferences.english && <p className="translation">{word.vietnamese}</p>}</article>)}</div>}
          </div>
        </section>
        <aside className="language-note"><span className="note-symbol" lang="zh-Hans" aria-hidden="true">记</span><div><span className="section-kicker">GHI CHÚ NGÔN NGỮ</span><h3>{lesson.note.title}</h3><p>{lesson.note.body}</p></div></aside>
        <div className="lesson-footer"><p>Nghe, đọc thành tiếng, rồi thử bỏ gợi ý.</p><button className={`finish-button ${completed ? "is-finished" : ""}`} onClick={onCompleted} aria-pressed={completed}>{completed ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}</button></div>
      </div>
    </div>
    <section className="player" aria-label="Trình phát câu tiếng Trung">
      {audioMessage && <p className="speech-notice" role="status">{audioMessage}</p>}
      <div className="progress-wrap"><span className="progress-time">{speech.activeLine + 1}</span><input type="range" min={0} max={lesson.dialogue.length - 1} step={1} value={speech.activeLine} onChange={(event) => speech.seekLine(Number(event.target.value))} aria-label="Tiến độ câu" aria-valuetext={`Câu ${speech.activeLine + 1} / ${lesson.dialogue.length}`} style={{ "--progress": `${speech.activeLine / Math.max(1, lesson.dialogue.length - 1) * 100}%` } as CSSProperties} /><span className="progress-time">{lesson.dialogue.length}</span></div>
      <div className="player-main"><div className="transport"><button className="track-button" onClick={() => onNavigate(-1, speech.isPlaying)} aria-label="Bài trước"><MediaIcon name="previous" /></button><button className="sentence-step" onClick={() => speech.seekLine(speech.activeLine - 1)} disabled={speech.activeLine === 0} aria-label="Câu trước">‹</button><button className="play-button" onClick={speech.toggle} disabled={!canSpeak} aria-label={speech.isPlaying ? "Tạm dừng" : "Nghe tiếng Trung"}><MediaIcon name={speech.isPlaying ? "pause" : "play"} /></button><button className="sentence-step" onClick={() => speech.seekLine(speech.activeLine + 1)} disabled={speech.activeLine === lesson.dialogue.length - 1} aria-label="Câu tiếp">›</button><button className="track-button" onClick={() => onNavigate(1, speech.isPlaying)} aria-label="Bài tiếp"><MediaIcon name="next" /></button></div>
        <div className="player-options"><button className={preferences.autoplayNext ? "is-on" : ""} aria-pressed={preferences.autoplayNext} onClick={() => onPreference("autoplayNext", !preferences.autoplayNext)}><span className="control-label">Tự chuyển</span></button><button className={preferences.loop ? "is-on" : ""} aria-pressed={preferences.loop} onClick={() => onPreference("loop", !preferences.loop)}><span aria-hidden="true">↻</span><span className="control-label">Lặp lại</span></button><button className={sleepUntil ? "is-on" : ""} aria-pressed={sleepUntil !== null} onClick={() => { onSleepTimer({ until: sleepUntil ? null : Date.now() + 15 * 60 * 1000, remaining: sleepUntil ? 0 : 900 }); }} title="Dừng phát sau 15 phút"><span className="control-label">{sleepUntil ? `${Math.floor(sleepRemaining / 60)}:${String(sleepRemaining % 60).padStart(2, "0")}` : "Hẹn giờ"}</span></button><button className="speed-button" onClick={() => onPreference("rate", RATES[(RATES.indexOf(preferences.rate) + 1) % RATES.length])} aria-label={`Tốc độ phát ${preferences.rate}, đổi tốc độ`}><span className="speed-value">{preferences.rate}×</span><span className="control-label">Tốc độ</span></button></div>
      </div>
      <div className="voice-row"><span>Âm thanh tiếng Trung có sẵn · Câu {speech.activeLine + 1} / {lesson.dialogue.length}</span></div>
    </section>
  </>;
}
