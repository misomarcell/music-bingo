export interface Song {
  persistentId: string;
  name: string;
  artist: string;
  albumArtist: string;
  composer: string;
  album: string;
  genre: string;
  kind: string;
  size: number;
  totalTime: number;
  year: number;
  dateModified: string;
  dateAdded: string;
  bitRate: number;
  sampleRate: number;
  comments: string;
  playCount: number;
}

export type SortField = 'name' | 'year' | 'artist' | 'dateAdded' | 'totalTime';

export interface SongList {
  id: string;
  name: string;
  songPersistentIds: string[];
}
