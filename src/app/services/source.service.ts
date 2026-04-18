import { computed, Injectable, signal } from '@angular/core';

export interface SourceEntry {
  file: string;
  label?: string;
}

function resolveAssetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

@Injectable({ providedIn: 'root' })
export class SourceService {
  readonly sources = signal<SourceEntry[]>([]);
  readonly activeSource = signal<string>('default.xml');
  readonly loading = signal<boolean>(false);

  readonly activeSourceLabel = computed(() => this.sourceLabel(this.activeSource()));

  async loadSources(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(resolveAssetUrl('sources/songs/index.json'));
      const data: unknown = await response.json();
      if (Array.isArray(data)) {
        const entries: SourceEntry[] = data
          .map((item) => this.parseEntry(item))
          .filter((e): e is SourceEntry => e !== null);
        this.sources.set(entries);
        const files = entries.map((e) => e.file);
        if (entries.length > 0 && !files.includes(this.activeSource())) {
          this.activeSource.set(entries[0].file);
        }
      }
    } catch (e) {
      console.error('Failed to load source manifest', e);
      this.sources.set([{ file: 'default.xml' }]);
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
    const entry = this.sources().find((e) => e.file === filename);
    return entry?.label || filename.replace(/\.xml$/i, '');
  }

  private parseEntry(item: unknown): SourceEntry | null {
    if (typeof item === 'string' && item.endsWith('.xml')) {
      return { file: item };
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const file = typeof record['file'] === 'string' ? record['file'] : '';
      if (!file.endsWith('.xml')) return null;
      const label = typeof record['label'] === 'string' ? record['label'] : undefined;
      return { file, label };
    }
    return null;
  }
}
