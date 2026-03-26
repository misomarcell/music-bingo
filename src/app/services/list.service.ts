import { Injectable, signal, computed } from '@angular/core';
import { SongList } from '../models/song';

const STORAGE_KEY = 'music-bingo-lists';
const ACTIVE_LIST_KEY = 'music-bingo-active-list';

@Injectable({ providedIn: 'root' })
export class ListService {
  readonly lists = signal<SongList[]>(this.loadLists());
  readonly activeListId = signal<string>(this.loadActiveListId());

  readonly activeList = computed(() => {
    const lists = this.lists();
    const id = this.activeListId();
    return lists.find((l) => l.id === id) || lists[0];
  });

  constructor() {
    if (this.lists().length === 0) {
      const defaultList: SongList = {
        id: this.generateId(),
        name: 'Default List',
        songTrackIds: [],
      };
      this.lists.set([defaultList]);
      this.activeListId.set(defaultList.id);
      this.save();
    }
    if (!this.activeList()) {
      this.activeListId.set(this.lists()[0].id);
      this.save();
    }
  }

  selectList(id: string): void {
    this.activeListId.set(id);
    localStorage.setItem(ACTIVE_LIST_KEY, id);
  }

  createList(name: string): void {
    const newList: SongList = { id: this.generateId(), name, songTrackIds: [] };
    this.lists.update((lists) => [...lists, newList]);
    this.activeListId.set(newList.id);
    this.save();
  }

  deleteList(id: string): boolean {
    if (this.lists().length <= 1) return false;
    this.lists.update((lists) => lists.filter((l) => l.id !== id));
    if (this.activeListId() === id) {
      this.activeListId.set(this.lists()[0].id);
    }
    this.save();
    return true;
  }

  renameList(id: string, name: string): void {
    this.lists.update((lists) => lists.map((l) => (l.id === id ? { ...l, name } : l)));
    this.save();
  }

  toggleSongInList(trackId: number, listId: string): void {
    this.lists.update((lists) =>
      lists.map((l) => {
        if (l.id !== listId) return l;
        const ids = l.songTrackIds.includes(trackId)
          ? l.songTrackIds.filter((id) => id !== trackId)
          : [...l.songTrackIds, trackId];
        return { ...l, songTrackIds: ids };
      }),
    );
    this.save();
  }

  getSongListIds(trackId: number): string[] {
    return this.lists()
      .filter((l) => l.songTrackIds.includes(trackId))
      .map((l) => l.id);
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lists()));
    localStorage.setItem(ACTIVE_LIST_KEY, this.activeListId());
  }

  private loadLists(): SongList[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private loadActiveListId(): string {
    return localStorage.getItem(ACTIVE_LIST_KEY) || '';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
}
