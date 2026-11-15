import {
  formatTime,
  getArtistTracks,
  getPodcastEpisodes,
  getPodcastShows,
  getRadioByCountry,
  getRadioStations,
  getTrending,
  searchAudius,
  searchDeezer,
  searchItunes,
  searchPodcasts,
  searchRadio,
  type Show,
  type Track,
} from '../lib/api';

const LIKED_KEY = 'echox:liked';
const HISTORY_KEY = 'echox:history';
const STATS_KEY = 'echox:stats';
const PLAYING_KEY = 'echox:playing';
const HISTORY_MAX = 40;
const STATS_MAX = 200;

const playIcon =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l10-7z"/></svg>';
const pauseIcon =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const audio = el<HTMLAudioElement>('audio');
const player = el<HTMLElement>('player');
const nowArt = el<HTMLDivElement>('now-art');
const nowTitle = el<HTMLDivElement>('now-title');
const nowArtist = el<HTMLDivElement>('now-artist');
const nowSrc = el<HTMLDivElement>('now-src');
const playBtn = el<HTMLButtonElement>('play-btn');
const likeBtn = el<HTMLButtonElement>('like-btn');
const seek = el<HTMLInputElement>('seek');
const cur = el<HTMLSpanElement>('cur');
const dur = el<HTMLSpanElement>('dur');
const volume = el<HTMLInputElement>('volume');
const muteBtn = el<HTMLButtonElement>('mute-btn');

const detail = el<HTMLElement>('detail');
const detailArt = el<HTMLDivElement>('detail-art');
const detailTitle = el<HTMLHeadingElement>('detail-title');
const detailArtist = el<HTMLParagraphElement>('detail-artist');
const detailMeta = el<HTMLSpanElement>('detail-meta');
const detailPlay = el<HTMLButtonElement>('detail-play');
const detailLike = el<HTMLButtonElement>('detail-like');
const detailList = el<HTMLDivElement>('detail-list');
const detailCount = el<HTMLSpanElement>('detail-count');
const detailArtistName = el<HTMLSpanElement>('detail-artist-name');
const detailListPrefix = el<HTMLSpanElement>('detail-list-prefix');
const nowOpen = el<HTMLButtonElement>('now-open');

const trendingGrid = el<HTMLDivElement>('trending-grid');
const genreChips = el<HTMLDivElement>('genre-chips');
const searchInput = el<HTMLInputElement>('search-input');
const searchHeading = el<HTMLHeadingElement>('search-heading');
const searchHint = el<HTMLParagraphElement>('search-hint');
const audiusResults = el<HTMLDivElement>('audius-results');
const deezerResults = el<HTMLDivElement>('deezer-results');
const itunesResults = el<HTMLDivElement>('itunes-results');
const podcastResults = el<HTMLDivElement>('podcast-results');
const radioResults = el<HTMLDivElement>('radio-results');
const homePlayAgainHead = el<HTMLDivElement>('home-play-again-head');
const homePlayAgain = el<HTMLDivElement>('home-play-again');
const homePodcastsHead = el<HTMLDivElement>('home-podcasts-head');
const homePodcasts = el<HTMLDivElement>('home-podcasts');
const homeRadioHead = el<HTMLDivElement>('home-radio-head');
const homeRadio = el<HTMLDivElement>('home-radio');
const podcastsHeading = el<HTMLHeadingElement>('podcasts-heading');
const podcastsHint = el<HTMLParagraphElement>('podcasts-hint');
const podcastsBack = el<HTMLButtonElement>('podcasts-back');
const podcastsGrid = el<HTMLDivElement>('podcasts-grid');
const radioGrid = el<HTMLDivElement>('radio-grid');
const radioMore = el<HTMLButtonElement>('radio-more');
const likedGrid = el<HTMLDivElement>('liked-grid');
const likedStatus = el<HTMLDivElement>('liked-status');
const playAgainHead = el<HTMLDivElement>('play-again-head');
const playAgainGrid = el<HTMLDivElement>('play-again-grid');
const mostPlayedHead = el<HTMLDivElement>('most-played-head');
const mostPlayedGrid = el<HTMLDivElement>('most-played-grid');
const historyHead = el<HTMLDivElement>('history-head');
const historyList = el<HTMLDivElement>('history-list');
const topbar = document.querySelector<HTMLElement>('.topbar') as HTMLElement;
const searchToggle = el<HTMLButtonElement>('search-toggle');
const searchCancel = el<HTMLButtonElement>('search-cancel');

