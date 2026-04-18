import { Injectable, signal, computed } from '@angular/core';
import { SongList } from '../models/song';

const STORAGE_PREFIX = 'music-bingo-lists';
const ACTIVE_LIST_PREFIX = 'music-bingo-active-list';

@Injectable({ providedIn: 'root' })
export class ListService {
  private currentSource = 'default.xml';
  readonly lists = signal<SongList[]>([]);
  readonly activeListId = signal<string>('');

  readonly activeList = computed(() => {
    const lists = this.lists();
    const id = this.activeListId();
    return lists.find((l) => l.id === id) || lists[0];
  });

  switchSource(source: string): void {
    this.currentSource = source;
    this.migrateOldStorage();
    this.lists.set(this.loadLists());
    this.activeListId.set(this.loadActiveListId());
    this.ensureDefaultList();
  }

  private migrateOldStorage(): void {
    if (this.currentSource !== 'default.xml') return;
    const oldKey = 'music-bingo-lists';
    const oldActiveKey = 'music-bingo-active-list';
    const newKey = this.storageKey();
    if (localStorage.getItem(newKey)) return;
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      localStorage.setItem(newKey, oldData);
      const oldActive = localStorage.getItem(oldActiveKey);
      if (oldActive) {
        localStorage.setItem(this.activeListStorageKey(), oldActive);
      }
      localStorage.removeItem(oldKey);
      localStorage.removeItem(oldActiveKey);
    }
  }

  private ensureDefaultList(): void {
    if (this.lists().length === 0) {
      const defaultList: SongList = {
        id: this.generateId(),
        name: 'Default List',
        songPersistentIds: [],
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
    localStorage.setItem(this.activeListStorageKey(), id);
  }

  private storageKey(): string {
    return `${STORAGE_PREFIX}:${this.currentSource}`;
  }

  private activeListStorageKey(): string {
    return `${ACTIVE_LIST_PREFIX}:${this.currentSource}`;
  }

  createList(name: string): void {
    const newList: SongList = { id: this.generateId(), name, songPersistentIds: [] };
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

  toggleSongInList(persistentId: string, listId: string): void {
    const normalizedId = this.normalizePersistentId(persistentId);
    if (!normalizedId) return;

    this.lists.update((lists) =>
      lists.map((l) => {
        if (l.id !== listId) return l;
        const ids = l.songPersistentIds.includes(normalizedId)
          ? l.songPersistentIds.filter((id) => id !== normalizedId)
          : [...l.songPersistentIds, normalizedId];
        return { ...l, songPersistentIds: ids };
      }),
    );
    this.save();
  }

  getSongListIds(persistentId: string): string[] {
    const normalizedId = this.normalizePersistentId(persistentId);
    if (!normalizedId) return [];

    return this.lists()
      .filter((l) => l.songPersistentIds.includes(normalizedId))
      .map((l) => l.id);
  }

  private save(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.lists()));
    localStorage.setItem(this.activeListStorageKey(), this.activeListId());
  }

  private loadLists(): SongList[] {
    const data = localStorage.getItem(this.storageKey());
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => this.parseStoredList(item))
        .filter((item): item is SongList => Boolean(item));
    } catch {
      return [];
    }
  }

  private loadActiveListId(): string {
    return localStorage.getItem(this.activeListStorageKey()) || '';
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  private parseStoredList(value: unknown): SongList | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;

    const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const name = typeof record['name'] === 'string' ? record['name'].trim() : '';
    const songPersistentIds = this.parseStoredPersistentIds(record['songPersistentIds']);

    if (!id || !name) return null;
    return { id, name, songPersistentIds };
  }

  private parseStoredPersistentIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    const unique = new Set<string>();
    for (const item of value) {
      const normalized = this.normalizePersistentId(item);
      if (normalized) {
        unique.add(normalized);
      }
    }
    return [...unique];
  }

  private normalizePersistentId(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase();
  }
}
