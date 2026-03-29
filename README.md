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
- Album cover thumbnails loaded directly from `sources/album-covers/<trackId>.jpeg`

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

The app reads songs from `sources/default.xml` (Apple Music plist XML) as a static asset:
- Local dev (`ng serve`): reads local repo file.
- Deployed app (GitHub Pages): reads the same file from the GitHub Pages URL.

To update:
1. Export your Apple Music library.
2. Replace `sources/default.xml`.
3. Commit and push.

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
- For each song, checks if `sources/album-covers/<trackId>.jpeg` already exists
- If missing, searches Discogs for that song's album and downloads the image to `sources/album-covers/<trackId>.jpeg`
- Prints `[missing] Artist - Album` when a cover is missing both locally and on Discogs

## Deploy

Push to `main` to trigger GitHub Actions deployment to GitHub Pages (`.github/workflows/deploy.yml`).