let queue: Track[] = [];
let index = -1;
let current: Track | null = null;
let searchTimer: number | undefined;
let lastVolume = 0.8;
let detailOpen = false;
let detailKey: string | null = null;
let detailTracks: Track[] = [];

interface HistoryEntry {
  track: Track;
  playedAt: number;
}

interface PlayStat {
  track: Track;
  count: number;
  lastPlayed: number;
}

interface SavedPlayback {
  track: Track;
  queue: Track[];
  index: number;
  time: number;
  playing: boolean;
  savedAt: number;
}

const liked = new Map<string, Track>(loadLiked());
const history: HistoryEntry[] = loadHistory();
const stats = new Map<string, PlayStat>(loadStats());

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

function loadLiked(): [string, Track][] {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const list = raw ? (JSON.parse(raw) as Track[]) : [];
    return list.map((t) => [t.id, t]);
  } catch {
    return [];
  }
}

function saveLiked() {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...liked.values()].slice(0, 200)));
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isTrack(value: unknown): value is Track {
  const track = value as Partial<Track> | null;
  return (
    !!track &&
    typeof track.id === 'string' &&
    typeof track.title === 'string' &&
    typeof track.src === 'string'
  );
}

function loadHistory(): HistoryEntry[] {
  const raw = readStore<HistoryEntry[]>(HISTORY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && isTrack(entry.track) && typeof entry.playedAt === 'number')
    .slice(0, HISTORY_MAX);
}

function loadStats(): [string, PlayStat][] {
  const raw = readStore<PlayStat[]>(STATS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((stat) => stat && isTrack(stat.track) && stat.count > 0)
    .map((stat) => [stat.track.id, stat] as [string, PlayStat]);
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_MAX)));
  } catch {
    /* storage full or blocked: keep the in-memory list */
  }
}

function saveStats() {
  try {
    const list = [...stats.values()]
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, STATS_MAX);
    localStorage.setItem(STATS_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: keep the in-memory counts */
  }
}

let lastPlaybackSave = 0;

function savePlayback(force = false) {
  if (!current) return;
  const now = Date.now();
  if (!force && now - lastPlaybackSave < 4000) return;
  lastPlaybackSave = now;
  try {
    const safeQueue = queue.slice(0, 60);
    const saved: SavedPlayback = {
      track: current,
      queue: safeQueue,
      index: index >= 0 && index < safeQueue.length ? index : 0,
      time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      playing: !audio.paused,
      savedAt: now,
    };
    localStorage.setItem(PLAYING_KEY, JSON.stringify(saved));
  } catch {
    /* storage full or blocked: keep playing anyway */
  }
}

function restorePlayback() {
  const saved = readStore<SavedPlayback | null>(PLAYING_KEY, null);
  if (!saved || !isTrack(saved.track)) return;

  const tracks = Array.isArray(saved.queue) ? saved.queue.filter(isTrack) : [];
  let list = tracks.length ? tracks : [saved.track];
  let position = list.findIndex((track) => track.id === saved.track?.id);
  if (position < 0) {
    list = [saved.track];
    position = 0;
  }

  queue = list;
  index = position;
  loadTrack(saved.track, false);

  const startAt = Number(saved.time) || 0;
  const resume = () => {
    if (startAt > 0 && Number.isFinite(audio.duration) && startAt < audio.duration - 1) {
      audio.currentTime = startAt;
    }
    if (saved.playing) {
      // Browsers may block autoplay; the song stays loaded and paused.
      void audio.play().catch(() => {});
    }
  };
  if (audio.readyState >= 1) resume();
  else audio.addEventListener('loadedmetadata', resume, { once: true });
}

function recordPlay(track: Track) {
  const at = Date.now();
  const existing = history.findIndex((entry) => entry.track.id === track.id);
  if (existing >= 0) history.splice(existing, 1);
  history.unshift({ track, playedAt: at });
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  saveHistory();

  const stat = stats.get(track.id);
  stats.set(track.id, { track, count: (stat?.count ?? 0) + 1, lastPlayed: at });
  saveStats();

  if (currentView === 'library') renderLibrary();
  if (currentView === 'home') renderHomePlayAgain();
}

function skeletonGrid(count = 6): string {
  return `<div class="skeleton-grid">${'<div class="skeleton"></div>'.repeat(count)}</div>`;
}

function showStatus(target: HTMLElement, message: string, isError = false) {
  target.innerHTML = `<div class="status${isError ? ' error' : ''}">${escapeHtml(message)}</div>`;
}

