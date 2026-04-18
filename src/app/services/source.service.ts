import { computed, Injectable, signal } from '@angular/core';

function resolveAssetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

@Injectable({ providedIn: 'root' })
export class SourceService {
  readonly sources = signal<string[]>([]);
  readonly activeSource = signal<string>('default.xml');
  readonly loading = signal<boolean>(false);

  readonly activeSourceLabel = computed(() => this.sourceLabel(this.activeSource()));

  async loadSources(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(resolveAssetUrl('sources/songs/index.json'));
      const files: unknown = await response.json();
      if (Array.isArray(files)) {
        const valid = files.filter((f): f is string => typeof f === 'string' && f.endsWith('.xml'));
        this.sources.set(valid);
        if (valid.length > 0 && !valid.includes(this.activeSource())) {
          this.activeSource.set(valid[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load source manifest', e);
      this.sources.set(['default.xml']);
    } finally {
      this.loading.set(false);
    }
  }

  selectSource(filename: string): void {
    this.activeSource.set(filename);
  }

  getSourceUrl(filename: string): string {
    return resolveAssetUrl(`sources/songs/${filename}`);
  }

  sourceLabel(filename: string): string {
    return filename.replace(/\.xml$/i, '');
  }
}
