import { Injectable, signal, computed } from '@angular/core';
import { Song, SortField } from '../models/song';
import { XmlParserService } from './xml-parser.service';

@Injectable({ providedIn: 'root' })
export class SongService {
  readonly songs = signal<Song[]>([]);
  readonly sortField = signal<SortField>('name');
  readonly sortAscending = signal<boolean>(true);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');

  readonly totalSongs = computed(() => this.songs().length);

  readonly sortedSongs = computed(() => {
    const songs = [...this.songs()];
    const field = this.sortField();
    const asc = this.sortAscending();

    songs.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'artist':
          cmp = a.artist.localeCompare(b.artist);
          break;
        case 'year':
          cmp = a.year - b.year;
          break;
        case 'dateAdded':
          cmp = a.dateAdded.localeCompare(b.dateAdded);
          break;
        case 'bitRate':
          cmp = a.bitRate - b.bitRate;
          break;
        case 'totalTime':
          cmp = a.totalTime - b.totalTime;
          break;
      }
      return asc ? cmp : -cmp;
    });

    return songs;
  });

  constructor(private xmlParser: XmlParserService) {}

  async loadSongs(url: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const songs = await this.xmlParser.fetchAndParse(url);
      this.songs.set(songs);
    } catch (e) {
      this.error.set('Failed to load songs. Please try again.');
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAscending.update((v) => !v);
    } else {
      this.sortField.set(field);
      this.sortAscending.set(true);
    }
  }

  getSongsByTrackIds(trackIds: number[]): Song[] {
    const idSet = new Set(trackIds);
    return this.sortedSongs().filter((s) => idSet.has(s.trackId));
  }
}