function paintRange(input: HTMLInputElement, percent: number) {
  const p = Math.max(0, Math.min(1, percent)) * 100;
  input.style.background = `linear-gradient(to right, var(--accent) ${p}%, #35353f ${p}%)`;
}

function coverMarkup(track: Pick<Track, 'artwork'>, size: 'sm' | 'md' | 'lg'): string {
  const fallback = `<span class="art-fallback art-fallback-${size}" aria-hidden="true">
    <span class="art-fallback-mark">♪</span>
    <span class="art-fallback-word">echo<span class="brand-x">X</span></span>
  </span>`;
  if (!track.artwork) return fallback;
  return `${fallback}<img loading="lazy" src="${escapeHtml(track.artwork)}" alt="" onerror="this.style.display='none'">`;
}

function artistKey(track: Track): string {
  switch (track.source) {
    case 'audius':
      return `audius:${track.artistHandle ?? track.artist}`;
    case 'deezer':
      return `deezer:${track.artistId ?? track.artist}`;
    case 'podcast':
      return `podcast:${track.artistId ?? track.artist}`;
    case 'radio':
      return `radio:${track.countryCode ?? track.artist}`;
    default:
      return `itunes:${track.artistId ?? track.artist}`;
  }
}

function sourceBadge(track: Track): { label: string; className: string } {
  switch (track.source) {
    case 'audius':
      return { label: 'FULL', className: '' };
    case 'radio':
      return { label: 'LIVE', className: ' live' };
    case 'podcast':
      return { label: 'PODCAST', className: ' podcast' };
    default:
      return { label: 'PREVIEW', className: ' preview' };
  }
}

function sourceMeta(track: Track, short = false): string {
  const labels = short
    ? {
        audius: 'AUDIUS · FULL TRACK',
        deezer: 'DEEZER · 30S PREVIEW',
        itunes: 'APPLE MUSIC · 30S PREVIEW',
        podcast: 'APPLE PODCASTS · EPISODE',
        radio: 'LIVE RADIO',
      }
    : {
        audius: 'Audius · full track',
        deezer: 'Deezer · 30s preview',
        itunes: 'Apple Music · 30s preview',
        podcast: 'Apple Podcasts · episode',
        radio: 'Live radio',
      };
  return labels[track.source];
}

/* ---------------- Cards ---------------- */

function makeCard(track: Track, list: Track[], position: number): HTMLButtonElement {
  const badge = sourceBadge(track);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.dataset.trackId = track.id;
  card.innerHTML = `
    <div class="card-art">
      ${coverMarkup(track, 'md')}
      <span class="badge-src${badge.className}">${badge.label}</span>
      <span class="card-eq"><i></i><i></i><i></i></span>
      <span class="card-play">${playIcon}</span>
    </div>
    <div class="card-title">${escapeHtml(track.title)}</div>
    <div class="card-artist">${escapeHtml(track.artist)}</div>
  `;
  card.addEventListener('click', () => {
    if (current?.id === track.id && !detailOpen) {
      togglePlay();
      return;
    }
    playQueue(list, position);
    // Live stations have no artist catalogue to expand.
    if (track.live) closeDetail();
    else void openDetail(track);
  });
  return card;
}

function renderGrid(container: HTMLElement, tracks: Track[]) {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  tracks.forEach((track, i) => grid.append(makeCard(track, tracks, i)));
  container.append(grid);
  syncPlayingCards();
}

function makeShowCard(show: Show): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.innerHTML = `
    <div class="card-art">
      ${coverMarkup({ artwork: show.artwork }, 'md')}
      <span class="badge-src show">SHOW</span>
    </div>
    <div class="card-title">${escapeHtml(show.title)}</div>
    <div class="card-artist">${escapeHtml(show.publisher)}</div>
  `;
  card.addEventListener('click', () => void openPodcastShow(show));
  return card;
}

function renderShowGrid(container: HTMLElement, shows: Show[]) {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  shows.forEach((show) => grid.append(makeShowCard(show)));
  container.append(grid);
}

function syncPlayingCards() {
  document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
    card.classList.toggle('playing', card.dataset.trackId === current?.id);
    const play = card.querySelector<HTMLElement>('.card-play');
    if (play) {
      play.innerHTML = card.classList.contains('playing') && !audio.paused ? pauseIcon : playIcon;
    }
  });
}

