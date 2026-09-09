"use client";
import { levelLabel } from "../lib/labels";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import SleepTimerButton from "./sleep-timer-button";
import EpisodeStudy from "./episode-study";
import podcastData from "../data/podcasts.json";
import { normalizeSearch } from "../lib/lessons";
import { MediaIcon, UiIcon } from "./icons";

type Episode = (typeof podcastData)[number];
const episodes: Episode[] = podcastData;
const levels = ["Newbie", "Elementary", "Pre Intermediate", "Intermediate", "Upper Intermediate"];
const RESUME_KEY = "mandarinsteps:podcast-resume-v1";
const COMPLETED_KEY = "mandarinsteps:podcast-completed-v1";
const RATES = [0.75, 1, 1.25, 1.5, 2];
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
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
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
      // Cached media may finish metadata loading before React attaches handlers.
      const loadedAudio = audioRef.current;
      if (loadedAudio && Number.isFinite(loadedAudio.duration)) setDuration(loadedAudio.duration);
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
      setError("Playback could not start. Press Play again or try a different episode.");
    });
  }, []);

  const select = useCallback((item: Episode, autoplay = true) => {
    savePosition();
    restoreRef.current = null;
    activeRef.current = item;
    setEpisode(item);
    setPosition(0);
    setDuration(0);
    setBuffering(false);
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
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close episode library" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }} />}
    <aside className={`library-panel ${sidebarOpen ? "is-open" : ""}`} ref={sidebarRef} aria-label="Recorded episode library">
      <div className="brand-block"><div className="brand-row"><span className="brand-mark" lang="zh-Hans" aria-hidden="true">中</span><div className="brand-name"><h1>Mandarin<span> Steps</span></h1><p>REAL CONVERSATIONS. EVERY DAY.</p></div><button className="mobile-close" aria-label="Close episode library" onClick={() => { setSidebarOpen(false); menuRef.current?.focus(); }}><UiIcon name="close" /></button></div></div>
      <div className="library-tools"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search recorded episodes" placeholder="Search topics, titles, or levels" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(80); }} /></label><div className="level-filters" role="group" aria-label="Episode level">{["All", ...levels].map((value) => <button key={value} className={level === value ? "is-selected" : ""} aria-pressed={level === value} onClick={() => { setLevel(value); setLimit(80); }}>{levelLabel(value)}</button>)}</div><div className="completion-filters" role="group" aria-label="Episode completion">{([['all', 'All'], ['unfinished', 'To listen'], ['finished', 'Finished']] as const).map(([value, label]) => <button key={value} className={filter === value ? "is-selected" : ""} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(80); }}>{levelLabel(label)}<span>{counts[value]}</span></button>)}</div></div>
      <div className="episode-list"><div className="results-line" aria-live="polite"><span>{visible.length.toLocaleString("en-US")} episodes</span><span>ChinesePod</span></div>{visible.slice(0, limit).map((item) => <div className={`episode-row ${item.id === episode.id ? "is-active" : ""}`} key={item.id}><button className="episode-select" aria-current={item.id === episode.id ? "true" : undefined} onClick={() => select(item)}><span className="episode-number" aria-hidden="true">▶</span><span className="episode-copy"><strong>{item.title}</strong><small>{levelLabel(item.level)} · {time(item.duration)}</small></span></button><button className={`episode-complete ${finished.has(item.id) ? "is-finished" : ""}`} aria-label={`Mark ${item.title}: ${finished.has(item.id) ? "unfinished" : "finished"}`} aria-pressed={finished.has(item.id)} onClick={() => toggleFinished(item.id)}>✓</button></div>)}{visible.length > limit && <button className="load-more" onClick={() => setLimit((value) => value + 80)}>Show more · {visible.length - limit} remaining</button>}{!visible.length && <div className="empty-state"><strong>No matching episodes</strong><button onClick={() => { setQuery(""); setLevel("All"); setFilter("all"); }}>Clear filters</button></div>}</div>
    </aside>
    <section className="content-panel"><header className="topbar"><button ref={menuRef} className="menu-button" aria-label="Open episode library" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><UiIcon name="menu" /><span className="menu-label">Lessons</span></button><p>A little Chinese, every day.</p><div className="topbar-actions"><button onClick={random}>Random</button><button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}><UiIcon name={dark ? "sun" : "moon"} /></button></div></header>
      <div className="lesson-scroll"><div className="lesson"><div className="lesson-heading"><div><div className="eyebrow"><span className="recording-badge">RECORDED AUDIO</span><span>{levelLabel(episode.level)} · {time(episode.duration)}</span></div><h2 id="podcast-title" tabIndex={-1}>{episode.title}</h2></div><button className={`heading-complete ${finished.has(episode.id) ? "is-finished" : ""}`} aria-label="Mark current episode as finished" aria-pressed={finished.has(episode.id)} onClick={() => toggleFinished(episode.id)}>✓</button></div>
        <EpisodeStudy key={episode.id} sourceUrl={episode.sourceUrl} onPronunciation={() => audioRef.current?.pause()} />
        <p className="publisher-credit">Audio is streamed from ChinesePod’s public podcast feeds. Recordings and lesson materials belong to ChinesePod. <a href="https://www.chinesepod.com" target="_blank" rel="noreferrer">Visit ChinesePod ↗</a></p>
      </div></div>
      <section className="player recorded-player" aria-label="Recorded Mandarin audio player">
        {error && <p className="speech-notice" role="alert">{error} <button onClick={() => { audioRef.current?.load(); start(); }}>Retry</button></p>}
        <audio ref={audioRef} src={episode.audioUrl} preload="metadata" loop={loop} onPlay={() => { setPlaying(true); setError(null); }} onPlaying={() => setBuffering(false)} onWaiting={() => setBuffering(true)} onPause={() => { setPlaying(false); setBuffering(false); savePosition(); }} onError={() => { setPlaying(false); setBuffering(false); setError("The episode could not load. Check your connection and try again."); }} onDurationChange={() => { const audio = audioRef.current; if (audio && Number.isFinite(audio.duration)) setDuration(audio.duration); }} onLoadedMetadata={() => { const audio = audioRef.current; if (!audio) return; setDuration(Number.isFinite(audio.duration) ? audio.duration : 0); audio.playbackRate = rate; if (restoreRef.current !== null && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(restoreRef.current, Math.max(0, audio.duration - 1)); setPosition(audio.currentTime); restoreRef.current = null; } }} onTimeUpdate={() => { const audio = audioRef.current; if (!audio) return; setPosition(audio.currentTime); if (Date.now() - lastSaveRef.current > 1000) { savePosition(); lastSaveRef.current = Date.now(); } }} onEnded={() => { setPlaying(false); if (autoNext && (!sleepUntil || sleepUntil > Date.now())) next(1, true); }} />
        <div className="progress-wrap"><span className="progress-time">{time(position)}</span><input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(position, duration || 0)} disabled={!duration} aria-label="Episode progress" aria-valuetext={`${time(position)} / ${time(duration)}`} onChange={(event) => { const audio = audioRef.current; if (audio && duration) { const value = Number(event.target.value); audio.currentTime = value; setPosition(value); savePosition(); } }} style={{ "--progress": duration ? `${position / duration * 100}%` : "0%" } as CSSProperties} /><span className="progress-time">{time(duration)}</span></div>
        <div className="player-main"><div className="transport"><button className="skip-button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }} aria-label="Back 10 seconds"><MediaIcon name="replay10" /></button><button className="track-button" onClick={() => next(-1)} aria-label="Previous episode"><MediaIcon name="previous" /></button><button className="play-button" disabled={!ready} onClick={() => playing ? audioRef.current?.pause() : start()} aria-label={playing ? "Pause podcast" : "Play podcast"}>{buffering && playing ? <span aria-hidden="true">…</span> : <MediaIcon name={playing ? "pause" : "play"} />}</button><button className="track-button" onClick={() => next(1)} aria-label="Next episode"><MediaIcon name="next" /></button><button className="skip-button" onClick={() => { const audio = audioRef.current; if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); }} aria-label="Forward 10 seconds"><MediaIcon name="forward10" /></button></div><div className="player-options"><button className={autoNext ? "is-on" : ""} aria-pressed={autoNext} onClick={() => setAutoNext((value) => !value)}><span aria-hidden="true">⏭</span><span className="control-label">Auto next</span></button><button className={loop ? "is-on" : ""} aria-pressed={loop} onClick={() => setLoop((value) => !value)}><span aria-hidden="true">↻</span><span className="control-label">Loop</span></button><SleepTimerButton until={sleepUntil} remaining={remaining} onSelect={(minutes) => { setSleepUntil(minutes ? Date.now() + minutes * 60000 : null); setRemaining(minutes * 60); }} /><button className={`speed-button ${rate !== 1 ? "is-on" : ""}`} onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])} aria-label={`Playback speed ${rate}, change speed`} title="Change playback speed"><span className="speed-value">{rate}×</span><span className="control-label">Speed</span></button></div></div>
      </section>
    </section>
  </main>;
}

export const PODCAST_COUNT = episodes.length;
