"use client";
import { useEffect, useRef, useState } from "react";
import { parsePublicLesson, type PublicLesson, type PublicLine } from "../lib/public-lesson";
import { MediaIcon } from "./icons";

function Vocabulary({ title, rows, pinyin, english, play }: { title: string; rows: PublicLine[]; pinyin: boolean; english: boolean; play: (url: string) => void }) {
  if (!rows.length) return null;
  return <section className="public-vocabulary"><h2>{title}</h2><div className="vocab-block">{rows.map((line, index) => <article className="vocab-item" key={`${line.hanzi}-${index}`}><div className="vocab-copy"><div className="word" lang="zh-Hans">{line.hanzi}</div>{pinyin && <div className="type" lang="zh-Latn-pinyin">{line.pinyin}</div>}{english && <div className="definition">{line.english}</div>}</div>{line.audioUrl && <button className="sentence-play" aria-label={`Listen to ${line.hanzi}`} onClick={() => play(line.audioUrl!)}><MediaIcon name="play" /></button>}</article>)}</div></section>;
}

export default function EpisodeStudy({ sourceUrl, onPronunciation }: { sourceUrl: string; onPronunciation: () => void }) {
  const [material, setMaterial] = useState<PublicLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pinyin, setPinyin] = useState(true);
  const [english, setEnglish] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000); let active = true;
    void (async () => { try { const url = new URL(sourceUrl); if (!["www.chinesepod.com", "chinesepod.com"].includes(url.hostname) || url.protocol !== "https:") throw new Error("Unsupported source"); const response = await fetch(url.href, { credentials: "omit", signal: controller.signal }); if (!response.ok) throw new Error("Unavailable"); const parsed = parsePublicLesson(new DOMParser().parseFromString(await response.text(), "text/html")); if (active) { setMaterial(parsed); setError(null); } } catch { if (active) setError("The lesson notes could not load. Please try again."); } finally { clearTimeout(timeout); } })();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [sourceUrl, attempt]);
  useEffect(() => { const audio = new Audio(); audioRef.current = audio; audio.onerror = () => setAudioError(true); return () => { audio.pause(); audio.removeAttribute("src"); audio.load(); audio.onerror = null; audioRef.current = null; }; }, []);
  const play = (url: string) => { const audio = audioRef.current; if (!audio) return; onPronunciation(); setAudioError(false); audio.src = url; void audio.play().catch(() => setAudioError(true)); };
  return <section className="transcript-card public-study" aria-label="Transcript and vocabulary">
    <div className="card-heading"><div><span className="section-kicker">READ ALONG</span><h3>Transcript &amp; vocabulary</h3></div><button onClick={() => setVisible((value) => !value)} aria-expanded={visible}>{visible ? "Hide notes" : "Show notes"}</button></div>
    {visible && <div className="transcript-content"><div className="reading-toggles"><button aria-pressed={pinyin} onClick={() => setPinyin((value) => !value)}>Pinyin {pinyin ? "✓" : "+"}</button><button aria-pressed={english} onClick={() => setEnglish((value) => !value)}>English {english ? "✓" : "+"}</button></div>
      {!material && !error && <p className="study-status" role="status">Loading transcript…</p>}
      {error && <p className="study-status" role="alert">{error} <button onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Retry</button></p>}
      {material && <><div className="dialogue-block">{material.dialogue.map((line, index) => <article className="line public-study-line" key={`dialogue-${index}`}><span className="speaker">{String(index + 1).padStart(2, "0")}</span><div className="text"><p className="hanzi" lang="zh-Hans">{line.hanzi}</p>{pinyin && <p className="pinyin" lang="zh-Latn-pinyin">{line.pinyin}</p>}{english && <p className="translation">{line.english}</p>}</div>{line.audioUrl && <button className="sentence-play" aria-label={`Listen to ${line.hanzi}`} onClick={() => play(line.audioUrl!)}><MediaIcon name="play" /></button>}</article>)}</div><Vocabulary title="Key Vocabulary" rows={material.keyVocabulary} pinyin={pinyin} english={english} play={play} /><Vocabulary title="Supplementary Vocabulary" rows={material.supplementaryVocabulary} pinyin={pinyin} english={english} play={play} /></>}
      {audioError && <p className="study-status" role="alert">This pronunciation clip could not play. Try it again.</p>}
    </div>}
  </section>;
}