/* ---------------- Expanded detail panel ---------------- */

async function openDetail(track: Track) {
  detailOpen = true;
  detail.hidden = false;
  renderDetailHead(track);
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const key = artistKey(track);
  const isRadio = track.live === true;
  detailKey = key;
  detailCount.textContent = '';
  detailList.innerHTML = `<div class="row-skeleton"></div><div class="row-skeleton"></div><div class="row-skeleton"></div>`;

  try {
    const tracks = isRadio
      ? track.countryCode
        ? await getRadioByCountry(track.countryCode)
        : []
      : await getArtistTracks(track);
    if (detailKey !== key || !detailOpen) return;
    // A live station lists the other stations from its own region.
    const list = isRadio ? tracks.filter((item) => item.id !== track.id) : tracks;
    detailTracks = list.length ? list : [track];
    renderDetailList(track);
  } catch {
    if (detailKey !== key) return;
    detailTracks = [track];
    showStatus(
      detailList,
      isRadio
        ? 'Could not load other stations from this region.'
        : 'Could not load more songs from this artist.',
      true
    );
    detailCount.textContent = '';
  }
}

function renderDetailHead(track: Track) {
  detailArt.innerHTML = coverMarkup(track, 'lg');
  detailTitle.textContent = track.title;
  detailArtist.textContent = track.artist;
  detailArtistName.textContent = track.live ? track.country || track.artist : track.artist;
  detailListPrefix.textContent = track.live ? 'Other live stations in' : 'More from';
  detailMeta.textContent = sourceMeta(track);
  detailPlay.innerHTML = audio.paused ? playIcon : pauseIcon;
  detailPlay.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
  detailLike.classList.toggle('liked', liked.has(track.id));
}

function renderDetailList(active: Track) {
  const unit = active.live ? 'station' : 'song';
  detailCount.textContent = `${detailTracks.length} ${detailTracks.length === 1 ? unit : `${unit}s`}`;
  detailList.innerHTML = '';
  detailTracks.forEach((track, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'row';
    row.dataset.trackId = track.id;
    row.classList.toggle('playing', track.id === active.id);
    row.innerHTML = `
      <span class="row-index">${i + 1}</span>
      <span class="row-art">${coverMarkup(track, 'sm')}</span>
      <span class="row-info">
        <span class="row-title">${escapeHtml(track.title)}</span>
        <span class="row-artist">${escapeHtml(track.artist)}</span>
      </span>
      <span class="row-dur">${track.live ? 'LIVE' : formatTime(track.duration)}</span>
      <span class="row-play">${playIcon}</span>
    `;
    row.addEventListener('click', () => {
      playQueue(detailTracks, i);
      renderDetailHead(track);
      renderDetailList(track);
    });
    detailList.append(row);
  });
}

function closeDetail() {
  detailOpen = false;
  detail.hidden = true;
  detailKey = null;
}

