# chinesepod 🎧

A little Chinese, every day.

[Learn online](https://lythehoc.github.io/chinesepod/)

`chinesepod` is a phone-friendly Mandarin listening library with recorded
podcasts, starter lessons, and Ori Princess episodes. Read Chinese and pinyin,
learn with English explanations, and pick up where you left off.

## Highlights

- Browse **1,920 ChinesePod episodes** across five levels, with search and completion filters.
- Use the engpod-style player: central Play/Pause, previous/next, ±10 seconds, seeking, speed, loop and sleep timer.
- Read public dialogue and vocabulary previews inside each episode, with pronunciation clips.
- Practise **24 original starter lessons** with English translations, pinyin and **288 included pronunciation clips**, starting at 1× speed.
- Watch **47 full Mandarin Ori Princess episodes** from Asia Animation Channel without leaving the app; keep a listening notebook for each episode.
- Save progress locally, with light/dark themes and no app account needed.

ChinesePod audio includes Mandarin conversations and English teaching. Public study previews and YouTube videos are served by their publishers and depend on
source availability. The app does not unlock or bundle private study materials.

## Run locally

Install Node.js 24 or newer:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run lint` and `npm test` to validate changes.

## GitHub Pages

Published at **https://lythehoc.github.io/chinesepod/**.
Pushes to `main` run checks and deploy `out/` through GitHub Actions.
The build automatically uses the repository’s base path. No backend or API key is required.

## Credits

- Recorded audio and public lesson previews: [ChinesePod](https://www.chinesepod.com).
  Podcast metadata comes from its public [beginner](https://anchor.fm/s/109bf914/podcast/rss)
  and [intermediate](https://anchor.fm/s/317bc3a8/podcast/rss) feeds.
- Ori Princess: [Asia Animation Channel’s Mandarin playlist](https://www.youtube.com/playlist?list=PLfyJ-JCO9sSmsJxDSd1aATOSE2sUX2BBr).
- Original starter lessons use pre-generated Tingting Mandarin speech.
- [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand), under the included
  [SIL Open Font License](public/fonts/PatrickHand-OFL.txt).

Maintenance tools are in `scripts/`: import podcast metadata from local RSS files,
check publisher audio URLs, and regenerate starter audio on macOS.
