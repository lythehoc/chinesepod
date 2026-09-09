"use client";

import { useEffect, useRef, useState } from "react";
import episodes from "../data/ori.json";
import { normalizeSearch } from "../lib/lessons";

const STORAGE = "chinesepod:ori-study-v2";
const TASKS = [
  ["context", "Watch for meaning", "Watch once without pausing. Use the action and expressions to follow the story."],
  ["listen", "Replay one short scene", "Set YouTube to 0.75×, replay 30–60 seconds, and listen for the episode words."],
  ["shadow", "Copy one sentence", "Pause after one sentence, repeat it three times, then save its timestamp below."],
] as const;
type Study = { selected: string; watched: string[]; notes: Record<string, string>; tasks: Record<string, string[]> };
const initial: Study = { selected: episodes[0].videoId, watched: [], notes: {}, tasks: {} };
function readTasks(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, items]) => {
    if (!episodes.some((episode) => episode.videoId === id) || !Array.isArray(items)) return [];
    return [[id, items.filter((item): item is string => typeof item === "string" && TASKS.some(([task]) => task === item))]];
  }));
}

export default function OriLibrary() {
  const [query, setQuery] = useState("");
  const [study, setStudy] = useState<Study>(initial);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const episode = episodes.find((item) => item.videoId === study.selected) ?? episodes[0];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
        if (stored && typeof stored === "object") setStudy({
          selected: episodes.some((item) => item.videoId === stored.selected) ? stored.selected : initial.selected,
          watched: Array.isArray(stored.watched) ? stored.watched.filter((id: unknown) => episodes.some((item) => item.videoId === id)) : [],
          notes: stored.notes && typeof stored.notes === "object" && !Array.isArray(stored.notes) ? Object.fromEntries(Object.entries(stored.notes).filter(([id, text]) => episodes.some((item) => item.videoId === id) && typeof text === "string")) as Record<string, string> : {},
          tasks: readTasks(stored.tasks),
        });
      } catch { /* Viewing works without saved progress. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(STORAGE, JSON.stringify(study)); } catch { /* Storage is optional. */ } }
  }, [ready, study]);
  const visible = episodes.filter((item) => normalizeSearch(`Season 1 Episode ${item.id} ${item.lessonTitle} ${item.pinyin} ${item.english}`).includes(normalizeSearch(query)));
  const select = (videoId: string) => {
    setStudy((previous) => ({ ...previous, selected: videoId }));
    videoRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const index = episodes.findIndex((item) => item.videoId === episode.videoId);
  const doneTasks = study.tasks[episode.videoId] ?? [];
  const toggleTask = (task: string) => setStudy((previous) => {
    const current = previous.tasks[episode.videoId] ?? [];
    const next = current.includes(task) ? current.filter((value) => value !== task) : [...current, task];
    const watched = next.length === TASKS.length ? [...new Set([...previous.watched, episode.videoId])] : previous.watched.filter((value) => value !== episode.videoId);
    return { ...previous, watched, tasks: { ...previous.tasks, [episode.videoId]: next } };
  });
  return <main className="ori-page">
    <header className="ori-intro"><span className="section-kicker">LEARN WITH ANIMATION</span><h1>Ori Princess <span lang="zh-Hans">甜心格格</span></h1><p>Each episode has its own Chinese title phrase, pinyin, meaning, vocabulary, and listening practice.</p></header>
    <div className="ori-columns"><section className="ori-feature">
      <label className="ori-episode-picker">Episode<select aria-label="Choose Ori episode" value={episode.videoId} onChange={(event) => select(event.target.value)}>{episodes.map((item) => <option key={item.videoId} value={item.videoId}>{item.id}. {item.lessonTitle}</option>)}</select></label>
      <section className="ori-language" aria-labelledby="ori-language-title"><span className="section-kicker">EPISODE PHRASE</span><h2 id="ori-language-title" lang="zh-Hans">{episode.lessonTitle}</h2><p className="pinyin" lang="zh-Latn-pinyin">{episode.pinyin}</p><p className="translation">{episode.english}</p><div className="ori-word-grid">{episode.words.map((word) => <article key={word.hanzi}><strong lang="zh-Hans">{word.hanzi}</strong><span lang="zh-Latn-pinyin">{word.pinyin}</span><small>{word.english}</small></article>)}</div><p className="ori-source-note">These words come from this episode’s story title. They are a listening target, not a transcript.</p></section>
      <div ref={videoRef} className="ori-video"><iframe key={episode.videoId} src={`https://www.youtube-nocookie.com/embed/${episode.videoId}?hl=en&playsinline=1&rel=0`} title={`Ori Princess — Episode ${episode.id}: ${episode.english} — Mandarin`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
      <div className="ori-now"><div><span>SEASON 1 · EPISODE {episode.id}</span><h2>{episode.english}</h2></div><div className="ori-navigation"><button disabled={index === 0} onClick={() => select(episodes[index - 1].videoId)}>‹ Previous</button><button disabled={index === episodes.length - 1} onClick={() => select(episodes[index + 1].videoId)}>Next ›</button></div></div>
      <section className="ori-practice" aria-labelledby="ori-practice-title"><div className="ori-practice-heading"><div><span className="section-kicker">THREE-PASS PRACTICE</span><h2 id="ori-practice-title">Learn from this episode</h2></div><span>{doneTasks.length} / {TASKS.length}</span></div><div className="ori-task-list">{TASKS.map(([id, title, detail]) => <button key={id} aria-pressed={doneTasks.includes(id)} onClick={() => toggleTask(id)}><span className="ori-task-check" aria-hidden="true">{doneTasks.includes(id) ? "✓" : "○"}</span><span><strong>{title}</strong><small>{detail}</small></span></button>)}</div><label className="ori-note-label" htmlFor="ori-note">Phrase and timestamp</label><textarea id="ori-note" value={study.notes[episode.videoId] ?? ""} placeholder="Example: 03:18 — 写在这里 — pinyin — meaning" onChange={(event) => setStudy((previous) => ({ ...previous, notes: { ...previous.notes, [episode.videoId]: event.target.value } }))} /><small>Saved in this browser for episode {episode.id}.</small></section>
    </section><section className="ori-episodes" aria-labelledby="ori-episodes-title"><div className="ori-list-heading"><span className="section-kicker">EPISODE LIBRARY</span><h2 id="ori-episodes-title">Season 1 · Mandarin</h2><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search Ori episodes" placeholder="Search Chinese, pinyin, or English" value={query} onChange={(event) => setQuery(event.target.value)} /></label><p aria-live="polite">{study.watched.length} studied · {visible.length} episodes</p></div><div className="ori-list">{visible.map((item) => <article className={`ori-episode ${item.videoId === episode.videoId ? "is-active" : ""}`} key={item.videoId}><button className="ori-select" aria-current={item.videoId === episode.videoId ? "true" : undefined} onClick={() => select(item.videoId)}><small>Episode {String(item.id).padStart(2, "0")} · {item.pinyin}</small><strong lang="zh-Hans">{item.lessonTitle}</strong><span>{item.english}</span></button><span className="ori-list-status" aria-label={(study.tasks[item.videoId]?.length ?? 0) === TASKS.length ? "Studied" : `${study.tasks[item.videoId]?.length ?? 0} of 3 steps complete`}>{(study.tasks[item.videoId]?.length ?? 0) === TASKS.length ? "✓" : `${study.tasks[item.videoId]?.length ?? 0}/3`}</span></article>)}{!visible.length && <p>No episodes found.</p>}</div><p className="publisher-credit">Full Mandarin episodes are embedded from the official Asia Animation Channel.</p></section></div>
  </main>;
}