// Reopen the artist list the current song was started from (e.g. after
// switching to another menu), without reloading or interrupting playback.
function showPlayingList() {
  if (!current) return;
  if (current.live) {
    if (detailOpen && detailKey === artistKey(current)) {
      detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    void openDetail(current);
    return;
  }
  if (detailOpen) {
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (!detailTracks.length) {
    void openDetail(current);
    return;
  }
  detailOpen = true;
  detail.hidden = false;
  detailKey = artistKey(current);
  renderDetailHead(current);
  renderDetailList(current);
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onTrackChanged(track: Track) {
  if (!detailOpen) return;
  renderDetailHead(track);
  if (artistKey(track) !== detailKey) {
    void openDetail(track);
    return;
  }
  renderDetailList(track);
}

/* ---------------- Player ---------------- */

function playQueue(list: Track[], position: number) {
  queue = list;
  index = position;
  loadTrack(queue[index], true);
}

function loadTrack(track: Track, autoplay: boolean) {
  current = track;
  audio.src = track.src;
  player.classList.remove('disabled');
  nowTitle.textContent = track.title;
  nowArtist.textContent = track.artist;
  nowSrc.textContent = sourceMeta(track, true);
  nowArt.innerHTML = coverMarkup(track, 'md');
  nowOpen.disabled = false;
  likeBtn.disabled = false;
  likeBtn.classList.toggle('liked', liked.has(track.id));
  const live = track.live === true;
  cur.textContent = live ? '' : '0:00';
  seek.value = '0';
  seek.disabled = live;
  paintRange(seek, 0);
  dur.textContent = live ? 'LIVE' : formatTime(track.duration);
  syncPlayingCards();
  onTrackChanged(track);
  savePlayback(true);
  if (autoplay) {
    recordPlay(track);
    void audio.play().catch(() => {
      nowSrc.textContent = 'PLAYBACK FAILED · TRY ANOTHER SONG';
    });
  }
}

function togglePlay() {
  if (!current) {
    if (queue.length) loadTrack(queue[0], true);
    return;
  }
  if (audio.paused) void audio.play().catch(() => {});
  else audio.pause();
}

function step(delta: number) {
  if (!queue.length) return;
  const next = (index + delta + queue.length) % queue.length;
  index = next;
  loadTrack(queue[next], true);
}

audio.addEventListener('play', () => {
  savePlayback(true);
  playBtn.innerHTML = pauseIcon;
  playBtn.setAttribute('aria-label', 'Pause');
  if (detailOpen) {
    detailPlay.innerHTML = pauseIcon;
    detailPlay.setAttribute('aria-label', 'Pause');
  }
  syncPlayingCards();
});

audio.addEventListener('pause', () => {
  savePlayback(true);
  playBtn.innerHTML = playIcon;
  playBtn.setAttribute('aria-label', 'Play');
  if (detailOpen) {
    detailPlay.innerHTML = playIcon;
    detailPlay.setAttribute('aria-label', 'Play');
  }
  syncPlayingCards();
});

audio.addEventListener('loadedmetadata', () => {
  dur.textContent = current?.live ? 'LIVE' : formatTime(audio.duration);
  audio.volume = Number(volume.value);
});

audio.addEventListener('seeked', () => savePlayback(true));

window.addEventListener('pagehide', () => savePlayback(true));

audio.addEventListener('timeupdate', () => {
  savePlayback();
  if (current?.live) return;
  const total = audio.duration || 0;
  cur.textContent = formatTime(audio.currentTime);
  if (total > 0) {
    seek.value = String(Math.round((audio.currentTime / total) * 1000));
    paintRange(seek, audio.currentTime / total);
  }
});

audio.addEventListener('ended', () => {
  if (index + 1 < queue.length) step(1);
  else {
    audio.pause();
    audio.currentTime = 0;
  }
});

audio.addEventListener('error', () => {
  nowSrc.textContent = 'STREAM UNAVAILABLE';
});

playBtn.addEventListener('click', togglePlay);
detailPlay.addEventListener('click', togglePlay);
nowOpen.addEventListener('click', showPlayingList);

el<HTMLButtonElement>('next-btn').addEventListener('click', () => step(1));
el<HTMLButtonElement>('prev-btn').addEventListener('click', () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  step(-1);
});

seek.addEventListener('input', () => {
  if (current?.live) return;
  const total = audio.duration || 0;
  if (!total) return;
  const ratio = Number(seek.value) / 1000;
  audio.currentTime = ratio * total;
  paintRange(seek, ratio);
  cur.textContent = formatTime(audio.currentTime);
});

volume.addEventListener('input', () => {
  const value = Number(volume.value);
  audio.volume = value;
  audio.muted = value === 0;
  if (value > 0) lastVolume = value;
  paintRange(volume, value);
});

muteBtn.addEventListener('click', () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    audio.volume = lastVolume;
    volume.value = String(lastVolume);
  } else {
    lastVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    volume.value = '0';
  }
  paintRange(volume, Number(volume.value));
});

function toggleLike(track: Track, buttons: HTMLButtonElement[]) {
  if (liked.has(track.id)) liked.delete(track.id);
  else liked.set(track.id, track);
  saveLiked();
  buttons.forEach((btn) => btn.classList.toggle('liked', liked.has(track.id)));
  if (currentView === 'library') renderLibrary();
}

likeBtn.addEventListener('click', () => {
  if (!current) return;
  toggleLike(current, [likeBtn, detailLike]);
});

detailLike.addEventListener('click', () => {
  if (!current) return;
  toggleLike(current, [likeBtn, detailLike]);
});

el<HTMLButtonElement>('detail-close').addEventListener('click', closeDetail);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && currentView === 'terms') {
    closeTerms();
    return;
  }
  if (event.key === 'Escape' && detailOpen) {
    closeDetail();
    return;
  }
  if (event.code !== 'Space') return;
  const target = event.target as HTMLElement;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
  event.preventDefault();
  togglePlay();
});

/* ---------------- Views ---------------- */

