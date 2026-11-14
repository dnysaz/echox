export const APP_NAME = 'echox';
const AUDIUS = 'https://api.audius.co/v1';

export type Source = 'audius' | 'itunes';

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  src: string;
  source: Source;
  genre?: string;
  artistHandle?: string;
  artistId?: number;
  permalink?: string;
};

type AudiusTrack = {
  id: string;
  title: string;
  duration?: number;
  is_streamable?: boolean;
  genre?: string;
  permalink?: string;
  artwork?: Record<string, string> & { mirrors?: string[] };
  user?: { name?: string; handle?: string };
};

type ItunesTrack = {
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackViewUrl?: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

function fromAudius(t: AudiusTrack): Track | null {
  if (!t.id || !t.title || t.is_streamable === false) return null;
  const art = t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? '';
  return {
    id: `audius:${t.id}`,
    title: t.title.trim(),
    artist: t.user?.name || t.user?.handle || 'Audius artist',
    artwork: art,
    duration: t.duration ?? 0,
    src: `${AUDIUS}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
    source: 'audius',
    genre: t.genre,
    artistHandle: t.user?.handle,
    permalink: t.permalink,
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

/** All available songs by the same artist. */
export async function getArtistTracks(track: Track, limit = 40): Promise<Track[]> {
  if (track.source === 'audius' && track.artistHandle) {
    const data = await getJson<{ data: AudiusTrack[] }>(
      `${AUDIUS}/users/handle/${encodeURIComponent(track.artistHandle)}/tracks?app_name=${APP_NAME}&limit=${limit}`
    );
    return data.data.map(fromAudius).filter((t): t is Track => t !== null);
  }

  if (track.source === 'itunes' && track.artistId) {
    const data = await getJson<{ results: ItunesTrack[] }>(
      `https://itunes.apple.com/lookup?id=${track.artistId}&entity=song&limit=${limit}`
    );
    return data.results.map(fromItunes).filter((t): t is Track => t !== null);
  }

  return [track];
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
