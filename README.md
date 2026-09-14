# chinesepod 🎧

A little Chinese, every day.

[Learn online](https://lythehoc.github.io/chinesepod/)

`chinesepod` is a phone-friendly Mandarin listening library with recorded
podcasts, Ori Princess episodes, classical poetry, and modern
Mandarin songs. Read Chinese and pinyin, learn with English explanations, and
pick up where you left off.

## Highlights

- Browse **1,920 ChinesePod episodes** across five levels, with search and completion filters.
- Use the engpod-style player: central Play/Pause, previous/next, ±10 seconds, seeking, tap-to-cycle speed, loop, auto next, and a 15/30/45/60-minute sleep timer. Episode changes keep playing without a page reload.
- Read the conversation, Key Vocabulary, and Supplementary Vocabulary in one transcript card, with pinyin, English, and pronunciation clips when the source provides them.
- Learn with **47 full Mandarin Ori Princess episodes** from Asia Animation Channel without leaving the app. Every episode includes 24 timestamped lines recovered from its on-screen Mandarin captions, pinyin, English translations, Key Vocabulary, Supplementary Vocabulary, a three-pass listening checklist, and a saved notebook. The video remains visible while the lesson pane scrolls on desktop and mobile.
- Read **30 classical Chinese poems** line by line with pinyin, English meaning, key vocabulary, and included Mandarin pronunciation.
- Learn from **50 modern Mandarin songs**, including music by Hebe Tien, G.E.M., Accusefive, Jay Chou, JJ Lin, Mayday, Zhou Shen, Jolin Tsai, LaLa Hsu, A-Lin, Sodagreen, and WeiBird. YouTube uploads play inside the site, with reusable vocabulary and original practice phrases for each song.
- Use one saved light or dark theme across every learning tab.
- Save progress locally, with light/dark themes and no app account needed.

ChinesePod audio includes Mandarin conversations and English teaching. Public study previews and YouTube videos are served by their publishers and depend on source availability.

## Run locally

Install Node.js 24 or newer:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run lint` and `npm test` to validate changes.

## Credits

- Recorded audio and public lesson previews: [ChinesePod](https://www.chinesepod.com).
  Podcast metadata comes from its public [beginner](https://anchor.fm/s/109bf914/podcast/rss)
  and [intermediate](https://anchor.fm/s/317bc3a8/podcast/rss) feeds.
- Ori Princess: [Asia Animation Channel’s Mandarin playlist](https://www.youtube.com/playlist?list=PLfyJ-JCO9sSmsJxDSd1aATOSE2sUX2BBr).
- Classical poem texts: [Chinese Wikisource](https://zh.wikisource.org/wiki/Portal:%E8%AF%97%E6%AD%8C). Modern songs are embedded from official artist, label, and soundtrack YouTube uploads.
- Poetry and song study material uses included Mandarin pronunciation audio.
- [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand), under the included
  [SIL Open Font License](public/fonts/PatrickHand-OFL.txt).

Maintenance tools are in `scripts/`: import podcast metadata from local RSS files,
check publisher audio URLs, and regenerate Mandarin pronunciation audio on macOS.
