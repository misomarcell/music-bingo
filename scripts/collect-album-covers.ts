import 'dotenv/config';
import { constants as fsConstants } from 'fs';
import { access, copyFile, mkdir, readdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { Song } from '../src/app/models/song';
import { getAlbumIdentity, normalizeAlbumString } from '../src/shared/album-cover';
import { parseAppleMusicPlistFromRoot } from '../src/shared/apple-music-plist';

const DISCOGS_API_BASE_URL = 'https://api.discogs.com';
const DISCOGS_MIN_REQUEST_INTERVAL_MS = 1100;
const DISCOGS_MAX_RETRIES = 8;
const DISCOGS_RETRY_BACKOFF_BASE_MS = 2000;
const DISCOGS_SEARCH_PAGE_SIZE = 25;
const DISCOGS_MAX_CANDIDATES = 8;
const DISCOGS_USER_AGENT = 'music-bingo-collector/1.0 +https://github.com/misomarcell/music-bingo';

const XML_PATH = path.resolve(process.cwd(), 'sources/songs/default.xml');
const SONGS_DIR = path.resolve(process.cwd(), 'sources/songs');
const MANIFEST_PATH = path.resolve(SONGS_DIR, 'index.json');
const ALBUM_COVERS_DIR = path.resolve(process.cwd(), 'sources/album-covers');

interface SongCoverTask {
  persistentId: string;
  album: string;
  artist: string;
  year: number;
}

interface AlbumCandidate {
  album: string;
  artist: string;
  year: number;
}

interface DiscogsSearchResult {
  id: number;
  title: string;
  year?: string | number;
  cover_image?: string;
  resource_url?: string;
  community?: {
    have?: number;
    want?: number;
  };
}

interface DiscogsSearchResponse {
  results?: DiscogsSearchResult[];
}

interface DiscogsReleaseImage {
  type?: string;
  uri?: string;
}

interface DiscogsReleaseResponse {
  images?: DiscogsReleaseImage[];
}

interface ResolvedCover {
  releaseId: number;
  imageUrl: string;
}

type DiscogsRequestHeaders = Record<string, string>;

class DiscogsClient {
  private readonly headers: DiscogsRequestHeaders;
  private lastRequestAt = 0;
  private readonly releaseImageCache = new Map<number, string | null>();

  constructor(token: string) {
    this.headers = {
      Authorization: `Discogs token=${token}`,
      'User-Agent': DISCOGS_USER_AGENT,
    };
  }

  async findCover(candidate: AlbumCandidate): Promise<ResolvedCover | null> {
    const searchResults = await this.searchReleases(candidate);
    if (searchResults.length === 0) return null;

    const ranked = searchResults
      .map((result) => ({ result, score: this.scoreResult(candidate, result) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, DISCOGS_MAX_CANDIDATES)
      .map((item) => item.result);

    for (const result of ranked) {
      const coverFromSearch = cleanUrl(result.cover_image);
      if (coverFromSearch) {
        return { releaseId: result.id, imageUrl: coverFromSearch };
      }

      if (!result.resource_url) continue;

      const resolved = await this.getReleaseImage(result.id, result.resource_url);
      if (resolved) {
        return { releaseId: result.id, imageUrl: resolved };
      }
    }

    return null;
  }

  private scoreResult(album: AlbumCandidate, result: DiscogsSearchResult): number {
    const normalizedTitle = normalizeAlbumString(result.title || '');
    const normalizedAlbum = normalizeAlbumString(album.album);
    const normalizedArtist = normalizeAlbumString(album.artist);

    let score = 0;
    if (normalizedTitle.includes(normalizedAlbum)) {
      score += 10;
    }
    if (normalizedTitle.includes(normalizedArtist)) {
      score += 8;
    }

    if (album.year > 0 && Number(result.year) === album.year) {
      score += 2;
    }

    score += Math.min((result.community?.want ?? 0) / 500, 2);
    score += Math.min((result.community?.have ?? 0) / 500, 2);
    return score;
  }

  private async searchReleases(album: AlbumCandidate): Promise<DiscogsSearchResult[]> {
    const params = new URLSearchParams({
      artist: album.artist,
      release_title: album.album,
      type: 'release',
      per_page: String(DISCOGS_SEARCH_PAGE_SIZE),
    });

    const byFieldResponse = await this.fetchJson<DiscogsSearchResponse>(
      `${DISCOGS_API_BASE_URL}/database/search?${params.toString()}`,
    );
    const byFieldResults = byFieldResponse.results ?? [];
    if (byFieldResults.length > 0) return byFieldResults;

    const fallbackParams = new URLSearchParams({
      q: `${album.artist} ${album.album}`,
      type: 'release',
      per_page: String(DISCOGS_SEARCH_PAGE_SIZE),
    });
    const fallbackResponse = await this.fetchJson<DiscogsSearchResponse>(
      `${DISCOGS_API_BASE_URL}/database/search?${fallbackParams.toString()}`,
    );
    return fallbackResponse.results ?? [];
  }

  private async getReleaseImage(releaseId: number, resourceUrl: string): Promise<string | null> {
    if (this.releaseImageCache.has(releaseId)) {
      return this.releaseImageCache.get(releaseId) ?? null;
    }

    const release = await this.fetchJson<DiscogsReleaseResponse>(resourceUrl);
    const images = release.images ?? [];
    const primaryImage = images.find((image) => image.type === 'primary' && cleanUrl(image.uri));
    const fallbackImage = images.find((image) => cleanUrl(image.uri));
    const resolved = cleanUrl(primaryImage?.uri) ?? cleanUrl(fallbackImage?.uri) ?? null;

    this.releaseImageCache.set(releaseId, resolved);
    return resolved;
  }

  private async fetchJson<T>(url: string, attempt = 1): Promise<T> {
    await this.throttle();
    let response: Response;

    try {
      response = await fetch(url, { headers: this.headers });
    } catch (error) {
      if (attempt < DISCOGS_MAX_RETRIES) {
        await wait(this.getRetryDelayMs(null, attempt));
        return this.fetchJson<T>(url, attempt + 1);
      }
      throw error;
    }

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (shouldRetry && attempt < DISCOGS_MAX_RETRIES) {
      await wait(this.getRetryDelayMs(response, attempt));
      return this.fetchJson<T>(url, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discogs request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return (await response.json()) as T;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < DISCOGS_MIN_REQUEST_INTERVAL_MS) {
      await wait(DISCOGS_MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private getRetryDelayMs(response: Response | null, attempt: number): number {
    const retryAfter = Number(response?.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return retryAfter * 1000;
    }

    return DISCOGS_RETRY_BACKOFF_BASE_MS * attempt;
  }
}

function cleanUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('http')) return null;
  if (trimmed.includes('spacer.gif')) return null;
  return trimmed;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadSongsFromXml(): Promise<Song[]> {
  const xml = await readFile(XML_PATH, 'utf8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  return parseAppleMusicPlistFromRoot(doc.documentElement);
}

function buildSongTasks(songs: Song[]): SongCoverTask[] {
  const tasks: SongCoverTask[] = [];

  for (const song of songs) {
    if (!song.persistentId) continue;
    const identity = getAlbumIdentity(song);
    if (!identity) continue;

    tasks.push({
      persistentId: song.persistentId,
      album: identity.album,
      artist: identity.artist,
      year: identity.year,
    });
  }

  return tasks;
}

function getAlbumCacheKey(task: Pick<SongCoverTask, 'artist' | 'album' | 'year'>): string {
  const artist = normalizeAlbumString(task.artist);
  const album = normalizeAlbumString(task.album);
  return `${artist}::${album}::${task.year || 0}`;
}

async function downloadCoverImage(imageUrl: string, filePath: string): Promise<void> {
  for (let attempt = 1; attempt <= DISCOGS_MAX_RETRIES; attempt++) {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': DISCOGS_USER_AGENT,
      },
    });

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (shouldRetry && attempt < DISCOGS_MAX_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitTimeMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : DISCOGS_RETRY_BACKOFF_BASE_MS * attempt;
      await wait(waitTimeMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cover download failed (${response.status}): ${body.slice(0, 250)}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(filePath, bytes);
    return;
  }
}

async function collectMissingAlbumCovers(): Promise<void> {
  const token = process.env['DISCOGS_TOKEN']?.trim();
  if (!token) {
    throw new Error(
      'Missing DISCOGS_TOKEN. Add it to your .env file before running npm run collect.',
    );
  }

  await mkdir(ALBUM_COVERS_DIR, { recursive: true });

  const songs = await loadSongsFromXml();
  const tasks = buildSongTasks(songs);
  const discogs = new DiscogsClient(token);

  const albumResolutionCache = new Map<string, ResolvedCover | null>();
  const albumSourceFileByKey = new Map<string, string>();
  const loggedMissingAlbums = new Set<string>();

  let alreadyPresent = 0;
  let migratedLegacy = 0;
  let downloaded = 0;
  let copied = 0;
  let missingOnDiscogs = 0;
  let failed = 0;

  console.log(`Parsed ${songs.length} songs, ${tasks.length} songs with album metadata.`);

  for (const task of tasks) {
    const fileName = `${task.persistentId}.jpeg`;
    const targetPath = path.resolve(ALBUM_COVERS_DIR, fileName);
    const legacyPath = path.resolve(ALBUM_COVERS_DIR, task.persistentId);

    if (await fileExists(targetPath)) {
      alreadyPresent++;
      continue;
    }

    if (await fileExists(legacyPath)) {
      await rename(legacyPath, targetPath);
      migratedLegacy++;
      continue;
    }

    const albumKey = getAlbumCacheKey(task);
    const sourceCoverPath = albumSourceFileByKey.get(albumKey);
    if (sourceCoverPath && (await fileExists(sourceCoverPath))) {
      await copyFile(sourceCoverPath, targetPath);
      copied++;
      continue;
    }

    let resolvedCover = albumResolutionCache.get(albumKey);
    if (resolvedCover === undefined) {
      try {
        resolvedCover = await discogs.findCover({
          album: task.album,
          artist: task.artist,
          year: task.year,
        });
      } catch (error) {
        failed++;
        albumResolutionCache.set(albumKey, null);
        console.error(`[error] Discogs lookup failed for ${task.artist} - ${task.album}:`, error);
        continue;
      }
      albumResolutionCache.set(albumKey, resolvedCover ?? null);
    }

    if (!resolvedCover) {
      if (!loggedMissingAlbums.has(albumKey)) {
        console.log(`[missing] ${task.artist} - ${task.album}`);
        loggedMissingAlbums.add(albumKey);
        missingOnDiscogs++;
      }
      continue;
    }

    try {
      await downloadCoverImage(resolvedCover.imageUrl, targetPath);
      albumSourceFileByKey.set(albumKey, targetPath);
      downloaded++;
      console.log(`[downloaded] ${task.artist} - ${task.album} -> ${fileName}`);
    } catch (error) {
      failed++;
      console.error(
        `[error] ${task.artist} - ${task.album} (persistent ${task.persistentId}):`,
        error,
      );
    }
  }

  console.log('\nAlbum cover collection summary');
  console.log(`- Already present: ${alreadyPresent}`);
  console.log(`- Migrated legacy files: ${migratedLegacy}`);
  console.log(`- Downloaded: ${downloaded}`);
  console.log(`- Copied from cached album match: ${copied}`);
  console.log(`- Missing on Discogs: ${missingOnDiscogs}`);
  console.log(`- Failed downloads: ${failed}`);
}

collectMissingAlbumCovers()
  .then(() => updateManifest())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

interface ManifestEntry {
  file: string;
  label?: string;
}

async function updateManifest(): Promise<void> {
  let existing: ManifestEntry[] = [];
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      existing = parsed
        .filter(
          (e): e is ManifestEntry =>
            !!e &&
            typeof e === 'object' &&
            typeof (e as Record<string, unknown>)['file'] === 'string',
        )
        .map((e) => ({ file: e.file, ...(e.label ? { label: e.label } : {}) }));
    }
  } catch {
    // No existing manifest
  }

  const labelsByFile = new Map(existing.filter((e) => e.label).map((e) => [e.file, e.label]));
  const files = await readdir(SONGS_DIR);
  const xmlFiles = files.filter((f: string) => f.endsWith('.xml')).sort();
  const entries: ManifestEntry[] = xmlFiles.map((f) => {
    const label = labelsByFile.get(f);
    return label ? { file: f, label } : { file: f };
  });

  await writeFile(MANIFEST_PATH, JSON.stringify(entries, null, 2) + '\n');
  console.log(`\nUpdated manifest with ${entries.length} source(s): ${xmlFiles.join(', ')}`);
}
