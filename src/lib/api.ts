export const APP_NAME = 'echox';
const AUDIUS = 'https://api.audius.co/v1';

export type Source = 'audius' | 'deezer' | 'itunes' | 'podcast' | 'radio';

export type Show = {
  id: number;
  title: string;
  publisher: string;
  artwork: string;
};

export type InfoItem = { label: string; value: string; href?: string };

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  src: string;
  source: Source;
  genre?: string;
  album?: string;
  description?: string;
  link?: string;
  linkLabel?: string;
  /** Everything else the source API knows about this item. */
  info?: InfoItem[];
  artistHandle?: string;
  artistId?: number;
  permalink?: string;
  live?: boolean;
  country?: string;
  countryCode?: string;
};

type AudiusTrack = {
  id: string;
  title: string;
  duration?: number;
  is_streamable?: boolean;
  genre?: string;
  mood?: string;
  tags?: string;
  description?: string;
  release_date?: string;
  created_at?: string;
  play_count?: number;
  favorite_count?: number;
  repost_count?: number;
  permalink?: string;
  artwork?: Record<string, string> & { mirrors?: string[] };
  user?: { name?: string; handle?: string; follower_count?: number; track_count?: number };
};

type ItunesTrack = {
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  collectionName?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackNumber?: number;
  trackCount?: number;
  trackExplicitness?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackViewUrl?: string;
};

type ItunesShow = {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
};

type ItunesPodcast = {
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  description?: string;
  releaseDate?: string;
  trackNumber?: number;
  artworkUrl600?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackViewUrl?: string;
};

type DeezerTrack = {
  id?: number;
  title?: string;
  duration?: number;
  preview?: string;
  explicit_lyrics?: boolean;
  artist?: { id?: number; name?: string };
  album?: { id?: number; title?: string; cover_medium?: string; cover_big?: string };
};

type DeezerList = { data?: DeezerTrack[] };

type RadioStation = {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
  clickcount?: number;
  homepage?: string;
  hls?: number;
};

function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countLabel(value?: number): string | undefined {
  return typeof value === 'number' && value > 0 ? value.toLocaleString('en-US') : undefined;
}

function field(label: string, value?: string | number | null): InfoItem | null {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'number' ? String(value) : value.trim();
  return text ? { label, value: text } : null;
}

function collect(...items: (InfoItem | null)[]): InfoItem[] {
  return items.filter((item): item is InfoItem => item !== null);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

// Deezer's public API does not send CORS headers, but it supports JSONP.
let jsonpCounter = 0;

function getJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = `__echoxJsonp${++jsonpCounter}`;
    const script = document.createElement('script');
    const globalWindow = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      window.clearTimeout(timer);
      delete globalWindow[callback];
      script.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out'));
    }, 12000);
    globalWindow[callback] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${callback}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Request failed'));
    };
    document.head.append(script);
  });
}

function fromAudius(t: AudiusTrack): Track | null {
  if (!t.id || !t.title || t.is_streamable === false) return null;
  const art = t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? '';
  const link = t.permalink ? `https://audius.co${t.permalink}` : undefined;
  return {
    id: `audius:${t.id}`,
    title: t.title.trim(),
    artist: t.user?.name || t.user?.handle || 'Audius artist',
    artwork: art,
    duration: t.duration ?? 0,
    src: `${AUDIUS}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
    source: 'audius',
    genre: t.genre,
    description: t.description?.trim() || undefined,
    link,
    linkLabel: 'Open on Audius',
    info: collect(
      field('Genre', t.genre),
      field('Mood', t.mood),
      field('Tags', t.tags),
      field('Released', isoDate(t.release_date)),
      field('Uploaded', isoDate(t.created_at)),
      field('Plays', countLabel(t.play_count)),
      field('Favorites', countLabel(t.favorite_count)),
      field('Reposts', countLabel(t.repost_count)),
      field('Artist', t.user?.name),
      field('Handle', t.user?.handle ? `@${t.user.handle}` : undefined),
      field('Followers', countLabel(t.user?.follower_count)),
      field('Tracks', countLabel(t.user?.track_count)),
      field('Audius ID', t.id)
    ),
    artistHandle: t.user?.handle,
    permalink: t.permalink,
  };
}

function fromDeezer(t: DeezerTrack): Track | null {
  if (!t.id || !t.title || !t.preview) return null;
  return {
    id: `deezer:${t.id}`,
    title: t.title.trim(),
    artist: t.artist?.name || 'Deezer artist',
    artwork: t.album?.cover_medium || t.album?.cover_big || '',
    duration: t.duration ?? 0,
    src: t.preview,
    source: 'deezer',
    album: t.album?.title,
    link: `https://www.deezer.com/track/${t.id}`,
    linkLabel: 'Open on Deezer',
    info: collect(
      field('Album', t.album?.title),
      field('Artist', t.artist?.name),
      field('Full length', t.duration ? formatTime(t.duration) : undefined),
      field('Playback', '30-second preview'),
      field('Explicit', t.explicit_lyrics ? 'Yes' : undefined),
      field('Deezer ID', t.id)
    ),
    artistId: t.artist?.id,
    permalink: `https://www.deezer.com/track/${t.id}`,
  };
}

