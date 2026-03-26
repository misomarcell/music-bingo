import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Song } from '../../models/song';

@Component({
  selector: 'app-song-card',
  imports: [MatCardModule, MatCheckboxModule, DatePipe],
  templateUrl: './song-card.html',
  styleUrl: './song-card.scss',
})
export class SongCard {
  readonly song = input.required<Song>();
  readonly checked = input<boolean>(false);
  readonly toggled = output<number>();

  onToggle(): void {
    this.toggled.emit(this.song().trackId);
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
