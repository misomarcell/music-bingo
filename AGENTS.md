# Music Bingo — AI Agent Context

## Overview

Music Bingo is a single-page Angular application that reads an Apple Music XML library export and displays songs as cards. Users can create named lists (bingo boards), assign songs to lists via a dropdown menu on each card, and manage lists with rename/delete. All list data is persisted in `localStorage`. The app is deployed to GitHub Pages via GitHub Actions.

**Live URL:** https://misomarcell.github.io/music-bingo/  
**Repository:** https://github.com/misomarcell/music-bingo

---

## Tech Stack

| Layer        | Technology                                                            |
| ------------ | --------------------------------------------------------------------- |
| Framework    | Angular 21.2.x (standalone components, no NgModules)                  |
| UI Library   | Angular Material 21.2.4 (Material 3 / M3 design system)               |
| Styling      | SCSS with Material CSS custom properties (`--mat-sys-*`)              |
| Reactivity   | Angular Signals (`signal()`, `computed()`, `input()`, `output()`)     |
| Control Flow | Modern template syntax (`@if`, `@for`, `@empty`, `*cdkVirtualFor`)    |
| Data Source  | Apple Music plist XML parsed client-side via `DOMParser`              |
| Persistence  | `localStorage` for lists; URL query params (`?list=<id>`) for sharing |
| Sharing      | `lz-string` compression for URL-encoded list sharing (`?shared=`)     |
| Performance  | CDK virtual scrolling — only visible song cards are rendered in DOM   |
| Deployment   | GitHub Actions → GitHub Pages (auto-deploy on push to `main`)         |
| Package Mgr  | npm 11.7.x, Node 20                                                   |
| TypeScript   | 5.9.x                                                                 |

---

## Project Structure

```
music-bingo/
├── .github/workflows/deploy.yml   # CI/CD: build + deploy to GitHub Pages
├── sources/default.xml             # Apple Music library XML export (data source)
├── src/
│   ├── app/
│   │   ├── models/
│   │   │   └── song.ts             # Song, SortField, SongList interfaces
│   │   ├── services/
│   │   │   ├── xml-parser.service.ts   # Fetches & parses Apple Music plist XML
│   │   │   ├── song.service.ts         # Song state, sorting, search filtering
│   │   │   ├── list.service.ts         # List CRUD, song-list membership, localStorage
│   │   │   └── commit-info.service.ts  # Fetches latest commit info from GitHub API
│   │   ├── components/
│   │   │   ├── song-card/
│   │   │   │   ├── song-card.ts        # Song card component
│   │   │   │   ├── song-card.html      # Card template with mat-menu list dropdown
│   │   │   │   └── song-card.scss      # Card styles
│   │   │   ├── list-name-dialog.ts     # Unified dialog for creating & renaming lists
│   │   │   ├── confirm-dialog.ts       # Confirmation dialog for deleting lists
│   │   │   └── share-dialog.ts         # Dialog showing share URL with copy button
│   │   ├── app.ts                  # Root component: tabs, sorting, search, list management
│   │   ├── app.html                # Main template: sticky controls, search, tabs, virtual song grid
│   │   ├── app.scss                # Main styles (sticky controls, virtual scroll viewport)
│   │   └── app.config.ts           # App bootstrapping config
│   ├── styles.scss                 # Global styles, Material theme
│   └── index.html
├── angular.json                    # Angular workspace config (baseHref: /music-bingo/)
├── package.json
└── README.md
```

---

## Architecture & Data Flow

### Data Source

The app fetches `sources/default.xml` (an Apple Music library export in plist XML format) from the GitHub raw URL at startup. `XmlParserService` parses the XML using the browser's `DOMParser` and extracts track dictionaries into `Song` objects.

### State Management (Signals)

All state is managed via Angular Signals — no RxJS `BehaviorSubject` or NgRx:

- **`SongService`**: Holds `songs` signal (all parsed songs), `searchQuery` signal, `sortField`/`sortAscending` signals (default: `dateAdded` descending). Exposes `filteredSongs` and `sortedSongs` as `computed()` signals.
- **`ListService`**: Holds `lists` signal (array of `SongList`), `activeListId` signal. Provides CRUD methods (`createList`, `deleteList`, `renameList`, `toggleSongInList`). Persists to `localStorage` on every mutation.
- **`CommitInfoService`**: Fetches latest commit from GitHub API, exposes `commitHash`, `commitDate`, `commitUrl` signals.

### Component Architecture

All components are **standalone** (no shared modules):

- **`AppComponent`** (root): Orchestrates everything — sticky controls panel (search bar, sort controls, stats/commit info), tab group (All Songs + user lists), list header with rename/delete, and the song card grid rendered via CDK virtual scrolling.
- **`SongCardComponent`**: Displays a single song as a Material card. Has a `mat-menu` dropdown to toggle the song's membership in each list. Shows colored left border and list badge(s) when assigned.
- **`ListNameDialog`**: Reusable dialog for both creating and renaming lists. Accepts `title`, `label`, `confirmText`, and optional `name` via `MAT_DIALOG_DATA`.
- **`ConfirmDialog`**: Simple yes/no dialog used for delete confirmation.