const views = ['home', 'search', 'library', 'podcasts', 'radio', 'terms'] as const;
type View = (typeof views)[number];

let currentView: View = 'home';
let termsReturn: View = 'home';

// On mobile the top bar shows the EchoX title plus a magnifier; the search
// field only takes over the bar once the magnifier (or Search tab) is tapped.
function setSearchOpen(open: boolean) {
  topbar.classList.toggle('searching', open);
  searchToggle.setAttribute('aria-expanded', String(open));
  if (open) window.setTimeout(() => searchInput.focus(), 30);
  else searchInput.blur();
}

function setView(view: View, nav?: string) {
  currentView = view;
  document.title =
    view === 'terms'
      ? 'Terms & Conditions | echoX'
      : view === 'podcasts'
        ? 'Podcasts | echoX'
        : view === 'radio'
          ? 'Live radio | echoX'
          : 'echoX | Free online music';
  views.forEach((name) => {
    el<HTMLElement>(`view-${name}`).hidden = name !== view;
  });
  const activeNav = nav ?? (view === 'library' ? 'liked' : view);
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === activeNav);
  });
  if (view !== 'search') setSearchOpen(false);
  if (view === 'library') renderLibrary();
  if (view === 'search') {
    searchHint.hidden = searchInput.value.trim().length >= 2;
    if (topbar.classList.contains('searching')) searchInput.focus();
  }
}

function scrollToLibrarySection(section: string) {
  const head = document.getElementById(`${section}-head`);
  if (head && !head.hidden) {
    head.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  window.scrollTo({ top: 0 });
}

document.querySelectorAll<HTMLElement>('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view as View;
    setView(view, btn.dataset.nav);
    if (view === 'search') setSearchOpen(true);
    if (view === 'podcasts') void loadPodcasts();
    if (view === 'radio') void loadRadio();
    closeDetail();
    if (btn.dataset.section) scrollToLibrarySection(btn.dataset.section);
    else window.scrollTo({ top: 0 });
  });
});

searchToggle.addEventListener('click', () => setSearchOpen(true));
searchCancel.addEventListener('click', () => setSearchOpen(false));

/* ---------------- Terms, without interrupting playback ---------------- */

function openTerms() {
  if (currentView !== 'terms') termsReturn = currentView;
  setView('terms');
  closeDetail();
  window.scrollTo({ top: 0 });
}

function closeTerms() {
  setView(termsReturn);
  window.scrollTo({ top: 0 });
}

document.querySelectorAll<HTMLAnchorElement>('[data-open-terms]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openTerms();
  });
});

el<HTMLButtonElement>('terms-close').addEventListener('click', closeTerms);

// The logo jumps back to Home in-page instead of reloading, so audio keeps playing.
document.querySelectorAll<HTMLAnchorElement>('.brand, .mobile-brand').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    setView('home');
    closeDetail();
    window.scrollTo({ top: 0 });
  });
});

/* ---------------- Home ---------------- */

async function loadHome() {
  trendingGrid.innerHTML = skeletonGrid();
  try {
    const tracks = await getTrending(18);
    if (!tracks.length) {
      showStatus(trendingGrid, 'No playable songs right now.');
      return;
    }
    renderGrid(trendingGrid, tracks);
    renderGenreChips(tracks);
  } catch {
    showStatus(trendingGrid, 'Could not reach Audius. Check your connection and reload.', true);
  }
}

/* ---------------- Podcasts & live radio ---------------- */

let podcastShowCache: Show[] = [];
let topRadioCache: Track[] = [];

async function loadPodcastShows(): Promise<Show[]> {
  if (podcastShowCache.length) return podcastShowCache;
  podcastShowCache = await getPodcastShows(12);
  return podcastShowCache;
}

function showPodcastChoices() {
  podcastsBack.hidden = true;
  podcastsHeading.textContent = 'Podcasts';
  podcastsHint.hidden = false;
  podcastsHint.textContent = 'Popular series from Apple Podcasts. Tap a show to see its episodes.';
  renderShowGrid(podcastsGrid, podcastShowCache);
}

async function loadPodcasts() {
  podcastsBack.hidden = true;
  podcastsHeading.textContent = 'Podcasts';
  podcastsHint.hidden = false;
  podcastsHint.textContent = 'Popular series from Apple Podcasts. Tap a show to see its episodes.';
  if (podcastShowCache.length) {
    showPodcastChoices();
    return;
  }
  podcastsGrid.innerHTML = skeletonGrid();
  try {
    await loadPodcastShows();
    if (!podcastShowCache.length) {
      showStatus(podcastsGrid, 'No podcasts available right now.');
      return;
    }
    showPodcastChoices();
  } catch {
    showStatus(podcastsGrid, 'Could not reach Apple Podcasts. Please try again.', true);
  }
}

