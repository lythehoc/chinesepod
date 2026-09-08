"use client";

import { useEffect, useRef, useState } from "react";
import episodes from "../data/ori.json";
import { normalizeSearch } from "../lib/lessons";

const STORAGE = "chinesepod:ori-study-v2";
const words = [
  ["公主", "gōngzhǔ", "princess"], ["朋友", "péngyou", "friend"],
  ["老师", "lǎoshī", "teacher"], ["学校", "xuéxiào", "school"],
  ["谢谢", "xièxie", "thank you"], ["对不起", "duìbuqǐ", "sorry"],
];
type Study = { selected: string; watched: string[]; notes: Record<string, string> };
const initial: Study = { selected: episodes[0].videoId, watched: [], notes: {} };

export default function OriLibrary() {
  const [query, setQuery] = useState("");
  const [study, setStudy] = useState<Study>(initial);
  const [ready, setReady] = useState(false);
  const [pinyin, setPinyin] = useState(true);
  const [english, setEnglish] = useState(true);
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
        });
      } catch { /* Viewing works without saved progress. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(STORAGE, JSON.stringify(study)); } catch { /* Storage is optional. */ } }
  }, [ready, study]);
  const visible = episodes.filter((item) => normalizeSearch(`Season 1 Episode ${item.id} ${item.title}`).includes(normalizeSearch(query)));
  const select = (videoId: string) => {
    setStudy((previous) => ({ ...previous, selected: videoId }));
    videoRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const index = episodes.findIndex((item) => item.videoId === episode.videoId);
  const toggleWatched = (id: string) => setStudy((previous) => ({ ...previous, watched: previous.watched.includes(id) ? previous.watched.filter((value) => value !== id) : [...previous.watched, id] }));
  return <main className="ori-page">
    <div className="ori-intro"><span className="section-kicker">LEARN WITH ANIMATION</span><h1>Ori Princess <span lang="zh-Hans">甜心格格</span></h1><p>Watch in Mandarin, listen again, and practise one short phrase at a time.</p></div>
    <div className="ori-columns"><section className="ori-feature">
      <div ref={videoRef} className="ori-video"><iframe key={episode.videoId} src={`https://www.youtube-nocookie.com/embed/${episode.videoId}?hl=en&playsinline=1&rel=0`} title={`Ori Princess — Season 1, Episode ${episode.id} — Mandarin`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
      <div className="ori-now"><h2>Season 1 · Episode {episode.id}</h2><div className="ori-navigation"><button disabled={index === 0} onClick={() => select(episodes[index - 1].videoId)}>‹ Previous</button><button aria-pressed={study.watched.includes(episode.videoId)} onClick={() => toggleWatched(episode.videoId)}>{study.watched.includes(episode.videoId) ? "✓ Watched" : "Mark as watched"}</button><button disabled={index === episodes.length - 1} onClick={() => select(episodes[index + 1].videoId)}>Next ›</button></div></div>
      <p className="publisher-credit">Mandarin edition · Asia Animation Channel. <a href={`https://www.youtube.com/watch?v=${episode.videoId}`} target="_blank" rel="noreferrer">Open on YouTube if playback is unavailable ↗</a></p>
      <section className="recording-card"><span className="section-kicker">LISTEN · REPEAT · REMEMBER</span><h2>Your listening notebook</h2><p>Pause after a short phrase, say it aloud, then replay it using the video timeline. Use YouTube’s settings to slow the video down.</p><label className="ori-note-label" htmlFor="ori-note">Notes for episode {episode.id}</label><textarea id="ori-note" value={study.notes[episode.videoId] ?? ""} placeholder="Save a timestamp, a Chinese phrase, its pinyin, and what it means…" onChange={(event) => setStudy((previous) => ({ ...previous, notes: { ...previous.notes, [episode.videoId]: event.target.value } }))} /><small>Saved in this browser, separately for each episode.</small></section>
      <section className="recording-card ori-vocab"><div className="ori-vocab-heading"><h2>Words to listen for</h2><div className="reading-toggles"><button aria-pressed={pinyin} onClick={() => setPinyin((value) => !value)}>Pinyin {pinyin ? "✓" : "+"}</button><button aria-pressed={english} onClick={() => setEnglish((value) => !value)}>English {english ? "✓" : "+"}</button></div></div><div className="ori-words">{words.map(([hanzi, reading, meaning]) => <div key={hanzi}><strong lang="zh-Hans">{hanzi}</strong>{pinyin && <span lang="zh-Latn-pinyin">{reading}</span>}{english && <span>{meaning}</span>}</div>)}</div><p>General practice vocabulary, not a transcript or timed subtitles.</p></section>
    </section><section className="ori-episodes" aria-labelledby="ori-episodes-title"><div className="ori-list-heading"><span className="section-kicker">WATCH HERE</span><h2 id="ori-episodes-title">Season 1 · Mandarin</h2><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search Ori episodes" placeholder="Search an episode number" value={query} onChange={(event) => setQuery(event.target.value)} /></label><p aria-live="polite">{study.watched.length} watched · {visible.length} episodes</p></div><div className="ori-list">{visible.map((item) => <article className={`ori-episode ${item.videoId === episode.videoId ? "is-active" : ""}`} key={item.videoId}><button className="ori-select" aria-current={item.videoId === episode.videoId ? "true" : undefined} onClick={() => select(item.videoId)}><small>Season 1 · Mandarin</small><strong>Episode {String(item.id).padStart(2, "0")}</strong></button><button aria-label={`Mark episode ${item.id} as ${study.watched.includes(item.videoId) ? "unwatched" : "watched"}`} aria-pressed={study.watched.includes(item.videoId)} onClick={() => toggleWatched(item.videoId)}>{study.watched.includes(item.videoId) ? "✓" : "○"}</button></article>)}{!visible.length && <p>No episodes found.</p>}</div><p className="publisher-credit">Full episodes published by Asia Animation Channel. Availability can vary by region.</p></section></div>
  </main>;
}
