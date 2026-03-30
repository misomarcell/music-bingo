import { inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private started = false;

  start(): void {
    if (this.started || !this.swUpdate.isEnabled) return;
    this.started = true;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        void this.promptForUpdate();
      });

    this.swUpdate.unrecoverable.subscribe(() => {
      window.alert('Music Bingo needs to reload to recover from a cached update issue.');
      window.location.reload();
    });

    void this.checkForUpdate();
    window.setInterval(() => {
      void this.checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);

    window.addEventListener('online', () => {
      void this.checkForUpdate();
    });
  }

  private async promptForUpdate(): Promise<void> {
    const shouldReload = window.confirm('A new version of Music Bingo is available. Reload now?');
    if (!shouldReload) return;

    try {
      await this.swUpdate.activateUpdate();
    } finally {
      window.location.reload();
    }
  }

  private async checkForUpdate(): Promise<void> {
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      // Best effort. Connectivity can be intermittent when offline.
    }
  }
}