async function openPodcastShow(show: Show) {
  setView('podcasts', 'podcasts');
  podcastsBack.hidden = false;
  podcastsHeading.textContent = show.title;
  podcastsHint.hidden = false;
  podcastsHint.textContent = show.publisher;
  podcastsGrid.innerHTML = skeletonGrid();
  window.scrollTo({ top: 0 });
  try {
    const episodes = await getPodcastEpisodes(show.id);
    if (!episodes.length) {
      showStatus(podcastsGrid, 'No episodes available for this show.');
      return;
    }
    renderGrid(podcastsGrid, episodes);
  } catch {
    showStatus(podcastsGrid, 'Could not load episodes. Please try again.', true);
  }
}

podcastsBack.addEventListener('click', () => void loadPodcasts());

async function loadTopRadio(): Promise<Track[]> {
  if (topRadioCache.length) return topRadioCache;
  topRadioCache = await getRadioStations(10, 0);
  return topRadioCache;
}

// Room for the filters (HTTPS-only, no HLS) so each page still shows ~20.
const RADIO_PAGE = 28;
let radioStations: Track[] = [];
let radioOffset = 0;
let radioLoading = false;
let radioDone = false;

function renderRadioStations() {
  radioGrid.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  radioStations.forEach((station, i) => grid.append(makeCard(station, radioStations, i)));
  radioGrid.append(grid);
  syncPlayingCards();
}

async function loadRadio(reset = true) {
  if (radioLoading) return;
  if (reset) {
    radioStations = [];
    radioOffset = 0;
    radioDone = false;
    radioGrid.innerHTML = skeletonGrid();
    radioMore.hidden = true;
  } else if (radioDone) {
    return;
  }

  radioLoading = true;
  if (!reset) {
    radioMore.disabled = true;
    radioMore.textContent = 'Loading…';
  }
  try {
    const batch = await getRadioStations(RADIO_PAGE, radioOffset);
    radioOffset += RADIO_PAGE;
    radioStations = [...radioStations, ...batch];
    if (!radioStations.length) {
      showStatus(radioGrid, 'No live stations available right now.');
      radioDone = true;
    } else {
      renderRadioStations();
      radioDone = batch.length === 0;
    }
  } catch {
    if (!radioStations.length) {
      showStatus(radioGrid, 'Could not reach Radio Browser. Please try again.', true);
    }
  } finally {
    radioLoading = false;
    radioMore.disabled = false;
    radioMore.textContent = 'Load more stations';
    radioMore.hidden = radioDone || radioStations.length === 0;
  }
}

radioMore.addEventListener('click', () => void loadRadio(false));

function renderHomePlayAgain() {
  const recent = history.slice(0, 6);
  homePlayAgainHead.hidden = recent.length === 0;
  homePlayAgain.hidden = recent.length === 0;
  homePlayAgain.innerHTML = '';
  if (recent.length) renderGrid(homePlayAgain, recent.map((entry) => entry.track));
}

async function loadHomeExtras() {
  renderHomePlayAgain();
  try {
    const shows = await loadPodcastShows();
    const hasShows = shows.length > 0;
    homePodcastsHead.hidden = !hasShows;
    homePodcasts.hidden = !hasShows;
    homePodcasts.innerHTML = '';
    if (hasShows) renderShowGrid(homePodcasts, shows.slice(0, 6));
  } catch {
    homePodcastsHead.hidden = true;
    homePodcasts.hidden = true;
  }
  try {
    const stations = await loadTopRadio();
    const hasStations = stations.length > 0;
    homeRadioHead.hidden = !hasStations;
    homeRadio.hidden = !hasStations;
    homeRadio.innerHTML = '';
    if (hasStations) renderGrid(homeRadio, stations.slice(0, 6));
  } catch {
    homeRadioHead.hidden = true;
    homeRadio.hidden = true;
  }
}

function renderGenreChips(tracks: Track[]) {
  const genres = [...new Set(tracks.map((t) => t.genre).filter(Boolean))].slice(0, 6) as string[];
  genreChips.innerHTML = '';
  genres.forEach((genre) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = genre;
    chip.addEventListener('click', () => {
      searchInput.value = genre;
      void runSearch(genre);
    });
    genreChips.append(chip);
  });
}

