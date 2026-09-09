export const SLEEP_OPTIONS = [0, 15, 30, 45, 60] as const;
export default function SleepTimerButton({ until, remaining, onSelect }: { until: number | null; remaining: number; onSelect: (minutes: number) => void }) {
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const currentMinutes = until
    ? (SLEEP_OPTIONS.find((minutes) => minutes > 0 && minutes >= Math.ceil(remaining / 60)) ?? 60)
    : 0;
  const nextMinutes = SLEEP_OPTIONS[(SLEEP_OPTIONS.indexOf(currentMinutes) + 1) % SLEEP_OPTIONS.length];
  return <button
    className={`sleep-button ${until ? "is-on" : ""}`}
    aria-label={until ? `Sleep timer, ${countdown} remaining` : "Sleep timer off"}
    aria-pressed={Boolean(until)}
    title={until ? `${countdown} remaining; tap for next setting` : "Set a sleep timer"}
    onClick={() => onSelect(nextMinutes)}
  ><span className="sleep-icon" aria-hidden="true">☾</span><span className="control-label">{until ? countdown : "Sleep"}</span></button>;
}
