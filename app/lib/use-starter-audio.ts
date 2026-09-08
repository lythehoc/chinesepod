"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import audioData from "../data/starter-audio.json";

const recordings: Record<string, string> = audioData;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Options = {
  lessonId: number;
  lines: readonly { hanzi: string }[];
  rate: number;
  loop: boolean;
  autoplayNext: boolean;
  onNext: () => void;
  onPositionChange?: (index: number) => void;
  initialLine?: number;
  autoplay?: boolean;
};

export function useStarterAudio(options: Options) {
  const [activeLine, setActiveLine] = useState(options.initialLine ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const optionsRef = useRef(options);
  const lineRef = useRef(options.initialLine ?? 0);
  const mountedRef = useRef(false);
  const intentRef = useRef(false);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const stop = useCallback(() => {
    generationRef.current += 1;
    intentRef.current = false;
    clearTimer();
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.onwaiting = null;
      audio.pause();
    }
    if (mountedRef.current) setIsPlaying(false);
  }, [clearTimer]);
  const setPosition = useCallback((index: number) => {
    const next = Math.max(0, Math.min(optionsRef.current.lines.length - 1, Number.isFinite(index) ? Math.floor(index) : 0));
    lineRef.current = next;
    setActiveLine(next);
    optionsRef.current.onPositionChange?.(next);
    return next;
  }, []);
  const start = useCallback(function playRecording(text: string, line: number | null) {
    stop();
    const audio = audioRef.current;
    if (!audio || !mountedRef.current) return;
    const source = recordings[text];
    if (!source) { setError("Thiếu tệp phát âm. Hãy thử câu khác."); return; }
    if (line !== null) setPosition(line);
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generation === generationRef.current;
    const fail = () => {
      if (!isCurrent()) return;
      stop();
      setError("Không tải được âm thanh. Kiểm tra kết nối và nhấn Phát để thử lại.");
    };
    const watch = () => {
      clearTimer();
      timerRef.current = setTimeout(fail, 15000);
    };
    setError(null);
    intentRef.current = true;
    audio.src = `${basePath}${source}`;
    audio.playbackRate = optionsRef.current.rate;
    audio.onplaying = () => { if (isCurrent()) { clearTimer(); setIsPlaying(true); } };
    audio.onwaiting = () => { if (isCurrent()) watch(); };
    audio.onerror = fail;
    audio.onended = () => {
      if (!isCurrent()) return;
      clearTimer();
      const current = optionsRef.current;
      if (line !== null && line + 1 < current.lines.length) playRecording(current.lines[line + 1].hanzi, line + 1);
      else if (line !== null && current.loop) playRecording(current.lines[0].hanzi, 0);
      else {
        intentRef.current = false;
        setIsPlaying(false);
        if (line !== null && current.autoplayNext) current.onNext();
      }
    };
    watch();
    void audio.play().catch((reason: unknown) => {
      if (!isCurrent()) return;
      stop();
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Nhấn Phát để bật âm thanh trong trình duyệt."
        : "Chưa phát được âm thanh. Nhấn Phát để thử lại.");
    });
  }, [clearTimer, setPosition, stop]);
  const playLine = useCallback((index: number) => {
    const line = setPosition(index);
    start(optionsRef.current.lines[line].hanzi, line);
  }, [setPosition, start]);
  const play = useCallback(() => playLine(lineRef.current), [playLine]);
  const toggle = useCallback(() => { if (intentRef.current) stop(); else play(); }, [play, stop]);
  const seekLine = useCallback((index: number) => {
    if (intentRef.current) playLine(index);
    else { setPosition(index); setError(null); }
  }, [playLine, setPosition]);
  const speakText = useCallback((text: string) => start(text, null), [start]);
  useEffect(() => {
    optionsRef.current = options;
    if (audioRef.current) audioRef.current.playbackRate = options.rate;
  }, [options]);
  useEffect(() => {
    mountedRef.current = true;
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    if (optionsRef.current.autoplay) play();
    return () => {
      mountedRef.current = false;
      stop();
      if (audioRef.current) { audioRef.current.removeAttribute("src"); audioRef.current.load(); }
      audioRef.current = null;
    };
  }, [play, stop]);
  return { activeLine, isPlaying, error, play, pause: stop, stop, toggle, playLine, seekLine, speakText };
}
