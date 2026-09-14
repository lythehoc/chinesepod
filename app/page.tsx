"use client";

import { useEffect, useState } from "react";
import CultureLibrary from "./components/culture-library";
import OriLibrary from "./components/ori-library";
import PodcastLibrary from "./components/podcast-library";

type Theme = "light" | "dark";
type Mode = "recordings" | "ori" | "culture";
const THEME_KEY = "mandarinsteps:theme-v1";

export default function Home() {
  const [mode, setMode] = useState<Mode>("recordings");
  const [theme, setTheme] = useState<Theme>("light");
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem(THEME_KEY);
      const next = stored === "dark" ? "dark" : "light";
      setTheme(next);
      document.documentElement.dataset.theme = next;
      setThemeReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, themeReady]);

  const toggleTheme = () => setTheme((value) => value === "light" ? "dark" : "light");

  return <div className="workspace">
    <nav className="course-switcher" aria-label="Chinese learning library">
      <div className="course-tabs">
        <button aria-pressed={mode === "recordings"} onClick={() => setMode("recordings")}>Podcast</button>
        <button aria-pressed={mode === "ori"} onClick={() => setMode("ori")}>Ori Princess</button>
        <button aria-pressed={mode === "culture"} onClick={() => setMode("culture")}>Poetry &amp; songs</button>
      </div>
    </nav>
    {mode === "recordings" ? <PodcastLibrary theme={theme} onToggleTheme={toggleTheme} /> : mode === "ori" ? <OriLibrary theme={theme} onToggleTheme={toggleTheme} /> : <CultureLibrary theme={theme} onToggleTheme={toggleTheme} />}
  </div>;
}
