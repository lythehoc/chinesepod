"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cultureData from "../data/culture.json";
import { useMandarinAudio } from "../lib/use-mandarin-audio";
import { MediaIcon, UiIcon } from "./icons";

type Theme = "light" | "dark";
type Kind = "poem" | "song";
type Line = { hanzi: string; pinyin: string; english: string };
type Item = {
  id: string; kind: Kind; title: string; pinyinTitle: string; englishTitle: string;
  creator: string; period: string; videoId?: string; lines: Line[]; vocabulary: Line[];
};

const items = cultureData as Item[];
const STORAGE = "mandarinsteps:culture-v1";

function readCompleted() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export default function CultureLibrary({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [kind, setKind] = useState<Kind>("poem");
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [query, setQuery] = useState("");
  const [pinyin, setPinyin] = useState(true);
  const [english, setEnglish] = useState(true);
  const [completed, setCompleted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const studyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { setCompleted(readCompleted()); setReady(true); });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE, JSON.stringify(completed)); }, [completed, ready]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) => item.kind === kind && (!normalized || [item.title, item.pinyinTitle, item.englishTitle, item.creator, ...item.lines.flatMap((line) => [line.hanzi, line.pinyin, line.english])].join(" ").toLocaleLowerCase().includes(normalized)));
  }, [kind, query]);
  const item = items.find((entry) => entry.id === selectedId) ?? items.find((entry) => entry.kind === kind) ?? items[0];

  const selectKind = (next: Kind) => {
    setKind(next); setQuery("");
    const first = items.find((entry) => entry.kind === next);
    if (first) setSelectedId(first.id);
  };
  const selectItem = (next: Item) => {
    setSelectedId(next.id);
    requestAnimationFrame(() => studyRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  const toggleCompleted = () => setCompleted((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
  const navigate = useCallback((direction: number) => {
    const sameKind = items.filter((entry) => entry.kind === item.kind);
    const index = sameKind.findIndex((entry) => entry.id === item.id);
    const next = sameKind[(index + direction + sameKind.length) % sameKind.length];
    setSelectedId(next.id);
  }, [item]);
  const speech = useMandarinAudio({ lessonId: 1000, lines: item.lines, rate: 1, loop: false, autoplayNext: false, onNext: () => navigate(1) });
  const { stop: stopSpeech, seekLine: resetSpeechLine } = speech;
  useEffect(() => { stopSpeech(); resetSpeechLine(0); }, [item.id, stopSpeech, resetSpeechLine]);

  return (
    <main className="culture-page">
      <header className="culture-header">
        <div><span className="section-kicker">READ · LISTEN · DISCOVER</span><h1>Poetry <span>&amp; Songs</span></h1><p>Read timeless poems and learn Mandarin through songs you will want to replay.</p></div>
        <button className="ori-theme-toggle" onClick={onToggleTheme} aria-label={`Switch theme to ${theme === "light" ? "dark" : "light"}`}><UiIcon name={theme === "light" ? "moon" : "sun"} /><span>{theme === "light" ? "Dark" : "Light"}</span></button>
      </header>

      <div className="culture-columns">
        <aside className="culture-browser" aria-label="Poetry and song library">
          <div className="culture-kind-tabs" role="tablist" aria-label="Choose a collection">
            <button role="tab" aria-selected={kind === "poem"} onClick={() => selectKind("poem")}>Poetry</button>
            <button role="tab" aria-selected={kind === "song"} onClick={() => selectKind("song")}>Songs</button>
          </div>
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind === "poem" ? "poems" : "songs"}`} aria-label={`Search ${kind === "poem" ? "poems" : "songs"}`} />{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
          <div className="culture-list">
            {filtered.map((entry, index) => <button key={entry.id} className={entry.id === item.id ? "is-active" : ""} aria-current={entry.id === item.id ? "true" : undefined} onClick={() => selectItem(entry)}><span>{String(index + 1).padStart(2, "0")}</span><span><strong lang="zh-Hans">{entry.title}</strong><small>{entry.englishTitle}</small><em>{entry.creator}</em></span>{completed.includes(entry.id) && <b aria-label="Finished">✓</b>}</button>)}
            {!filtered.length && <p className="culture-empty">No matches found.</p>}
          </div>
        </aside>

        <section className="culture-study" ref={studyRef}>
          <div className="culture-title-row">
            <div><span className="section-kicker">{item.period}</span><h2 lang="zh-Hans">{item.title}</h2><p className="culture-title-pinyin">{item.pinyinTitle}</p><p>{item.englishTitle} · {item.creator}</p></div>
            <button className={`heading-complete ${completed.includes(item.id) ? "is-finished" : ""}`} onClick={toggleCompleted} aria-label={`Mark ${completed.includes(item.id) ? "unfinished" : "finished"}`} aria-pressed={completed.includes(item.id)}><span aria-hidden="true">✓</span></button>
          </div>

          {item.videoId && <div className="culture-video"><iframe src={`https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&playsinline=1`} title={`${item.title} — ${item.creator}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}

          <section className="culture-card" aria-label={`${item.kind === "poem" ? "Poem" : "Song"} study material`}>
            <div className="culture-card-tools">
              <button id="culture-play-all" className="culture-play-all" onClick={speech.toggle}><MediaIcon name={speech.isPlaying ? "pause" : "play"} /><span>{speech.isPlaying ? "Pause" : item.kind === "poem" ? "Hear the poem" : "Hear key phrases"}</span></button>
              <div className="reading-toggles" role="group" aria-label="Reading support"><button aria-pressed={pinyin} onClick={() => setPinyin((value) => !value)}>Pinyin<span>{pinyin ? "✓" : ""}</span></button><button aria-pressed={english} onClick={() => setEnglish((value) => !value)}>English<span>{english ? "✓" : ""}</span></button></div>
            </div>
            {speech.error && <p className="audio-message" role="alert">{speech.error}</p>}
            <div className="culture-lines">
              {item.lines.map((line, index) => <article className={`culture-line ${speech.activeLine === index ? "is-current" : ""}`} key={`${item.id}-${index}`}><span className="public-line-number">{String(index + 1).padStart(2, "0")}</span><div><h3 lang="zh-Hans">{line.hanzi}</h3>{pinyin && <p className="pinyin">{line.pinyin}</p>}{english && <p className="translation">{line.english}</p>}</div><button className="sentence-play" onClick={() => speech.isPlaying && speech.activeLine === index ? speech.pause() : speech.playLine(index)} aria-label={`${speech.isPlaying && speech.activeLine === index ? "Pause" : "Play"} line ${index + 1}`}><MediaIcon name={speech.isPlaying && speech.activeLine === index ? "pause" : "play"} /></button></article>)}
            </div>
          </section>

          <section className="culture-vocabulary"><span className="section-kicker">KEY VOCABULARY</span><h2>Words to remember</h2><div>{item.vocabulary.map((word) => <article key={word.hanzi}><strong lang="zh-Hans">{word.hanzi}</strong>{pinyin && <span>{word.pinyin}</span>}{english && <small>{word.english}</small>}<button onClick={() => speech.speakText(word.hanzi)} aria-label={`Play ${word.hanzi}`}><MediaIcon name="play" /></button></article>)}</div></section>
          <nav className="culture-navigation" aria-label={`${item.kind} navigation`}><button onClick={() => navigate(-1)}>‹ Previous</button><button onClick={() => navigate(1)}>Next ›</button></nav>
        </section>
      </div>
    </main>
  );
}
