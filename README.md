# 🎵 Music Bingo

A web app for organizing songs from your Apple Music library into custom bingo lists. Add songs to multiple lists via a dropdown menu on each card, sort, search, rename and delete lists, and share them via URL.

**Live:** [https://misomarcell.github.io/music-bingo/](https://misomarcell.github.io/music-bingo/)

## Features

- **Song cards** with title, artist, album, genre, year, duration, and more
- **Per-song list dropdown** — add/remove a song from any list directly from its card
- **Multiple lists** — create, rename, and delete custom lists via tabs
- **List header** — shows list name, song count, rename and delete actions when a list tab is selected
- **Search** — filter songs by title, artist, or album
- **Sort** — by title, artist, year, date added, bit rate, or length (ascending/descending; default: date added, newest first)
- **Sticky controls** — search and sort stay pinned at the top while scrolling
- **Virtual scrolling** — only visible song cards are rendered for smooth performance with large libraries
- **URL sharing** — append `?list=<id>` to link directly to a specific list, or share a compressed list via `?shared=` URL
- **List sharing** — share any list as a compressed URL; recipients can preview the shared songs and save the list to their own localStorage
- **Persistent state** — all lists and song assignments are saved in localStorage
- **Commit info** — last deploy commit hash (linked to GitHub) and date shown in the controls panel
- **Auto-deploy** — pushes to `main` trigger GitHub Actions deployment to GitHub Pages

## How It Works

The app reads songs from `sources/default.xml` (an Apple Music library export in plist format) hosted in this repository. Songs are displayed as cards — use the playlist icon on each card to add it to one or more lists.

## Updating the Song List

1. In Apple Music, go to **File → Library → Export Library…**
2. Save the file as `default.xml`
3. Replace `sources/default.xml` in this repository
4. Commit and push — the site will redeploy automatically via GitHub Actions

> **Note:** The XML file is an Apple Music plist export. Only the `<dict>` entries under the `Tracks` key are used. Each track should have at minimum a `Name` field.

## Development

```bash
npm install
ng serve
```

## Deploying

The app auto-deploys to GitHub Pages on every push to `main` via the workflow in `.github/workflows/deploy.yml`.

To deploy manually:

```bash
ng build --configuration production
# Output is in dist/music-bingo/browser/
```
