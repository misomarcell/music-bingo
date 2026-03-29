import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'music-bingo-theme-preference';
const LIGHT_THEME_CLASS = 'light-theme';
const DARK_THEME_CLASS = 'dark-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaQuery =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  readonly preference = signal<ThemePreference>(this.readPreference());
  private readonly systemPrefersDark = signal<boolean>(this.mediaQuery?.matches ?? false);

  readonly mode = computed<ThemeMode>(() => {
    const preference = this.preference();
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    if (this.mediaQuery) {
      const listener = (event: MediaQueryListEvent) => {
        this.systemPrefersDark.set(event.matches);
      };
      this.mediaQuery.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => {
        this.mediaQuery?.removeEventListener('change', listener);
      });
    }

    effect(() => {
      const preference = this.preference();
      this.applyThemePreference(preference);
      this.persistPreference(preference);
    });
  }

  cyclePreference(): void {
    const preference = this.preference();
    if (preference === 'system') {
      this.preference.set(this.mode() === 'dark' ? 'light' : 'dark');
      return;
    }
    if (preference === 'dark') {
      this.preference.set('light');
      return;
    }
    this.preference.set('system');
  }

  private applyThemePreference(preference: ThemePreference): void {
    const root = this.document.documentElement;
    root.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS);

    if (preference === 'light') {
      root.classList.add(LIGHT_THEME_CLASS);
      return;
    }
    if (preference === 'dark') {
      root.classList.add(DARK_THEME_CLASS);
    }
  }

  private readPreference(): ThemePreference {
    if (typeof localStorage === 'undefined') return 'system';

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private persistPreference(preference: ThemePreference): void {
    if (typeof localStorage === 'undefined') return;

    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
}
