# EchoX

**Free online music.** A small Spotify-style web player built with Astro, streaming full tracks from Audius and 30-second previews from the iTunes Search API — no accounts, no database, no backend.

![Astro](https://img.shields.io/badge/Astro-7.x-ff5d01?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Trending** — a live grid of trending tracks from Audius when the page loads.
- **Search** — queries Audius (full tracks) and iTunes (previews) in parallel and merges the results.
- **Artist view** — clicking any card expands a full-width panel with the artwork, and lists everything else available from that artist.
- **Playback** — a persistent player bar with play/pause, previous/next, seek, shuffle and repeat, plus the queue built from the list you are looking at.
- **Liked songs** — saved locally in `localStorage`, no account needed.
- **Mobile first** — bottom navigation, safe-area aware player, two-column grid and a scrollable detail panel on phones.
- **Cover fallback** — tracks without artwork (or with broken artwork URLs) get a branded EchoX placeholder instead of a broken image.

## Tech stack

| Layer     | Choice                                                        |
| :-------- | :------------------------------------------------------------ |
| Framework | [Astro](https://astro.build) 7 (static output, zero adapter)   |
| Language  | TypeScript (strict)                                            |
| Styling   | Plain CSS with custom properties in `src/styles/global.css`    |
| Audio     | HTML5 `<audio>`, streamed directly from the source APIs        |
| Icons     | Inline SVG + a hand-made `public/favicon.svg` wordmark         |

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

## Project structure

```text
/
├── public/
│   ├── favicon.svg          # EchoX note icon
│   └── favicon.ico
├── src/
│   ├── layouts/
│   │   └── Layout.astro     # <head>, meta tags, global styles
│   ├── lib/
│   │   └── api.ts           # Audius + iTunes clients, Track type, helpers
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

Astro renders the shell and `src/scripts/app.ts` runs on the client. All network calls happen in the browser, which is possible because both APIs send permissive CORS headers — that is why the site needs no server.

- **Audius** — `GET /v1/tracks/trending`, `/v1/tracks/search`, `/v1/users/handle/{handle}/tracks` and `/v1/tracks/{id}/stream`. The stream endpoint redirects to an MP3 and supports HTTP range requests, so seeking works and the whole song plays. The required `app_name=echox` query parameter identifies the app.
- **iTunes Search API** — `GET /search?term=…&entity=song` and `/lookup?id={artistId}&entity=song`. Only `previewUrl` clips (usually 30 seconds) are playable, and the metadata is used to enrich search results.

Tracks are never downloaded or re-hosted; audio is played from the original source. A unified `Track` type normalizes both sources so the UI does not care where a song came from.

## Notes and limitations

- iTunes tracks are **30-second previews only**; full songs come from Audius.
- Availability and audio quality depend entirely on the upstream APIs and can change without notice.
- The Audius free tier allows roughly 10 requests/second and 500k requests/month per app name — fine for personal use, but don't hammer it.
- Liked songs and volume live in `localStorage`, so they do not sync across devices.
- This is a hobby project, not a licensed music service. See [/terms](src/pages/terms.astro) for the full disclaimer.

## License

[MIT](LICENSE) © 2026 dnysaz

Music and metadata remain the property of their respective artists and rights holders.
