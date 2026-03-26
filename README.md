# 🎵 Music Bingo

A web app for tracking songs from your Apple Music library. Check off songs, organize them into custom lists, sort, search, and share lists via URL.

**Live:** [https://misomarcell.github.io/music-bingo/](https://misomarcell.github.io/music-bingo/)

## How It Works

The app reads songs from `example.xml` (an Apple Music library export in plist format) hosted in this repository. Songs are displayed as cards with checkboxes — check a song to add it to your currently active list. All lists and checked songs are saved in your browser's localStorage.

## Updating the Song List

1. In Apple Music, go to **File → Library → Export Library…**
2. Save the file as `example.xml`
3. Replace the `example.xml` file in the root of this repository
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
