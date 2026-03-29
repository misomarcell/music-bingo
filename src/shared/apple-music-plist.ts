import { Song } from '../app/models/song';

interface XmlElementLike {
  readonly nodeType?: number;
  readonly tagName?: string;
  readonly textContent?: string | null;
  readonly children?: ArrayLike<XmlElementLike>;
  readonly childNodes?: ArrayLike<XmlElementLike>;
}

const ELEMENT_NODE = 1;

function parseInteger(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asElement(node: XmlElementLike | null | undefined): XmlElementLike | null {
  if (!node || !node.tagName) return null;
  if (typeof node.nodeType === 'number' && node.nodeType !== ELEMENT_NODE) return null;
  return node;
}

function childElements(element: XmlElementLike): XmlElementLike[] {
  const children = Array.from(element.children ?? []);
  if (children.length > 0) {
    return children.map(asElement).filter((v): v is XmlElementLike => Boolean(v));
  }

  return Array.from(element.childNodes ?? [])
    .map(asElement)
    .filter((v): v is XmlElementLike => Boolean(v));
}

function tagNameIs(element: XmlElementLike, expectedTagName: string): boolean {
  return element.tagName?.toLowerCase() === expectedTagName;
}

function findFirstChildByTag(element: XmlElementLike, tagName: string): XmlElementLike | null {
  return childElements(element).find((child) => tagNameIs(child, tagName)) ?? null;
}

function findValueForKey(dict: XmlElementLike, keyName: string): XmlElementLike | null {
  const children = childElements(dict);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (tagNameIs(child, 'key') && child.textContent === keyName) {
      return children[i + 1] ?? null;
    }
  }
  return null;
}

function dictToMap(dict: XmlElementLike): Map<string, string> {
  const map = new Map<string, string>();
  const children = childElements(dict);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!tagNameIs(child, 'key')) continue;

    const valueElement = children[i + 1];
    if (!valueElement) continue;

    const key = child.textContent ?? '';
    map.set(key, valueElement.textContent ?? '');
  }
  return map;
}

function parseTrackDict(dict: XmlElementLike): Song | null {
  const data = dictToMap(dict);
  const name = data.get('Name');
  if (!name) return null;

  return {
    trackId: parseInteger(data.get('Track ID')),
    name,
    artist: data.get('Artist') || 'Unknown',
    albumArtist: data.get('Album Artist') || '',
    composer: data.get('Composer') || '',
    album: data.get('Album') || '',
    genre: data.get('Genre') || '',
    kind: data.get('Kind') || '',
    size: parseInteger(data.get('Size')),
    totalTime: parseInteger(data.get('Total Time')),
    year: parseInteger(data.get('Year')),
    dateModified: data.get('Date Modified') || '',
    dateAdded: data.get('Date Added') || '',
    bitRate: parseInteger(data.get('Bit Rate')),
    sampleRate: parseInteger(data.get('Sample Rate')),
    comments: data.get('Comments') || '',
    playCount: parseInteger(data.get('Play Count')),
  };
}

export function parseAppleMusicPlistFromRoot(root: XmlElementLike | null | undefined): Song[] {
  const plistRoot = asElement(root);
  if (!plistRoot || !tagNameIs(plistRoot, 'plist')) return [];

  const rootDict = findFirstChildByTag(plistRoot, 'dict');
  if (!rootDict) return [];

  const tracksDict = findValueForKey(rootDict, 'Tracks');
  if (!tracksDict || !tagNameIs(tracksDict, 'dict')) return [];

  const songs: Song[] = [];
  const children = childElements(tracksDict);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!tagNameIs(child, 'key')) continue;

    const trackDict = children[i + 1];
    if (!trackDict || !tagNameIs(trackDict, 'dict')) continue;

    const parsedSong = parseTrackDict(trackDict);
    if (parsedSong) {
      songs.push(parsedSong);
    }
  }

  return songs;
}
