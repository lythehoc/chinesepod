"use client";
import { useEffect, useRef, useState } from "react";
import { parsePublicLesson, type PublicLesson } from "../lib/public-lesson";
import { MediaIcon } from "./icons";

export default function EpisodeStudy({ sourceUrl, onPronunciation }: { sourceUrl: string; onPronunciation: () => void }) {
  const [material, setMaterial] = useState<PublicLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<"dialogue" | "vocabulary">("dialogue");
  const [pinyin, setPinyin] = useState(true);
  const [english, setEnglish] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let active = true;
    void (async () => {
      try {
        const url = new URL(sourceUrl);
        if (!["www.chinesepod.com", "chinesepod.com"].includes(url.hostname) || url.protocol !== "https:") throw new Error("Unsupported source");
        const response = await fetch(url.href, { credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const parsed = parsePublicLesson(new DOMParser().parseFromString(await response.text(), "text/html"));
        if (active) { setMaterial(parsed); setError(null); }
      } catch { if (active) setError("The public lesson preview could not load. Please try again."); }
      finally { clearTimeout(timeout); }
    })();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [sourceUrl, attempt]);
  useEffect(() => {
    const audio = new Audio(); audioRef.current = audio;
    audio.onerror = () => setAudioError(true);
    return () => { audio.pause(); audio.removeAttribute("src"); audio.load(); audio.onerror = null; audioRef.current = null; };
  }, []);
  const play = (url: string) => {
    const audio = audioRef.current; if (!audio) return;
    onPronunciation(); setAudioError(false); audio.src = url;
    void audio.play().catch(() => setAudioError(true));
  };
  const rows = material?.[tab] ?? [];
  return <section className="transcript-card public-study" aria-label="Episode study material">
    <div className="study-toolbar"><div className="study-tabs" role="group" aria-label="Study section"><button aria-pressed={tab === "dialogue"} className={tab === "dialogue" ? "is-selected" : ""} onClick={() => setTab("dialogue")}>Conversation</button><button aria-pressed={tab === "vocabulary"} className={tab === "vocabulary" ? "is-selected" : ""} onClick={() => setTab("vocabulary")}>Vocabulary</button></div><div className="reading-toggles"><button aria-pressed={pinyin} onClick={() => setPinyin((value) => !value)}>Pinyin {pinyin ? "✓" : "+"}</button><button aria-pressed={english} onClick={() => setEnglish((value) => !value)}>English {english ? "✓" : "+"}</button></div></div>
    {!material && !error && <p className="study-status" role="status">Loading public study material…</p>}
    {error && <p className="study-status" role="alert">{error} <button onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Retry</button></p>}
    {material && !rows.length && <p className="study-status">No public {tab === "dialogue" ? "conversation" : "vocabulary"} preview is available for this episode.</p>}
    <div className="public-study-lines">{rows.map((line, index) => <article className="public-study-line" key={`${tab}-${index}`}><span className="public-line-number">{String(index + 1).padStart(2, "0")}</span><div><p className="hanzi" lang="zh-Hans">{line.hanzi}</p>{pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{line.pinyin}</p>}{english && <p className="translation">{line.english}</p>}</div>{line.audioUrl && <button className="sentence-play" aria-label={`Listen to ${line.hanzi}`} onClick={() => play(line.audioUrl!)}><MediaIcon name="play" /></button>}</article>)}</div>
    {audioError && <p className="study-status" role="alert">This pronunciation clip could not play. Try it again.</p>}
    <p className="public-preview-credit">Public lesson preview · ChinesePod</p>
  </section>;
}
