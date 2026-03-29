import { computed, inject, Injectable, signal } from '@angular/core';
import { Song, SortField } from '../models/song';
import { XmlParserService } from './xml-parser.service';

@Injectable({ providedIn: 'root' })
export class SongService {
  private readonly xmlParser = inject(XmlParserService);

  readonly songs = signal<Song[]>([]);
  readonly sortField = signal<SortField>('dateAdded');
  readonly sortAscending = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');

  readonly totalSongs = computed(() => this.songs().length);

  readonly filteredSongs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.songs();
    return this.songs().filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.composer.toLowerCase().includes(query) ||
        s.album.toLowerCase().includes(query),
    );
  });

  readonly sortedSongs = computed(() => {
    const songs = [...this.filteredSongs()];
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
        case 'totalTime':
          cmp = a.totalTime - b.totalTime;
          break;
      }
      return asc ? cmp : -cmp;
    });

    return songs;
  });

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
    }
  }

  getSongsByPersistentIds(persistentIds: string[]): Song[] {
    const idSet = new Set(persistentIds);
    return this.sortedSongs().filter((s) => idSet.has(s.persistentId));
  }
}
