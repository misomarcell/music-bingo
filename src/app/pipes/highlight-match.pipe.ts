import { Pipe, PipeTransform } from '@angular/core';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Pipe({
  name: 'highlightMatch',
  standalone: true,
})
export class HighlightMatchPipe implements PipeTransform {
  transform(value: string | null | undefined, query: string | null | undefined): string {
    const text = value ?? '';
    const normalizedQuery = (query ?? '').trim();

    if (!text) return '';
    if (!normalizedQuery) return escapeHtml(text);

    const escapedQuery = escapeRegExp(normalizedQuery);
    if (!escapedQuery) return escapeHtml(text);

    const splitRegex = new RegExp(`(${escapedQuery})`, 'gi');
    const exactRegex = new RegExp(`^${escapedQuery}$`, 'i');

    return text
      .split(splitRegex)
      .map((part) =>
        exactRegex.test(part)
          ? `<mark class="search-highlight">${escapeHtml(part)}</mark>`
          : escapeHtml(part),
      )
      .join('');
  }
}
