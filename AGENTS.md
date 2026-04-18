# Music Bingo - AI Agent Context

## Overview

Music Bingo is a single-page Angular app that parses an Apple Music XML export and renders songs as cards. Users manage custom lists, assign songs to lists, and share lists via URL.

Album cover workflow:

- `npm run collect` downloads missing cover images from Discogs.
- Covers are stored directly as files in `sources/album-covers/<persistentId>.jpeg`.
- The Angular UI resolves cover path from `song.persistentId` and falls back to an icon when the file is missing.
- XML and cover assets are always resolved from `document.baseURI`:
  - Local dev reads local files.
  - Deployed app reads from GitHub Pages URL.

PWA/service-worker workflow:

- Production builds generate Angular Service Worker (`ngsw`) from `ngsw-config.json`.
- App shell assets are prefetched; album covers are cached lazily after first view.
- The app checks for new versions and prompts reload when an update is ready.

Live URL: https://misomarcell.github.io/music-bingo/  
Repository: https://github.com/misomarcell/music-bingo

---

## Agent Maintenance Rules

- Keep this file synchronized with architecture/tooling changes.
- After changes, run both quality gates locally:
  1. `npm run lint`
  2. `npm run build`
- Pre-commit hook (`husky` + `lint-staged`) lints staged `*.ts` and `*.html`.

---

## Tech Stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Framework       | Angular 21.2.x (standalone components)                        |
| UI              | Angular Material 21.2.4 (M3)                                  |
| Styling         | SCSS + `--mat-sys-*` tokens                                   |
| State           | Angular Signals                                               |
| PWA             | Angular Service Worker (`@angular/service-worker`)            |
| Data Source     | Apple Music plist XML (`sources/default.xml`)                 |
| Sharing         | `lz-string` URL payloads                                      |
| Album Collector | Node script + Discogs API (`scripts/collect-album-covers.ts`) |
| Script Runtime  | Node 20+, `tsx`, `dotenv`, `@xmldom/xmldom`                   |
| Linting         | ESLint 10 + `angular-eslint`                                  |
| Deployment      | GitHub Actions -> GitHub Pages                                |

---

## Project Structure

```
music-bingo/
├── scripts/
│   └── collect-album-covers.ts      # Discogs cover collector
├── sources/
│   ├── songs/                       # XML source files
│   │   ├── index.json               # Manifest listing available XML files
│   │   └── default.xml              # Apple Music export (default source)
│   └── album-covers/                # Cover files named by Persistent ID with .jpeg extension
├── src/
│   ├── app/
│   │   ├── components/song-card/    # Song card + cover thumbnail rendering
│   │   ├── services/                # XML parser, song/list/theme/commit/source services
│   │   ├── models/song.ts
│   │   ├── app.ts
│   │   ├── app.html
│   │   └── app.scss
│   ├── shared/
│   │   ├── apple-music-plist.ts     # Shared XML parsing logic
│   │   └── album-cover.ts           # Shared album identity helpers
│   └── styles.scss
├── angular.json                     # Copies sources/album-covers to build assets
├── tsconfig.scripts.json            # Node typings for scripts
├── package.json
└── README.md
```

---

## Architecture Notes

- XML parsing is shared:
  - Browser: `XmlParserService` -> `parseAppleMusicPlistFromRoot`.
  - Node script: `@xmldom/xmldom` + same parser function.
- Multi-source support:
  - XML files live in `sources/songs/`, listed in `sources/songs/index.json`.
  - `SourceService` loads the manifest and manages the active source.
  - `ListService` scopes lists per source file via localStorage keys.
  - Active source is persisted as `?source=` query param.
  - The first tab shows a source selector dropdown when multiple sources exist.
- Collector source of truth is filesystem only:
  - For each song with `persistentId`, check `sources/album-covers/<persistentId>.jpeg`.
  - If missing, search Discogs and download cover to that exact path.
  - If Discogs has no cover, print `[missing] Artist - Album`.
- Song card cover URL is deterministic: `album-covers/${persistentId}.jpeg`.
- Service worker cache strategy:
  - App shell files are prefetched.
  - `sources/default.xml` is cached lazily.
  - `album-covers/**` is cached lazily for offline reuse.

---

## Build, Validate, Collect

```bash
npm ci
npx ng serve
npm run lint
npm run build
npm run validate
npm run collect
```

Collector env var:

```bash
DISCOGS_TOKEN=your_discogs_token
```

---

## Styling Conventions

- Use Material 3 system tokens (`--mat-sys-*`), avoid hardcoded colors.
- Keep search/sort controls minimal (no `mat-form-field` for those controls).
- Song cards should preserve compact mobile-first layout and virtual-scroll performance.

---

## Gotchas

- `cdk-virtual-scroll-viewport` needs fixed available height and stable `itemSize`.
- Discogs search can return results without `cover_image`; release details are used as fallback.
- Cover files are normalized as `<persistentId>.jpeg` and filesystem remains the only lookup source.
