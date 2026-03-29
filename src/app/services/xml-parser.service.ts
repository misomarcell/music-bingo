import { Injectable } from '@angular/core';
import { Song } from '../models/song';
import { parseAppleMusicPlistFromRoot } from '../../shared/apple-music-plist';

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
    return parseAppleMusicPlistFromRoot(doc.documentElement);
  }
}
