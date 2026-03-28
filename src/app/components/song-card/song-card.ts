import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Song, SongList } from '../../models/song';

@Component({
  selector: 'app-song-card',
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
  readonly listToggled = output<{ trackId: number; listId: string }>();
  readonly createListRequested = output<number>();

  expanded = false;

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
    this.listToggled.emit({ trackId: this.song().trackId, listId });
  }

  onCreateList(): void {
    this.createListRequested.emit(this.song().trackId);
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