function fromShow(r: ItunesShow): Show | null {
  if (!r.collectionId || !r.collectionName) return null;
  return {
    id: r.collectionId,
    title: r.collectionName,
    publisher: r.artistName || 'Podcast',
    artwork: (r.artworkUrl600 || r.artworkUrl100 || '').replace('100x100', '600x600'),
  };
}

function fromPodcast(r: ItunesPodcast): Track | null {
  if (!r.previewUrl || !r.trackName) return null;
  const duration = Math.round((r.trackTimeMillis ?? 0) / 1000);
  return {
    id: `podcast:${r.trackId ?? r.previewUrl}`,
    title: r.trackName,
    artist: r.collectionName || r.artistName || 'Podcast',
    artwork: (r.artworkUrl600 || r.artworkUrl100 || '').replace('100x100', '600x600'),
    duration,
    src: r.previewUrl,
    source: 'podcast',
    album: r.collectionName,
    description: r.description?.trim() || undefined,
    link: r.trackViewUrl,
    linkLabel: 'Open in Apple Podcasts',
    info: collect(
      field('Show', r.collectionName),
      field('Publisher', r.artistName),
      field('Released', isoDate(r.releaseDate)),
      field('Episode length', duration ? formatTime(duration) : undefined),
      field('Episode', r.trackNumber),
      field('Playback', '30-second preview')
    ),
    artistId: r.collectionId,
  };
}

function fromRadio(s: RadioStation): Track | null {
  if (!s.stationuuid || !s.url_resolved || !s.name) return null;
  // HTTPS streams only: the site itself is served over HTTPS.
  if (!s.url_resolved.startsWith('https://')) return null;
  // HLS playlists do not play in a plain <audio> element outside Safari.
  if (s.hls === 1 || /\.m3u8(\?|$)/i.test(s.url_resolved)) return null;
  const tag = s.tags?.split(',').filter(Boolean)[0];
  return {
    id: `radio:${s.stationuuid}`,
    title: s.name.trim(),
    artist: s.country || tag || 'Live radio',
    artwork: s.favicon && s.favicon.startsWith('https://') ? s.favicon : '',
    duration: 0,
    src: s.url_resolved,
    source: 'radio',
    genre: tag,
    link: s.homepage?.startsWith('http') ? s.homepage : undefined,
    linkLabel: 'Open station website',
    info: collect(
      field('Country', s.country ? `${s.country}${s.countrycode ? ` (${s.countrycode})` : ''}` : undefined),
      field('Region', s.state),
      field('Language', s.language),
      field('Tags', s.tags ? s.tags.split(',').filter(Boolean).join(', ') : undefined),
      field('Codec', s.codec),
      field('Bitrate', s.bitrate ? `${s.bitrate} kbps` : undefined),
      field('Votes', countLabel(s.votes)),
      field('Clicks', countLabel(s.clickcount)),
      field('Stream', s.url_resolved),
      field('Station ID', s.stationuuid)
    ),
    live: true,
    country: s.country,
    countryCode: s.countrycode,
  };
}

function fromItunes(r: ItunesTrack): Track | null {
  if (r.kind !== 'song' || !r.previewUrl || !r.trackName) return null;
  return {
    id: `itunes:${r.trackId ?? r.previewUrl}`,
    title: r.trackName,
    artist: r.artistName || 'Apple Music',
    artwork: (r.artworkUrl100 || '').replace('100x100', '300x300'),
    duration: Math.round((r.trackTimeMillis ?? 30000) / 1000),
    src: r.previewUrl,
    source: 'itunes',
    album: r.collectionName,
    link: r.trackViewUrl,
    linkLabel: 'Open in Apple Music',
    info: collect(
      field('Album', r.collectionName),
      field('Artist', r.artistName),
      field('Genre', r.primaryGenreName),
      field('Released', isoDate(r.releaseDate)),
      field(
        'Track',
        r.trackNumber ? `${r.trackNumber}${r.trackCount ? ` of ${r.trackCount}` : ''}` : undefined
      ),
      field('Explicit', r.trackExplicitness && r.trackExplicitness !== 'notExplicit' ? 'Yes' : undefined),
      field('Preview length', '30 seconds')
    ),
    artistId: r.artistId,
    permalink: r.trackViewUrl,
  };
}

export async function getTrending(limit = 18): Promise<Track[]> {
  const data = await getJson<{ data: AudiusTrack[] }>(
    `${AUDIUS}/tracks/trending?app_name=${APP_NAME}&limit=${limit}`
  );
  return data.data.map(fromAudius).filter((t): t is Track => t !== null);
}

