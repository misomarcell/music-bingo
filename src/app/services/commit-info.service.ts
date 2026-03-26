import { Injectable, signal } from '@angular/core';

const GITHUB_API_URL = 'https://api.github.com/repos/misomarcell/music-bingo/commits/main';

@Injectable({ providedIn: 'root' })
export class CommitInfoService {
  readonly commitHash = signal('');
  readonly commitDate = signal('');

  constructor() {
    this.fetchCommitInfo();
  }

  private async fetchCommitInfo(): Promise<void> {
    try {
      const res = await fetch(GITHUB_API_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      this.commitHash.set(data.sha?.slice(-7) ?? '');
      const date = data.commit?.author?.date;
      if (date) {
        this.commitDate.set(
          new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        );
      }
    } catch {
      // Silently fail — commit info is non-critical
    }
  }
}
