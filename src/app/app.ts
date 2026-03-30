import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SongService } from './services/song.service';
import { ListService } from './services/list.service';
import { CommitInfoService } from './services/commit-info.service';
import { ThemeService } from './services/theme.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { SongCard } from './components/song-card/song-card';
import { Song, SongList, SortField } from './models/song';
import { ListNameDialog } from './components/list-name-dialog/list-name-dialog';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { ShareDialog } from './components/share-dialog/share-dialog';

const DEFAULT_XML_PATH = 'sources/default.xml';

function resolveAssetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'year', label: 'Year' },
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'totalTime', label: 'Length' },
];

function normalizePersistentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toUpperCase();
    if (normalized) {
      ids.add(normalized);
    }
  }
  return [...ids];
}

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    ScrollingModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    SongCard,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  @ViewChild(CdkVirtualScrollViewport) private viewport?: CdkVirtualScrollViewport;

  readonly songRowHeight = 96;
  readonly sortOptions = SORT_OPTIONS;
  readonly songService = inject(SongService);
  readonly listService = inject(ListService);
  readonly commitInfo = inject(CommitInfoService);
  readonly themeService = inject(ThemeService);
  private readonly pwaUpdate = inject(PwaUpdateService);
  private readonly dialog = inject(MatDialog);

  readonly selectedTabIndex = signal(0);
  readonly expandedSongPersistentId = signal<string | null>(null);
  private readonly scrollOffsetsByTab = new Map<string, number>();

  readonly importedList = signal<SongList | null>(null);

  readonly displayedSongs = computed(() => {
    const imported = this.importedList();
    if (imported && this.selectedTabIndex() === this.listService.lists().length + 1) {
      return this.songService.getSongsByPersistentIds(imported.songPersistentIds);
    }
    if (this.selectedTabIndex() === 0) {
      return this.songService.sortedSongs();
    }
    const list = this.listService.activeList();
    if (!list) return [];
    return this.songService.getSongsByPersistentIds(list.songPersistentIds);
  });

  ngOnInit(): void {
    this.songService.loadSongs(resolveAssetUrl(DEFAULT_XML_PATH));
    this.pwaUpdate.start();
    this.restoreTabFromUrl();
  }

  private restoreTabFromUrl(): void {
    const params = new URLSearchParams(window.location.search);

    const shared = params.get('shared');
    if (shared) {
      try {
        const json = decompressFromEncodedURIComponent(shared);
        if (json) {
          const parsed = JSON.parse(json);
          const importedName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
          const importedIds = normalizePersistentIds(parsed.songPersistentIds);
          if (importedName && importedIds.length > 0) {
            this.importedList.set({
              id: 'imported',
              name: importedName,
              songPersistentIds: importedIds,
            });
            this.selectedTabIndex.set(this.listService.lists().length + 1);
            return;
          }
        }
      } catch {
        // Invalid shared data — ignore
      }
    }

    const listId = params.get('list');
    if (listId) {
      const lists = this.listService.lists();
      const idx = lists.findIndex((l) => l.id === listId);
      if (idx >= 0) {
        this.listService.selectList(listId);
        this.selectedTabIndex.set(idx + 1);
        return;
      }
      // List not found — remove invalid query param
      this.updateUrl(null);
    }
    // Default: All Songs tab
    this.selectedTabIndex.set(0);
  }

  private updateUrl(listId: string | null): void {
    const url = new URL(window.location.href);
    if (listId) {
      url.searchParams.set('list', listId);
    } else {
      url.searchParams.delete('list');
    }
    window.history.replaceState({}, '', url.toString());
  }

  onTabChange(index: number): void {
    this.saveScrollOffsetForCurrentTab();
    this.expandedSongPersistentId.set(null);
    const imported = this.importedList();
    const importedTabIndex = imported ? this.listService.lists().length + 1 : -1;

    if (imported && index !== importedTabIndex) {
      this.importedList.set(null);
      this.clearSharedParam();
    }

    this.selectedTabIndex.set(index);

    if (index === importedTabIndex) {
      this.updateUrl(null);
      this.restoreScrollOffsetForCurrentTab();
      return;
    }

    if (index > 0) {
      const lists = this.listService.lists();
      const list = lists[index - 1];
      if (list) {
        this.listService.selectList(list.id);
        this.updateUrl(list.id);
      }
    } else {
      this.updateUrl(null);
    }

    this.restoreScrollOffsetForCurrentTab();
  }

  onListToggle(event: { persistentId: string; listId: string }): void {
    this.listService.toggleSongInList(event.persistentId, event.listId);
  }

  isSongExpanded(persistentId: string): boolean {
    return this.expandedSongPersistentId() === persistentId;
  }

  onSongExpansionToggle(persistentId: string): void {
    this.expandedSongPersistentId.update((current) => (current === persistentId ? null : persistentId));
  }

  trackBySong(_index: number, song: Song): string {
    return song.persistentId;
  }

  addList(persistentId?: string): void {
    const dialogRef = this.dialog.open(ListNameDialog, {
      width: '320px',
      data: { title: 'New List', label: 'List name', confirmText: 'Create' },
    });
    dialogRef.afterClosed().subscribe((name: string) => {
      if (name?.trim()) {
        this.listService.createList(name.trim());
        const newList = this.listService.lists()[this.listService.lists().length - 1];
        if (persistentId !== undefined) {
          this.listService.toggleSongInList(persistentId, newList.id);
        }
        this.selectedTabIndex.set(this.listService.lists().length);
        this.updateUrl(newList.id);
      }
    });
  }

  addListWithSong(persistentId: string): void {
    this.addList(persistentId);
  }

  deleteList(id: string): void {
    if (this.listService.lists().length <= 1) return;

    const list = this.listService.lists().find((l) => l.id === id);
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '320px',
      data: { message: `Delete list "${list?.name}"?` },
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.listService.deleteList(id);
        this.selectedTabIndex.set(0);
        this.updateUrl(null);
      }
    });
  }

  renameList(id: string): void {
    const list = this.listService.lists().find((l) => l.id === id);
    if (!list) return;
    const dialogRef = this.dialog.open(ListNameDialog, {
      width: '320px',
      data: { title: 'Rename List', label: 'List name', confirmText: 'Rename', name: list.name },
    });
    dialogRef.afterClosed().subscribe((newName: string) => {
      if (newName?.trim()) {
        this.listService.renameList(id, newName.trim());
      }
    });
  }

  shareList(list: SongList): void {
    const payload = JSON.stringify({ name: list.name, songPersistentIds: list.songPersistentIds });
    const compressed = compressToEncodedURIComponent(payload);
    const url = new URL(window.location.href);
    url.searchParams.delete('list');
    url.searchParams.set('shared', compressed);
    this.dialog.open(ShareDialog, {
      width: '480px',
      data: { url: url.toString() },
    });
  }

  saveImportedList(): void {
    const imported = this.importedList();
    if (!imported) return;
    const existingNames = new Set(this.listService.lists().map((l) => l.name));
    let name = imported.name;
    let suffix = 1;
    while (existingNames.has(name)) {
      suffix++;
      name = `${imported.name}_${suffix}`;
    }
    this.listService.createList(name);
    const newList = this.listService.lists()[this.listService.lists().length - 1];
    for (const persistentId of imported.songPersistentIds) {
      this.listService.toggleSongInList(persistentId, newList.id);
    }
    this.importedList.set(null);
    this.clearSharedParam();
    const newIdx = this.listService.lists().length;
    this.selectedTabIndex.set(newIdx);
    this.updateUrl(newList.id);
  }

  dismissImportedList(): void {
    this.importedList.set(null);
    this.clearSharedParam();
    this.selectedTabIndex.set(0);
    this.updateUrl(null);
  }

  private clearSharedParam(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('shared');
    window.history.replaceState({}, '', url.toString());
  }

  private getCurrentTabScrollKey(): string {
    const selectedIndex = this.selectedTabIndex();
    if (selectedIndex === 0) {
      return 'tab:all';
    }

    const imported = this.importedList();
    const importedTabIndex = imported ? this.listService.lists().length + 1 : -1;
    if (selectedIndex === importedTabIndex) {
      return 'tab:imported';
    }

    const selectedList = this.listService.lists()[selectedIndex - 1];
    if (selectedList) {
      return `tab:list:${selectedList.id}`;
    }

    return `tab:${selectedIndex}`;
  }

  private saveScrollOffsetForCurrentTab(): void {
    const viewport = this.viewport;
    if (!viewport) return;

    this.scrollOffsetsByTab.set(this.getCurrentTabScrollKey(), viewport.measureScrollOffset('top'));
  }

  private restoreScrollOffsetForCurrentTab(): void {
    const viewport = this.viewport;
    if (!viewport) return;

    const offset = this.scrollOffsetsByTab.get(this.getCurrentTabScrollKey()) ?? 0;
    requestAnimationFrame(() => {
      viewport.scrollToOffset(offset);
    });
  }

  onSortChange(field: SortField): void {
    this.songService.setSort(field);
  }

  onSearchChange(query: string): void {
    this.songService.searchQuery.set(query);
  }

  cycleThemePreference(): void {
    this.themeService.cyclePreference();
  }

  get themePreferenceIcon(): string {
    const preference = this.themeService.preference();
    if (preference === 'system') {
      return this.themeService.mode() === 'dark' ? 'light_mode' : 'dark_mode';
    }
    if (preference === 'light') return 'light_mode';
    return 'dark_mode';
  }

  get themePreferenceTooltip(): string {
    const preference = this.themeService.preference();
    if (preference === 'system') {
      const target = this.themeService.mode() === 'dark' ? 'Light' : 'Dark';
      return `Theme: System (${this.themeService.mode()}). Click to switch to ${target}.`;
    }
    if (preference === 'dark') {
      return 'Theme: Dark. Click to switch to Light.';
    }
    return 'Theme: Light. Click to follow System.';
  }

  get sortDirection(): string {
    return this.songService.sortAscending() ? 'asc' : 'desc';
  }
}
