# Music Bingo

A web app for organizing songs from an Apple Music library export into custom bingo lists.

Live: https://misomarcell.github.io/music-bingo/

## Features

- Song cards with metadata, list assignment menu, and expandable details
- Multiple lists with create/rename/delete
- Search + sort + sticky controls
- Virtual scrolling for large libraries
- URL sharing for both active lists and compressed shared-list payloads
- Local persistence via `localStorage`
- Album cover thumbnails loaded directly from `sources/album-covers/<persistentId>.jpeg`
- PWA + service worker support for offline shell usage and cached album covers

## Development

```bash
npm ci
npx ng serve
```

Quality gates:

```bash
npm run lint
npm run build
```

## Data Source

The app reads songs from XML files in `sources/songs/` (Apple Music plist XML) as static assets.
A manifest file `sources/songs/index.json` lists available XML sources.
The active source is persisted as a `?source=` query parameter (defaults to `default.xml`).
User-created lists are scoped per source.

To update:

1. Export your Apple Music library.
2. Add or replace XML files in `sources/songs/`.
3. Run `npm run collect` to update the manifest and download album covers.
4. Commit and push.

## Collecting Album Covers

Use the Discogs collector script to download missing album covers into `sources/album-covers`.

1. Create a `.env` file in repo root:

```bash
DISCOGS_TOKEN=your_discogs_user_token
```

2. Run:

```bash
npm run collect
```

What it does:

- Parses `sources/default.xml` with the same shared parser logic used by the app
- For each song, checks if `sources/album-covers/<persistentId>.jpeg` already exists
- If missing, searches Discogs for that song's album and downloads the image to `sources/album-covers/<persistentId>.jpeg`
- Prints `[missing] Artist - Album` when a cover is missing both locally and on Discogs

## Deploy

Push to `main` to trigger GitHub Actions deployment to GitHub Pages (`.github/workflows/deploy.yml`).

## PWA / Offline Caching

Production builds include Angular Service Worker (`ngsw`) with:

- App-shell prefetch caching (`index`, JS/CSS bundles, manifest, icons)
- Lazy caching for `sources/default.xml`
- Lazy caching for `album-covers/**` so viewed covers are available offline
- Runtime caching for Google Fonts and commit metadata API requests

When a new app version is available, the app prompts to reload so users can activate the update.