export async function searchAudius(query: string, limit = 15): Promise<Track[]> {
  const data = await getJson<{ data: AudiusTrack[] }>(
    `${AUDIUS}/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}&limit=${limit}`
  );
  return data.data.map(fromAudius).filter((t): t is Track => t !== null);
}

export async function searchItunes(query: string, limit = 8): Promise<Track[]> {
  const data = await getJson<{ results: ItunesTrack[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
  );
  return data.results.map(fromItunes).filter((t): t is Track => t !== null);
}

export async function searchDeezer(query: string, limit = 12): Promise<Track[]> {
  const data = await getJsonp<DeezerList>(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data.data ?? []).map(fromDeezer).filter((t): t is Track => t !== null);
}

export async function searchPodcasts(query: string, limit = 6): Promise<Track[]> {
  const data = await getJson<{ results: ItunesPodcast[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcastEpisode&limit=${limit}`
  );
  return data.results.map(fromPodcast).filter((t): t is Track => t !== null);
}

export async function searchPodcastShows(query: string, limit = 12): Promise<Show[]> {
  const data = await getJson<{ results: ItunesShow[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=${limit}`
  );
  return data.results.map(fromShow).filter((s): s is Show => s !== null);
}

const PODCAST_TOPICS = ['comedy', 'news', 'technology', 'indonesia'];

/** A small cross-genre selection of podcast series for discovery. */
export async function getPodcastShows(limit = 12): Promise<Show[]> {
  const results = await Promise.allSettled(
    PODCAST_TOPICS.map((topic) => searchPodcastShows(topic, 4))
  );
  const unique = new Map<number, Show>();
  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((show) => {
      if (!unique.has(show.id)) unique.set(show.id, show);
    });
  });
  return [...unique.values()].slice(0, limit);
}

/** Every available episode of one podcast series. */
export async function getPodcastEpisodes(showId: number, limit = 30): Promise<Track[]> {
  const data = await getJson<{ results: ItunesPodcast[] }>(
    `https://itunes.apple.com/lookup?id=${showId}&entity=podcastEpisode&limit=${limit}`
  );
  return data.results.map(fromPodcast).filter((t): t is Track => t !== null);
}

const RADIO_API = 'https://de1.api.radio-browser.info/json/stations/search';

export async function getRadioStations(limit = 20, offset = 0): Promise<Track[]> {
  const data = await getJson<RadioStation[]>(
    `${RADIO_API}?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&hidebroken=true`
  );
  return data.map(fromRadio).filter((t): t is Track => t !== null);
}

export async function getRadioByCountry(countryCode: string, limit = 40): Promise<Track[]> {
  const data = await getJson<RadioStation[]>(
    `${RADIO_API}?countrycode=${encodeURIComponent(countryCode)}&limit=${limit}&order=clickcount&reverse=true&hidebroken=true`
  );
  return data.map(fromRadio).filter((t): t is Track => t !== null);
}

export async function searchRadio(query: string, limit = 10): Promise<Track[]> {
  const params = `limit=${limit}&hidebroken=true&order=clickcount&reverse=true`;
  const byName = await getJson<RadioStation[]>(
    `${RADIO_API}?name=${encodeURIComponent(query)}&${params}`
  );
  const list = byName.length
    ? byName
    : await getJson<RadioStation[]>(`${RADIO_API}?tag=${encodeURIComponent(query)}&${params}`);
  return list.map(fromRadio).filter((t): t is Track => t !== null);
}

/** All available songs by the same artist. */
export async function getArtistTracks(track: Track, limit = 40): Promise<Track[]> {
  if (track.source === 'audius' && track.artistHandle) {
    const data = await getJson<{ data: AudiusTrack[] }>(
      `${AUDIUS}/users/handle/${encodeURIComponent(track.artistHandle)}/tracks?app_name=${APP_NAME}&limit=${limit}`
    );
    return data.data.map(fromAudius).filter((t): t is Track => t !== null);
  }

  if (track.source === 'deezer' && track.artistId) {
    const data = await getJsonp<DeezerList>(
      `https://api.deezer.com/artist/${track.artistId}/top?limit=${limit}`
    );
    return (data.data ?? []).map(fromDeezer).filter((t): t is Track => t !== null);
  }

  if (track.source === 'itunes' && track.artistId) {
    const data = await getJson<{ results: ItunesTrack[] }>(
      `https://itunes.apple.com/lookup?id=${track.artistId}&entity=song&limit=${limit}`
    );
    return data.results.map(fromItunes).filter((t): t is Track => t !== null);
  }

  if (track.source === 'podcast' && track.artistId) {
    const data = await getJson<{ results: ItunesPodcast[] }>(
      `https://itunes.apple.com/lookup?id=${track.artistId}&entity=podcastEpisode&limit=${limit}`
    );
    return data.results.map(fromPodcast).filter((t): t is Track => t !== null);
  }

  return [track];
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
