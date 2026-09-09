"use client";
import { levelLabel } from "./lib/labels";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MediaIcon, UiIcon } from "./components/icons";
import { lessons, LEVELS, matchesLesson, type Lesson } from "./lib/lessons";
import { useStarterAudio } from "./lib/use-starter-audio";
import SleepTimerButton from "./components/sleep-timer-button";
import OriLibrary from "./components/ori-library";
import PodcastLibrary from "./components/podcast-library";

type CompletionFilter = "all" | "unfinished" | "finished";
type Theme = "light" | "dark";
type Preferences = {
  pinyin: boolean; english: boolean; rate: number;
  loop: boolean; autoplayNext: boolean; level: string; completion: CompletionFilter;
};
type SleepTimer = { until: number | null; remaining: number };
type Session = { lessonId: number; initialLine: number; autoplay: boolean; revision: number };
const DEFAULTS: Preferences = { pinyin: true, english: true, rate: 1, loop: false, autoplayNext: false, level: "All", completion: "all" };
const STORAGE = { settings: "mandarinsteps:settings-v2", completed: "mandarinsteps:completed-v1", resume: "mandarinsteps:resume-v1" };
const THEME_KEY = "mandarinsteps:theme-v1";
const RATES = [0.75, 1, 1.25, 1.5, 2];

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
  const [theme, setTheme] = useState<Theme>("light");
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const shared = localStorage.getItem(THEME_KEY);
      const oldSettings = record(readStored(STORAGE.settings));
      const next = shared === "dark" || shared === "light" ? shared : oldSettings.theme === "dark" ? "dark" : "light";
      setTheme(next); document.documentElement.dataset.theme = next; setThemeReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (themeReady) { document.documentElement.dataset.theme = theme; localStorage.setItem(THEME_KEY, theme); } }, [theme, themeReady]);
  const toggleTheme = () => setTheme((value) => value === "light" ? "dark" : "light");
  return <div className="workspace"><nav className="course-switcher" aria-label="Chinese learning library"><div className="course-tabs"><button aria-pressed={mode === "recordings"} onClick={() => setMode("recordings")}>Podcast</button><button aria-pressed={mode === "practice"} onClick={() => setMode("practice")}>Starter lessons</button><button aria-pressed={mode === "ori"} onClick={() => setMode("ori")}>Ori Princess</button></div></nav>{mode === "recordings" ? <PodcastLibrary theme={theme} onToggleTheme={toggleTheme} /> : mode === "practice" ? <StarterCourse theme={theme} onToggleTheme={toggleTheme} /> : <OriLibrary theme={theme} onToggleTheme={toggleTheme} />}</div>;
}

