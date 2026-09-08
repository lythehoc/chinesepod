"use client";
import { useRef } from "react";

export const SLEEP_OPTIONS = [0, 15, 30, 45, 60] as const;
export default function SleepTimerButton({ until, remaining, onSelect }: { until: number | null; remaining: number; onSelect: (minutes: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return <>
    <button className={`sleep-button ${until ? "is-on" : ""}`} aria-label={until ? `Sleep timer, ${countdown} remaining` : "Sleep timer off"} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><span aria-hidden="true">☾</span><span>{until ? countdown : "Sleep"}</span></button>
    <dialog className="sleep-dialog" ref={dialog} aria-label="Sleep timer" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sleep-dialog-heading"><h2>Sleep timer</h2><button aria-label="Close sleep timer" onClick={() => dialog.current?.close()}>×</button></div>
      <p>{until ? `Playback stops in ${countdown}.` : "Choose when to stop playback."}</p>
      <div className="sleep-choices">{SLEEP_OPTIONS.map((minutes) => <button key={minutes} onClick={() => { onSelect(minutes); dialog.current?.close(); }}>{minutes ? `${minutes} minutes` : "Off"}</button>)}</div>
    </dialog>
  </>;
}
