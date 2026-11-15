# echoX

**Free online music.** A small Spotify-style web player built with Astro, streaming full tracks from Audius, 30-second previews from Deezer and iTunes, podcast episodes and live radio — no accounts, no database, no backend.

![Astro](https://img.shields.io/badge/Astro-7.x-ff5d01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Home rows** — play again, trending, podcast series and live radio, each on a single swipeable row so the page stays short.
- **Trending** — a live selection of trending tracks from Audius when the page loads.
- **Search** — queries Audius (full tracks), Deezer and iTunes (previews), Apple Podcasts and Radio Browser in parallel, each in its own section.
- **Artist view** — clicking any card expands a full-width panel with the artwork, and lists everything else available from that artist.
- **Playback** — a persistent player bar with play/pause, previous/next, seek and volume, plus the queue built from the list you are looking at.
- **Library on this device** — play again, most played, recently played history and liked songs, all stored in `localStorage`.
- **Resume after reload** — the last played song, its queue and its position are restored, and playback continues automatically when the browser allows it.
- **Live radio and podcasts** — community radio stations (HTTPS streams only) and podcast series with full episodes; the radio page loads 20 stations at a time with a *Load more* button, and tapping the now-playing radio title lists the other stations from the same country.
- **Mobile first** — compact top bar with the echoX title and a magnifier that opens a full-width search field, bottom navigation, safe-area aware player above the nav, two-column grid and a scrollable detail panel on phones.
- **Cover fallback** — tracks without artwork (or with broken artwork URLs) get a branded echoX placeholder instead of a broken image.
- **Installable PWA** — web app manifest, maskable home-screen icons and a service worker that caches the app shell, so the player can be installed and opened without browser chrome.

## Tech stack

| Layer     | Choice                                                        |
| :-------- | :------------------------------------------------------------ |
| Framework | [Astro](https://astro.build) 7 (static output, zero adapter)   |
| Language  | TypeScript (strict)                                            |
| Styling   | Plain CSS with custom properties in `src/styles/global.css`    |
| Audio     | HTML5 `<audio>`, streamed directly from the source APIs        |
| Icons     | Inline SVG + a hand-made `public/favicon.svg` play-button mark |

No UI framework, no CSS library, no client-side router — roughly 3 source files of logic plus one stylesheet.

## Getting started

Requires Node **>= 22.23.4**.

```bash
npm install
npm run dev      # http://localhost:4321
```

To open it from a phone on the same network:

```bash
npm run dev -- --host
```

### Build

```bash
npm run build    # static site in ./dist
npm run preview  # serve ./dist locally
```

The build output is fully static, so it can be dropped on GitHub Pages, Netlify, Vercel, Cloudflare Pages or any static host. No environment variables or API keys are needed.

### Install as an app

Chrome, Edge and Android offer **Install app** (or the in-app banner) and open echoX in a standalone window with the play-button icon. On iOS use Safari's **Share → Add to Home Screen**; the install banner explains that step there.

The service worker caches the app shell, icons and hashed build assets, so the interface opens instantly and survives a reload without a connection. Audio is not cached: tracks, radio and podcasts are streamed from their sources and still need the network. Registration only happens in production builds (`npm run build` then `npm run preview`, or a deployed host), never in `astro dev`.

## Project structure

```text
/
├── public/
│   ├── favicon.svg          # echoX play-button icon
│   └── favicon.ico
├── src/
│   ├── layouts/
│   │   └── Layout.astro     # <head>, meta tags, global styles
│   ├── lib/
│   │   └── api.ts           # Audius, Deezer, iTunes, podcast and radio clients
│   ├── pages/
│   │   ├── index.astro      # the player app
│   │   └── terms.astro      # terms of use, API credits, thank you
│   ├── scripts/
│   │   └── app.ts           # all client logic: views, search, detail panel, player
│   └── styles/
│       └── global.css       # theme, layout, detail panel, mobile rules
└── package.json
```

## How it works

Astro renders the shell and `src/scripts/app.ts` runs on the client. All network calls happen in the browser, which is possible because the APIs either send permissive CORS headers or, in Deezer's case, support JSONP — that is why the site needs no server.

- **Audius** — `GET /v1/tracks/trending`, `/v1/tracks/search`, `/v1/users/handle/{handle}/tracks` and `/v1/tracks/{id}/stream`. The stream endpoint redirects to an MP3 and supports HTTP range requests, so seeking works and the whole song plays. The required `app_name=echox` query parameter identifies the app.
- **Deezer** — `GET https://api.deezer.com/search?q=…` and `/artist/{id}/top`, read through JSONP because the public API does not send CORS headers. Playback uses the 30-second `preview` URL and the global catalogue covers Western, Indonesian, Japanese and other releases.
- **iTunes Search API** — `GET /search?term=…&entity=song` and `/lookup?id={artistId}&entity=song`. Only `previewUrl` clips (usually 30 seconds) are playable.
- **Apple Podcasts** — the same iTunes endpoint with `media=podcast&entity=podcastEpisode`; `previewUrl` serves the episode audio and `/lookup?id={collectionId}&entity=podcastEpisode` lists more episodes from a show.
- **Radio Browser** — `GET https://de1.api.radio-browser.info/json/stations/search`, a free, keyless, community-run directory. Only HTTPS streams are offered, and audio plays straight from the broadcaster.

Tracks are never downloaded or re-hosted; audio is played from the original source. A unified `Track` type normalizes every source (with a `live` flag for radio) so the UI does not care where a song came from.

## Notes and limitations

- Deezer and iTunes tracks are **30-second previews only**; full songs come from Audius and podcast episodes come from Apple's podcast feeds. Radio is live and cannot be seeked.
- Availability and audio quality depend entirely on the upstream APIs and can change without notice.
- The Audius free tier allows roughly 10 requests/second and 500k requests/month per app name — fine for personal use, but don't hammer it.
- Liked songs, history, play counts, the current queue and volume live in `localStorage`, so they do not sync across devices.
- Autoplay after a reload depends on the browser's autoplay policy; if it is blocked the last song stays loaded and paused at the saved position.
- This is a hobby project, not a licensed music service. See [/terms](src/pages/terms.astro) for the full disclaimer.

## License

[MIT](LICENSE) © 2026 dnysaz

Music and metadata remain the property of their respective artists and rights holders.