function StarterCourse({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
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
  useEffect(() => { if (ready) saveStored(STORAGE.settings, preferences); }, [preferences, ready]);
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
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close lesson library" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} />}
      <aside className={`library-panel ${sidebarOpen ? "is-open" : ""}`} aria-label="Lesson library" ref={sidebarRef}>
        <div className="brand-block">
          <div className="brand-row">
            <span className="brand-mark" lang="zh-Hans" aria-hidden="true">中</span>
            <div className="brand-name"><h1>Mandarin<span> Steps</span></h1><p>YOUR DAILY CHINESE PRACTICE</p></div>
            <button className="guide-icon-button" onClick={() => guideRef.current?.showModal()} aria-label="Open quick guide"><UiIcon name="help" /></button>
            <button className="mobile-close" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} aria-label="Close lesson library"><UiIcon name="close" /></button>
          </div>
          <div className="course-progress"><span>{completedIds.length} / {lessons.length} lessons finished</span><progress value={completedIds.length} max={lessons.length} aria-label="Course completion" /></div>
        </div>
        <div className="library-tools">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Chinese, pinyin, or English" aria-label="Search lessons" />{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
          <div className="level-filters" role="group" aria-label="Filter by level">
            {["All", ...LEVELS].map((level) => <button key={level} className={preferences.level === level ? "is-selected" : ""} onClick={() => updatePreference("level", level)} aria-pressed={preferences.level === level}>{levelLabel(level)}</button>)}
          </div>
          <div className="completion-filters" role="group" aria-label="Filter by completion">
            {([["all", "All"], ["unfinished", "To learn"], ["finished", "Finished"]] as const).map(([value, label]) => <button key={value} className={preferences.completion === value ? "is-selected" : ""} onClick={() => updatePreference("completion", value)} aria-pressed={preferences.completion === value}>{levelLabel(label)}<span>{counts[value]}</span></button>)}
          </div>
        </div>
        <div className="episode-list">
          <div className="results-line" aria-live="polite"><span>{visible.length} lessons</span><span>Simplified Mandarin</span></div>
          {visible.map((item) => <div className={`episode-row ${item.id === lesson.id ? "is-active" : ""}`} key={item.id}>
            <button className="episode-select" onClick={() => selectLesson(item)} aria-current={item.id === lesson.id ? "true" : undefined}>
              <span className="episode-number" aria-hidden="true">{String(item.id).padStart(2, "0")}</span><span className="episode-copy"><strong>{item.title}</strong><span lang="zh-Hans">{item.hanzi}</span><small>{levelLabel(item.level)}</small></span>
            </button>
            <button className={`episode-complete ${completed.has(item.id) ? "is-finished" : ""}`} onClick={() => toggleCompleted(item.id)} aria-label={`Mark ${item.title}: ${completed.has(item.id) ? "unfinished" : "finished"}`} aria-pressed={completed.has(item.id)}><span aria-hidden="true">✓</span></button>
          </div>)}
          {!visible.length && <div className="empty-state"><strong>No lessons found</strong><p>Try a word like 你好 or ni hao.</p><button onClick={() => { setQuery(""); setPreferences((previous) => ({ ...previous, level: "All", completion: "all" })); }}>Clear filters</button></div>}
        </div>
      </aside>
      <section className="content-panel">
        <header className="topbar">
          <button ref={menuRef} className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open lesson library" aria-expanded={sidebarOpen}><UiIcon name="menu" /><span className="menu-label">Lessons</span></button>
          <p>A little Chinese, every day.</p>
          <div className="topbar-actions"><button onClick={randomLesson} title="Open a random lesson"><span aria-hidden="true">🎲</span> <span className="topbar-label">Random</span></button><button className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch theme to ${theme === "light" ? "dark" : "light"}`}><UiIcon name={theme === "light" ? "moon" : "sun"} /><span>{theme === "light" ? "Dark" : "Light"}</span></button></div>
        </header>
        <LessonView key={`${lesson.id}-${session.revision}`} lesson={lesson} session={session} preferences={preferences} ready={ready} completed={completed.has(lesson.id)} onCompleted={() => toggleCompleted(lesson.id)} onPreference={updatePreference} onNavigate={navigate} sleepTimer={sleepTimer} onSleepTimer={setSleepTimer} onLevel={() => { updatePreference("level", lesson.level); if (window.matchMedia("(max-width: 980px)").matches) setSidebarOpen(true); }} />
      </section>
      <dialog className="guide-modal" ref={guideRef} aria-labelledby="guide-title" onClick={(event) => { if (event.target === event.currentTarget) guideRef.current?.close(); }}>
        <span className="section-kicker">QUICK GUIDE</span><h2 id="guide-title">Build your Mandarin habit</h2>
        <ol><li><strong>Listen to the tones</strong><span>Play a sentence, then repeat it aloud. Mandarin uses four tones and a light neutral tone.</span></li><li><strong>Read with support</strong><span>Pinyin shows pronunciation. Hide pinyin or English when you are ready to test yourself.</span></li><li><strong>Make it stick</strong><span>Review the vocabulary and language note, then mark the lesson finished.</span></li></ol>
        <p className="guide-note">Practice audio is included with the app as pre-generated Mandarin speech. No voice installation is needed. Pause restarts the current sentence when you resume.</p>
        <p className="guide-note">Keyboard: Space to play or pause; ← / → to move between sentences. Your progress is saved in this browser.</p>
        <button className="primary-button" onClick={() => guideRef.current?.close()}>Start learning</button>
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
          <div><div className="eyebrow"><button className="level-shortcut" onClick={onLevel} aria-label={`Open ${levelLabel(lesson.level)} lessons`}>{levelLabel(lesson.level)}</button><span>Lesson {String(lesson.id).padStart(2, "0")} / {lessons.length}</span></div><h2 id="lesson-title" tabIndex={-1}>{lesson.title}</h2><p className="lesson-hanzi" lang="zh-Hans">{lesson.hanzi}</p>{preferences.pinyin && <p className="lesson-pinyin" lang="zh-Latn-pinyin">{lesson.pinyin}</p>}<p className="lesson-description">{lesson.description}</p></div>
          <button className={`heading-complete ${completed ? "is-finished" : ""}`} onClick={onCompleted} aria-label={`Mark ${completed ? "unfinished" : "finished"}`} aria-pressed={completed} title={completed ? "Finished" : "Mark as finished"}><span aria-hidden="true">✓</span></button>
        </div>
        <section className="transcript-card" aria-label="Lesson study material">
          <div className="card-heading"><div><span className="section-kicker">LISTEN · READ · REPEAT</span><h3>Make yourself understood</h3></div><span className="lesson-size">{lesson.dialogue.length} sentences</span></div>
          <div className="study-toolbar"><div className="study-tabs" role="tablist" aria-label="Study section">{(["dialogue", "vocabulary"] as const).map((value) => <button id={`${value}-tab`} key={value} role="tab" aria-selected={tab === value} aria-controls="study-panel" tabIndex={tab === value ? 0 : -1} className={tab === value ? "is-selected" : ""} onClick={() => setTab(value)} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "dialogue" : event.key === "End" ? "vocabulary" : tab === "dialogue" ? "vocabulary" : "dialogue"; setTab(next); document.getElementById(`${next}-tab`)?.focus(); } }}>{value === "dialogue" ? "Conversation" : "Vocabulary"}</button>)}</div><div className="reading-toggles" role="group" aria-label="Reading support"><button aria-pressed={preferences.pinyin} onClick={() => onPreference("pinyin", !preferences.pinyin)}>Pinyin <span aria-hidden="true">{preferences.pinyin ? "✓" : "+"}</span></button><button aria-pressed={preferences.english} onClick={() => onPreference("english", !preferences.english)}>English <span aria-hidden="true">{preferences.english ? "✓" : "+"}</span></button></div></div>
          <div className="transcript-content" id="study-panel" role="tabpanel" aria-labelledby={`${tab}-tab`} tabIndex={0}>
            {tab === "dialogue" ? <div className="dialogue-block">{lesson.dialogue.map((line, index) => <div className={`line ${speech.activeLine === index ? "is-current" : ""}`} key={index} data-line={index}>
              <div className="line-meta"><span className="speaker">{line.speaker}</span><span className="line-number">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="line-copy"><p className="hanzi" lang="zh-Hans">{line.hanzi}</p>{preferences.pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{line.pinyin}</p>}{preferences.english && <p className="translation">{line.english}</p>}</div>
              <button className="sentence-play" disabled={!canSpeak} onClick={() => speech.playLine(index)} aria-label={`Listen to sentence ${index + 1}: ${line.hanzi}`} title="Listen from this sentence"><MediaIcon name="play" /></button>
            </div>)}</div> : <div className="vocab-block">{lesson.vocabulary.map((word) => <article className="vocab-item" key={word.hanzi}><div className="vocab-top"><h4 className="hanzi" lang="zh-Hans">{word.hanzi}</h4><button className="sentence-play" disabled={!canSpeak} onClick={() => speech.speakText(word.hanzi)} aria-label={`Listen to ${word.hanzi}`}><MediaIcon name="play" /></button></div>{preferences.pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{word.pinyin}</p>}{preferences.english && <p className="translation">{word.english}</p>}</article>)}</div>}
          </div>
        </section>
        <aside className="language-note"><span className="note-symbol" lang="zh-Hans" aria-hidden="true">记</span><div><span className="section-kicker">LANGUAGE NOTE</span><h3>{lesson.note.title}</h3><p>{lesson.note.body}</p></div></aside>
        <div className="lesson-footer"><p>Listen, say it aloud, then try without the hints.</p><button className={`finish-button ${completed ? "is-finished" : ""}`} onClick={onCompleted} aria-pressed={completed}>{completed ? "✓ Lesson finished" : "Mark as finished"}</button></div>
      </div>
    </div>
    <section className="player" aria-label="Mandarin sentence player">
      {audioMessage && <p className="speech-notice" role="status">{audioMessage}</p>}
      <div className="progress-wrap"><span className="progress-time">{speech.activeLine + 1}</span><input type="range" min={0} max={lesson.dialogue.length - 1} step={1} value={speech.activeLine} onChange={(event) => speech.seekLine(Number(event.target.value))} aria-label="Sentence progress" aria-valuetext={`Sentence ${speech.activeLine + 1} / ${lesson.dialogue.length}`} style={{ "--progress": `${speech.activeLine / Math.max(1, lesson.dialogue.length - 1) * 100}%` } as CSSProperties} /><span className="progress-time">{lesson.dialogue.length}</span></div>
      <div className="player-main"><div className="transport"><button className="track-button" onClick={() => onNavigate(-1, speech.isPlaying)} aria-label="Previous lesson"><MediaIcon name="previous" /></button><button className="sentence-step" onClick={() => speech.seekLine(speech.activeLine - 1)} disabled={speech.activeLine === 0} aria-label="Previous sentence">‹</button><button className="play-button" onClick={speech.toggle} disabled={!canSpeak} aria-label={speech.isPlaying ? "Pause" : "Play Mandarin"}><MediaIcon name={speech.isPlaying ? "pause" : "play"} /></button><button className="sentence-step" onClick={() => speech.seekLine(speech.activeLine + 1)} disabled={speech.activeLine === lesson.dialogue.length - 1} aria-label="Next sentence">›</button><button className="track-button" onClick={() => onNavigate(1, speech.isPlaying)} aria-label="Next lesson"><MediaIcon name="next" /></button></div>
        <div className="player-options"><button className={preferences.autoplayNext ? "is-on" : ""} aria-pressed={preferences.autoplayNext} onClick={() => onPreference("autoplayNext", !preferences.autoplayNext)}><span className="control-label">Auto next</span></button><button className={preferences.loop ? "is-on" : ""} aria-pressed={preferences.loop} onClick={() => onPreference("loop", !preferences.loop)}><span aria-hidden="true">↻</span><span className="control-label">Loop</span></button><SleepTimerButton until={sleepUntil} remaining={sleepRemaining} onSelect={(minutes) => onSleepTimer({ until: minutes ? Date.now() + minutes * 60000 : null, remaining: minutes * 60 })} /><button className="speed-button" onClick={() => onPreference("rate", RATES[(RATES.indexOf(preferences.rate) + 1) % RATES.length])} aria-label={`Playback speed ${preferences.rate}, change speed`}><span className="speed-value">{preferences.rate}×</span><span className="control-label">Speed</span></button></div>
      </div>
      <div className="voice-row"><span>Bundled Mandarin audio · Sentence {speech.activeLine + 1} / {lesson.dialogue.length}</span></div>
    </section>
  </>;
}
