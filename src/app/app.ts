import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SongService } from './services/song.service';
import { ListService } from './services/list.service';
import { SongCard } from './components/song-card/song-card';
import { SortField } from './models/song';
import { NewListDialog } from './components/new-list-dialog';
import { ConfirmDialog } from './components/confirm-dialog';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/misomarcell/music-bingo/main/example.xml';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'year', label: 'Year' },
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'bitRate', label: 'Bit Rate' },
  { value: 'totalTime', label: 'Length' },
];

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatToolbarModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule,
    SongCard,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly sortOptions = SORT_OPTIONS;

  readonly selectedTabIndex = signal(0);

  readonly displayedSongs = computed(() => {
    if (this.selectedTabIndex() === 0) {
      return this.songService.sortedSongs();
    }
    const list = this.listService.activeList();
    if (!list) return [];
    return this.songService.getSongsByTrackIds(list.songTrackIds);
  });

  constructor(
    readonly songService: SongService,
    readonly listService: ListService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.songService.loadSongs(GITHUB_RAW_URL);
    const lists = this.listService.lists();
    const activeId = this.listService.activeListId();
    const idx = lists.findIndex((l) => l.id === activeId);
    this.selectedTabIndex.set(idx >= 0 ? idx + 1 : 0);
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    if (index > 0) {
      const lists = this.listService.lists();
      if (lists[index - 1]) {
        this.listService.selectList(lists[index - 1].id);
      }
    }
  }

  onSongToggle(trackId: number): void {
    this.listService.toggleSong(trackId);
  }

  isSongChecked(trackId: number): boolean {
    return this.listService.isSongChecked(trackId);
  }

  addList(): void {
    const dialogRef = this.dialog.open(NewListDialog, { width: '320px' });
    dialogRef.afterClosed().subscribe((name: string) => {
      if (name?.trim()) {
        this.listService.createList(name.trim());
        this.selectedTabIndex.set(this.listService.lists().length);
      }
    });
  }

  deleteList(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.listService.lists().length <= 1) return;

    const list = this.listService.lists().find((l) => l.id === id);
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '320px',
      data: { message: `Delete list "${list?.name}"?` },
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.listService.deleteList(id);
        this.selectedTabIndex.set(1);
      }
    });
  }

  onSortChange(field: SortField): void {
    this.songService.setSort(field);
  }

  get sortDirection(): string {
    return this.songService.sortAscending() ? 'asc' : 'desc';
  }
}
