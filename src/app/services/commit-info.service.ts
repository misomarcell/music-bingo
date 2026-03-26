import { Injectable, signal } from '@angular/core';

const GITHUB_API_URL = 'https://api.github.com/repos/misomarcell/music-bingo/commits/main';

@Injectable({ providedIn: 'root' })
export class CommitInfoService {
  readonly commitHash = signal('');
  readonly commitDate = signal('');
  readonly commitUrl = signal('');

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
      this.commitUrl.set(data.html_url ?? '');
      const date = data.commit?.author?.date;
      if (date) {
        this.commitDate.set(
          new Date(date).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      }
    } catch {
      // Silently fail — commit info is non-critical
    }
  }
}
