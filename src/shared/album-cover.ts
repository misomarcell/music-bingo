import { Song } from '../app/models/song';

export interface AlbumIdentity {
  album: string;
  artist: string;
  year: number;
}

type AlbumIdentitySource = Pick<Song, 'album' | 'albumArtist' | 'artist' | 'year'>;

function normalizeForMatching(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getAlbumIdentity(source: AlbumIdentitySource): AlbumIdentity | null {
  const album = source.album.trim();
  if (!album) return null;

  const artist = (source.albumArtist || source.artist || 'Unknown').trim();
  if (!artist) return null;

  return {
    album,
    artist,
    year: source.year,
  };
}

export function normalizeAlbumString(value: string): string {
  return normalizeForMatching(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