---

## Key Interfaces

```typescript
interface Song {
  trackId: number;
  name: string;
  artist: string;
  albumArtist: string;
  composer: string;
  album: string;
  genre: string;
  kind: string;
  size: number;
  totalTime: number; // milliseconds
  year: number;
  dateModified: string;
  dateAdded: string;
  bitRate: number;
  sampleRate: number;
  comments: string;
  playCount: number;
}

type SortField = 'name' | 'year' | 'artist' | 'dateAdded' | 'bitRate' | 'totalTime';

interface SongList {
  id: string; // crypto.randomUUID()
  name: string;
  songTrackIds: number[];
}
```

---

## Styling Conventions

- **Material 3 CSS variables**: Use `var(--mat-sys-primary)`, `var(--mat-sys-surface)`, `var(--mat-sys-on-surface)`, etc. for theming. Never hardcode color values.
- **`color-mix()`**: Used for tinting/shading (e.g., sticky controls background, card highlight).
- **No toolbar** — the app uses a sticky controls panel instead of `mat-toolbar`. Song count and commit info are displayed as small text within the sticky panel.
- **No `mat-form-field`** for the search bar or sort dropdown — they use plain HTML with border styling to keep it minimal.
- **Pill/chip style** for tab song counts (`.tab-count-chip`).
- **SCSS only** — no CSS or Tailwind.

---

## Build & Run

```bash
# Install dependencies
npm ci

# Development server (http://localhost:4200)
npx ng serve

# Production build (output: dist/music-bingo/browser/)
npx ng build --configuration production

# Deploy: push to main → GitHub Actions auto-deploys to Pages
```

### Build Config Notes

- `baseHref` is set to `"/music-bingo/"` in the production configuration (angular.json).
- Budget thresholds: 1 MB warning, 2 MB error (initial bundle is ~680 KB).
- A `404.html` copy of `index.html` is created during CI for SPA routing on GitHub Pages.

---

## URL & Query Params

- `?list=<listId>` — deep-links to a specific list tab on load (restored via `restoreTabFromUrl()`).
- `?shared=<compressed>` — imports a shared list. The payload is a JSON object `{name, songTrackIds}` compressed with `lz-string`'s `compressToEncodedURIComponent`. On load, the app displays the shared songs with a banner offering to save the list to localStorage.
- The active list ID is synced to the URL on tab change via `updateUrl()`.

---

## localStorage Schema

**Key:** `music-bingo-lists`  
**Value:** JSON array of `SongList` objects:

```json
[
  {
    "id": "uuid-string",
    "name": "My Bingo Board",
    "songTrackIds": [1234, 5678, 9012]
  }
]
```

---

## Changing the Data Source

To use a different Apple Music XML export:

1. Replace `sources/default.xml` with your own Apple Music library XML export.
2. The file must be in Apple's plist XML format (exported via File → Library → Export Library in Apple Music).
3. Push to `main` — the app fetches the raw file from GitHub at runtime.

Alternatively, update the `GITHUB_RAW_URL` constant in `app.ts` to point to any publicly accessible plist XML URL.

---

## Common Development Tasks

### Adding a new sort field

1. Add the field name to the `SortField` type in `models/song.ts`.
2. Add a sort option entry to `SORT_OPTIONS` in `app.ts`.
3. The `SongService.sortedSongs` computed signal handles sorting automatically based on field type.

### Adding a new song property to display

1. Add the property to the `Song` interface in `models/song.ts`.
2. Update `parseTrackDict()` in `xml-parser.service.ts` to extract it from the XML.
3. Display it in `song-card.html`.

### Adding a new dialog

1. Create a standalone component with `MatDialogModule` imports.
2. Inject `MAT_DIALOG_DATA` and `MatDialogRef`.
3. Open it via `MatDialog.open()` from the calling component.

---

## Gotchas & Lessons Learned

- **Signal reactivity**: Use `signal()` for mutable state, `computed()` for derived state. Plain variables won't trigger re-renders.
- **Angular CLI prompts**: Always pass `--defaults` when running `ng new` or schematics in automated contexts to avoid interactive prompts.
- **`mat-form-field` label clipping**: Use `subscriptSizing="dynamic"` on `<mat-form-field>` to prevent floating labels from being cut off.
- **Tab click interception**: Buttons placed inside `mat-tab` labels need to stop event propagation or be placed outside the tab group to work properly.
- **GitHub Pages SPA routing**: Requires a `404.html` that mirrors `index.html` for client-side routing to work.
- **Angular Material 21 (M3)**: Uses `--mat-sys-*` CSS variables, not the old `--mat-*` tokens from M2.
- **CDK virtual scrolling**: The `cdk-virtual-scroll-viewport` requires a fixed height on the container (`height: calc(100vh - 160px)`) and an `itemSize` estimate in pixels. Uses `*cdkVirtualFor` (structural directive) instead of `@for` control flow.