/* ---------------- Search ---------------- */

async function runSearch(rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) {
    setView('home');
    return;
  }

  setView('search');
  closeDetail();
  searchHint.hidden = true;
  searchHeading.textContent = `Results for “${query}”`;
  const containers = [audiusResults, deezerResults, itunesResults, podcastResults, radioResults];
  containers.forEach((container) => (container.innerHTML = skeletonGrid()));

  const [audius, deezer, itunes, podcasts, radio] = await Promise.allSettled([
    searchAudius(query),
    searchDeezer(query),
    searchItunes(query),
    searchPodcasts(query),
    searchRadio(query),
  ]);

  renderResults(audius, audiusResults, 'No full tracks matched on Audius.', 'Audius search failed. Please try again.');
  renderResults(deezer, deezerResults, 'No previews matched on Deezer.', 'Deezer search failed. Please try again.');
  renderResults(itunes, itunesResults, 'No previews matched on iTunes.', 'iTunes search failed. Please try again.');
  renderResults(podcasts, podcastResults, 'No podcast episodes matched.', 'Podcast search failed. Please try again.');
  renderResults(radio, radioResults, 'No live radio stations matched.', 'Radio search failed. Please try again.');
}

function renderResults(
  result: PromiseSettledResult<Track[]>,
  container: HTMLElement,
  emptyMessage: string,
  failedMessage: string
) {
  if (result.status === 'fulfilled' && result.value.length) {
    renderGrid(container, result.value);
    return;
  }
  const failed = result.status === 'rejected';
  showStatus(container, failed ? failedMessage : emptyMessage, failed);
}

searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  const value = searchInput.value;
  searchTimer = window.setTimeout(() => void runSearch(value), 400);
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    window.clearTimeout(searchTimer);
    void runSearch(searchInput.value);
  }
  if (event.key === 'Escape') {
    searchInput.value = '';
    setView('home');
    closeDetail();
  }
});

/* ---------------- Library ---------------- */

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function makeHistoryRow(entry: HistoryEntry, list: Track[], position: number): HTMLButtonElement {
  const track = entry.track;
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row';
  row.dataset.trackId = track.id;
  row.classList.toggle('playing', track.id === current?.id);
  row.innerHTML = `
    <span class="row-index">${position + 1}</span>
    <span class="row-art">${coverMarkup(track, 'sm')}</span>
    <span class="row-info">
      <span class="row-title">${escapeHtml(track.title)}</span>
      <span class="row-artist">${escapeHtml(track.artist)}</span>
    </span>
    <span class="row-dur">${timeAgo(entry.playedAt)}</span>
    <span class="row-play">${playIcon}</span>
  `;
  row.addEventListener('click', () => {
    playQueue(list, position);
    void openDetail(track);
  });
  return row;
}

function renderLibrary() {
  const recent = history.slice(0, 6);
  playAgainHead.hidden = recent.length === 0;
  playAgainGrid.hidden = recent.length === 0;
  playAgainGrid.innerHTML = '';
  if (recent.length) renderGrid(playAgainGrid, recent.map((entry) => entry.track));

  const most = [...stats.values()]
    .sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed)
    .slice(0, 8);
  mostPlayedHead.hidden = most.length === 0;
  mostPlayedGrid.hidden = most.length === 0;
  mostPlayedGrid.innerHTML = '';
  if (most.length) renderGrid(mostPlayedGrid, most.map((stat) => stat.track));

  const entries = history.slice(0, 16);
  const recentTracks = entries.map((entry) => entry.track);
  historyHead.hidden = entries.length === 0;
  historyList.hidden = entries.length === 0;
  historyList.innerHTML = '';
  entries.forEach((entry, i) => historyList.append(makeHistoryRow(entry, recentTracks, i)));

  const tracks = [...liked.values()].reverse();
  likedStatus.hidden = tracks.length > 0;
  likedGrid.innerHTML = '';
  if (tracks.length) renderGrid(likedGrid, tracks);

  syncPlayingCards();
}

/* ---------------- Init ---------------- */

export function init() {
  audio.volume = 0.8;
  paintRange(volume, 0.8);
  paintRange(seek, 0);
  playBtn.innerHTML = playIcon;
  detailPlay.innerHTML = playIcon;
  setView('home');
  renderLibrary();
  restorePlayback();
  void loadHome();
  void loadHomeExtras();
}
