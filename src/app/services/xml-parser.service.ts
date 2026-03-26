import { Injectable } from '@angular/core';
import { Song } from '../models/song';

@Injectable({ providedIn: 'root' })
export class XmlParserService {
  async fetchAndParse(url: string): Promise<Song[]> {
    const response = await fetch(url);
    const text = await response.text();
    return this.parsePlist(text);
  }

  private parsePlist(xml: string): Song[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Navigate to Tracks dict: plist > dict > (find <key>Tracks</key> then next <dict>)
    const rootDict = doc.querySelector('plist > dict');
    if (!rootDict) return [];

    const tracksDict = this.findValueForKey(rootDict, 'Tracks');
    if (!tracksDict || tracksDict.tagName !== 'dict') return [];

    const songs: Song[] = [];
    const children = Array.from(tracksDict.children);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'key') {
        const trackDict = children[i + 1];
        if (trackDict && trackDict.tagName === 'dict') {
          const song = this.parseTrackDict(trackDict);
          if (song) songs.push(song);
        }
      }
    }

    return songs;
  }

  private parseTrackDict(dict: Element): Song | null {
    const data = this.dictToMap(dict);
    const name = data.get('Name');
    if (!name) return null;

    return {
      trackId: parseInt(data.get('Track ID') || '0', 10),
      name,
      artist: data.get('Artist') || 'Unknown',
      albumArtist: data.get('Album Artist') || '',
      composer: data.get('Composer') || '',
      album: data.get('Album') || '',
      genre: data.get('Genre') || '',
      kind: data.get('Kind') || '',
      size: parseInt(data.get('Size') || '0', 10),
      totalTime: parseInt(data.get('Total Time') || '0', 10),
      year: parseInt(data.get('Year') || '0', 10),
      dateModified: data.get('Date Modified') || '',
      dateAdded: data.get('Date Added') || '',
      bitRate: parseInt(data.get('Bit Rate') || '0', 10),
      sampleRate: parseInt(data.get('Sample Rate') || '0', 10),
      comments: data.get('Comments') || '',
      playCount: parseInt(data.get('Play Count') || '0', 10),
    };
  }

  private dictToMap(dict: Element): Map<string, string> {
    const map = new Map<string, string>();
    const children = Array.from(dict.children);
    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === 'key') {
        const key = children[i].textContent || '';
        const val = children[i + 1];
        if (val) {
          map.set(key, val.textContent || '');
        }
      }
    }
    return map;
  }

  private findValueForKey(dict: Element, keyName: string): Element | null {
    const children = Array.from(dict.children);
    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === 'key' && children[i].textContent === keyName) {
        return children[i + 1] || null;
      }
    }
    return null;
  }
}
