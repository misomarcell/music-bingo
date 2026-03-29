import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Song, SongList } from '../../models/song';

function resolveAssetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

@Component({
  selector: 'app-song-card',
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: '0', opacity: 0, transform: 'translateY(-4px)' }),
        animate(
          '180ms cubic-bezier(0.2, 0, 0, 1)',
          style({ height: '*', opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '140ms cubic-bezier(0.4, 0, 1, 1)',
          style({ height: '0', opacity: 0, transform: 'translateY(-2px)' }),
        ),
      ]),
    ]),
  ],
  imports: [
    MatCardModule,
    MatDividerModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    DatePipe,
  ],
  templateUrl: './song-card.html',
  styleUrl: './song-card.scss',
})
export class SongCard {
  readonly song = input.required<Song>();
  readonly lists = input.required<SongList[]>();
  readonly songListIds = input<string[]>([]);
  readonly expanded = input(false);
  readonly listToggled = output<{ persistentId: string; listId: string }>();
  readonly expansionToggled = output<string>();
  readonly createListRequested = output<string>();
  readonly coverLoadFailed = signal(false);
  readonly albumCoverUrl = computed(() =>
    resolveAssetUrl(`album-covers/${this.song().persistentId}.jpeg`),
  );
  readonly albumCoverAlt = computed(() => {
    const song = this.song();
    if (song.album) {
      return `${song.album} cover art`;
    }
    return `${song.artist} cover art`;
  });

  constructor() {
    effect(() => {
      const persistentId = this.song().persistentId;
      void persistentId;
      this.coverLoadFailed.set(false);
    });
  }

  isInList(listId: string): boolean {
    return this.songListIds().includes(listId);
  }

  get inAnyList(): boolean {
    return this.songListIds().length > 0;
  }

  get listNames(): string {
    const ids = new Set(this.songListIds());
    return this.lists()
      .filter((l) => ids.has(l.id))
      .map((l) => l.name)
      .join(', ');
  }

  onListToggle(listId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.listToggled.emit({ persistentId: this.song().persistentId, listId });
  }

  onCreateList(): void {
    this.createListRequested.emit(this.song().persistentId);
  }

  onExpansionToggle(event: MouseEvent): void {
    event.stopPropagation();
    this.expansionToggled.emit(this.song().persistentId);
  }

  onCoverLoadError(): void {
    this.coverLoadFailed.set(true);
  }

  get searchQuery(): string {
    return encodeURIComponent(`${this.song().artist} ${this.song().name}`);
  }

  get youtubeSearchUrl(): string {
    return `https://music.youtube.com/search?q=${this.searchQuery}`;
  }

  get spotifySearchUrl(): string {
    return `https://open.spotify.com/search/${this.searchQuery}`;
  }

  formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }
}
