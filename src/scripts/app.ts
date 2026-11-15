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
const VOLUME_KEY = 'echox:volume';
const HISTORY_MAX = 40;
const STATS_MAX = 200;
const LIKED_MAX = 200;
const TRACK_SOURCES = new Set(['audius', 'deezer', 'itunes', 'podcast', 'radio']);

const playIcon =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
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
const fullBtn = el<HTMLButtonElement>('full-btn');
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

const np = el<HTMLElement>('np');
const npAmbient = el<HTMLDivElement>('np-ambient');
const npArt = el<HTMLDivElement>('np-art');
const npTitle = el<HTMLHeadingElement>('np-title');
const npArtist = el<HTMLParagraphElement>('np-artist');
const npSource = el<HTMLSpanElement>('np-source');
const npDesc = el<HTMLParagraphElement>('np-desc');
const npInfo = el<HTMLDListElement>('np-info');
const npFacts = el<HTMLElement>('np-facts');
const npFactsTitle = el<HTMLHeadingElement>('np-facts-title');
const npLink = el<HTMLAnchorElement>('np-link');
const npLike = el<HTMLButtonElement>('np-like');
const npPlay = el<HTMLButtonElement>('np-play');
const npSeek = el<HTMLInputElement>('np-seek');
const npCur = el<HTMLSpanElement>('np-cur');
const npDur = el<HTMLSpanElement>('np-dur');
const npProgress = el<HTMLElement>('np-progress');
const npDetail = el<HTMLButtonElement>('np-detail');
const npClose = el<HTMLButtonElement>('np-close');
const npPrev = el<HTMLButtonElement>('np-prev');
const npNext = el<HTMLButtonElement>('np-next');

const trendingGrid = el<HTMLDivElement>('trending-grid');
const genreChips = el<HTMLDivElement>('genre-chips');
const searchInput = el<HTMLInputElement>('search-input');
const searchHeading = el<HTMLHeadingElement>('search-heading');
const searchHint = el<HTMLParagraphElement>('search-hint');
const audiusHead = el<HTMLDivElement>('audius-head');
const deezerHead = el<HTMLDivElement>('deezer-head');
const itunesHead = el<HTMLDivElement>('itunes-head');
const podcastHead = el<HTMLDivElement>('podcast-head');
const radioHead = el<HTMLDivElement>('radio-head');
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
let searchSeq = 0;
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
    if (!Array.isArray(list)) return [];
    return list
      .filter(isTrack)
      .slice(-LIKED_MAX)
      .map((track) => [track.id, track] as [string, Track]);
  } catch {
    return [];
  }
}

function saveLiked() {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...liked.values()]));
  } catch {
    /* storage full or blocked: keep the in-memory likes */
  }
}

function loadVolume(): number {
  const stored = readStore<number | null>(VOLUME_KEY, null);
  return typeof stored === 'number' && Number.isFinite(stored) && stored >= 0 && stored <= 1
    ? stored
    : 0.8;
}

function saveVolume(value: number) {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(value));
  } catch {
    /* storage blocked: the volume still applies for this session */
  }
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
    typeof track.src === 'string' &&
    typeof track.source === 'string' &&
    TRACK_SOURCES.has(track.source)
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

  const startAt = Math.max(0, Number(saved.time) || 0);
  const resume = () => {
    if (startAt > 0 && Number.isFinite(audio.duration) && startAt < audio.duration - 1) {
      audio.currentTime = startAt;
    }
    if (saved.playing) {
      // Browsers may block autoplay; the song stays loaded and paused.
      void audio.play().catch(() => {
        nowSrc.textContent = 'PAUSED · TAP PLAY TO RESUME';
      });
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
  return `${fallback}<img loading="lazy" src="${escapeHtml(track.artwork)}" alt="" data-cover />`;
}

// A broken cover reveals the branded fallback behind it. One capture-phase
// listener replaces per-image inline handlers, which a strict CSP would block.
document.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.hasAttribute('data-cover')) {
      target.style.display = 'none';
    }
  },
  true
);

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
  // Detail, history and queue rows share the same playing state as the cards.
  document.querySelectorAll<HTMLElement>('.row').forEach((row) => {
    const playing = row.dataset.trackId === current?.id;
    row.classList.toggle('playing', playing);
    const play = row.querySelector<HTMLElement>('.row-play');
    if (play) play.innerHTML = playing && !audio.paused ? pauseIcon : playIcon;
  });
}

/* ---------------- Expanded detail panel ---------------- */

async function openDetail(track: Track) {
  detailOpen = true;
  detail.hidden = false;
  syncVibe();
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
  // Drop the cached artist list so reopening the panel always matches the
  // track that is actually playing.
  detailTracks = [];
  syncVibe();
}

// The panel background only moves while audio is actually running.
function syncVibe() {
  detail.classList.toggle('is-playing', detailOpen && !audio.paused);
}

/* ---------------- Full-screen now playing ---------------- */

function renderNowPlaying(track: Track) {
  np.classList.toggle('is-live', track.live === true);
  npArt.innerHTML = coverMarkup(track, 'lg');
  npAmbient.style.backgroundImage = track.artwork ? `url(${JSON.stringify(track.artwork)})` : 'none';
  npTitle.textContent = track.title;
  npArtist.textContent = track.artist;
  npSource.textContent = track.live ? `${sourceMeta(track)} · on air` : sourceMeta(track);
  npDesc.textContent = track.description ?? '';
  npDesc.hidden = !track.description;
  npLike.disabled = false;
  npLike.classList.toggle('liked', liked.has(track.id));
  npDetail.textContent = track.live ? 'More live stations in this country' : 'More from this artist';
  npProgress.hidden = track.live === true;
  npCur.textContent = '0:00';
  npDur.textContent = track.live ? 'LIVE' : formatTime(track.duration);
  paintRange(npSeek, 0);
  npLink.hidden = !track.link;
  if (track.link) {
    npLink.href = track.link;
    npLink.textContent = `${track.linkLabel ?? 'Open source'} ↗`;
  }

  const facts = track.info ?? [];
  npFacts.hidden = facts.length === 0;
  npFactsTitle.textContent = track.live
    ? 'Station details'
    : track.source === 'podcast'
      ? 'Episode details'
      : 'Track details';
  npInfo.innerHTML = facts
    .map(
      (fact) =>
        `<div class="np-fact"><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`
    )
    .join('');

  syncNowPlaying();
}

function syncNowPlaying() {
  const playing = !audio.paused;
  npPlay.innerHTML = playing ? pauseIcon : playIcon;
  npPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

let npReturnFocus: HTMLElement | null = null;

function openNowPlaying() {
  if (!current) return;
  renderNowPlaying(current);
  npReturnFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  np.hidden = false;
  document.body.classList.add('np-open');
  npClose.focus({ preventScroll: true });
}

function closeNowPlaying() {
  if (np.hidden) return;
  np.hidden = true;
  document.body.classList.remove('np-open');
  npReturnFocus?.focus({ preventScroll: true });
  npReturnFocus = null;
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
  if (!np.hidden) renderNowPlaying(track);
  if (!detailOpen) return;
  // A new artist needs a fresh list; otherwise just move the highlight.
  if (artistKey(track) !== detailKey) {
    void openDetail(track);
    return;
  }
  renderDetailHead(track);
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
  fullBtn.disabled = false;
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
  if (current) nowSrc.textContent = sourceMeta(current, true);
  savePlayback(true);
  syncVibe();
  syncNowPlaying();
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
  syncVibe();
  syncNowPlaying();
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
  if (!np.hidden) npDur.textContent = current?.live ? 'LIVE' : formatTime(audio.duration);
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
  if (!np.hidden) {
    npCur.textContent = formatTime(audio.currentTime);
    if (total > 0) {
      const ratio = audio.currentTime / total;
      npSeek.value = String(Math.round(ratio * 1000));
      paintRange(npSeek, ratio);
    }
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
nowOpen.addEventListener('click', (event) => {
  // The cover opens the full-screen player; the title still opens the artist list.
  if ((event.target as HTMLElement).closest('.now-art')) {
    openNowPlaying();
    return;
  }
  showPlayingList();
});

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
  saveVolume(value);
  paintRange(volume, value);
  syncMuteIcon();
});

// The paths sit slightly off the viewBox centre, so nudge each set to keep the
// glyph in the middle of the round button.
const speakerIcon =
  '<g transform="translate(1.3 0)"><path d="M4 9.5h3L12 5v14L7 14.5H4z" /><path d="M16 9a4 4 0 0 1 0 6" /></g>';
const mutedIcon =
  '<g transform="translate(-0.25 0)"><path d="M4 9.5h3L12 5v14L7 14.5H4z" /><path d="m16.5 9.5 4 4" /><path d="m20.5 9.5-4 4" /></g>';

function syncMuteIcon() {
  const muted = audio.muted || audio.volume === 0;
  muteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${muted ? mutedIcon : speakerIcon}</svg>`;
  muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  muteBtn.classList.toggle('muted', muted);
}

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
  syncMuteIcon();
});

function toggleLike(track: Track, buttons: HTMLButtonElement[]) {
  if (liked.has(track.id)) {
    liked.delete(track.id);
  } else {
    liked.set(track.id, track);
    // Keep memory and storage on the same limit, dropping the oldest like.
    while (liked.size > LIKED_MAX) {
      const oldest = liked.keys().next().value;
      if (oldest === undefined) break;
      liked.delete(oldest);
    }
  }
  saveLiked();
  const isLiked = liked.has(track.id);
  buttons.forEach((btn) => btn.classList.toggle('liked', isLiked));
  npLike.classList.toggle('liked', isLiked);
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

npLike.addEventListener('click', () => {
  if (!current) return;
  toggleLike(current, [likeBtn, detailLike]);
});

fullBtn.addEventListener('click', openNowPlaying);
npClose.addEventListener('click', closeNowPlaying);
npPlay.addEventListener('click', togglePlay);
npDetail.addEventListener('click', () => {
  closeNowPlaying();
  showPlayingList();
});

npSeek.addEventListener('input', () => {
  if (current?.live) return;
  const total = audio.duration || 0;
  if (!total) return;
  const ratio = Number(npSeek.value) / 1000;
  audio.currentTime = ratio * total;
  paintRange(npSeek, ratio);
  npCur.textContent = formatTime(audio.currentTime);
});

npPrev.addEventListener('click', () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  step(-1);
});
npNext.addEventListener('click', () => step(1));

// Keep keyboard focus inside the modal while it is open.
np.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [
    ...np.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((node) => node.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

el<HTMLButtonElement>('detail-close').addEventListener('click', closeDetail);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !np.hidden) {
    closeNowPlaying();
    return;
  }
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

// Searching from Podcasts or Radio limits the results to that source; from
// anywhere else every source is searched, songs first.
type SearchScope = 'all' | 'podcast' | 'radio';
let searchScope: SearchScope = 'all';

function scopeFromView(view: View): SearchScope {
  if (view === 'podcasts') return 'podcast';
  if (view === 'radio') return 'radio';
  return 'all';
}

function applySearchScope() {
  const songs = searchScope === 'all';
  const podcasts = searchScope === 'all' || searchScope === 'podcast';
  const radio = searchScope === 'all' || searchScope === 'radio';

  audiusHead.hidden = !songs;
  deezerHead.hidden = !songs;
  itunesHead.hidden = !songs;
  audiusResults.hidden = !songs;
  deezerResults.hidden = !songs;
  itunesResults.hidden = !songs;
  podcastHead.hidden = !podcasts;
  podcastResults.hidden = !podcasts;
  radioHead.hidden = !radio;
  radioResults.hidden = !radio;

  searchInput.placeholder =
    searchScope === 'podcast'
      ? 'Search podcast episodes…'
      : searchScope === 'radio'
        ? 'Search live radio…'
        : 'Search songs, artists, genres…';
  searchHint.textContent =
    searchScope === 'podcast'
      ? 'Type at least 2 characters to search podcast episodes.'
      : searchScope === 'radio'
        ? 'Type at least 2 characters to search live radio stations.'
        : 'Type at least 2 characters to search full tracks, Deezer and iTunes previews, podcast episodes and live radio.';
}

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

// The magnifier in the top bar opens the dedicated search page (the one the
// old bottom-navigation Search tab used to show) instead of a bare field.
function openSearchPage() {
  const nextScope = currentView === 'search' ? searchScope : scopeFromView(currentView);
  const scopeChanged = nextScope !== searchScope;
  searchScope = nextScope;
  applySearchScope();
  setView('search');
  setSearchOpen(true);

  // Coming from another view can change the sources; refresh the old query
  // instead of leaving results from the previous scope on screen.
  const query = searchInput.value.trim();
  if (scopeChanged && query.length >= 2) {
    void runSearch(query);
    return;
  }
  if (scopeChanged) {
    // Drop any response still in flight from the previous scope.
    searchSeq += 1;
    searchHeading.textContent =
      searchScope === 'podcast'
        ? 'Search podcasts'
        : searchScope === 'radio'
          ? 'Search live radio'
          : 'Search results';
    searchHint.hidden = query.length >= 2;
    [audiusResults, deezerResults, itunesResults, podcastResults, radioResults].forEach(
      (container) => (container.innerHTML = '')
    );
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
    if (view === 'search') {
      openSearchPage();
    } else {
      setView(view, btn.dataset.nav);
      if (view === 'podcasts') void loadPodcasts();
      if (view === 'radio') void loadRadio();
    }
    closeDetail();
    if (btn.dataset.section) scrollToLibrarySection(btn.dataset.section);
    else window.scrollTo({ top: 0 });
  });
});

searchToggle.addEventListener('click', openSearchPage);
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
  // Only the newest search may paint results: slower responses from an older
  // query are discarded instead of overwriting fresher ones.
  const seq = ++searchSeq;

  // Starting a search from another view inherits that view's sources.
  if (currentView !== 'search') {
    searchScope = scopeFromView(currentView);
    applySearchScope();
  }

  if (query.length < 2) {
    setView('search');
    searchHint.hidden = false;
    searchHeading.textContent =
      searchScope === 'podcast'
        ? 'Search podcasts'
        : searchScope === 'radio'
          ? 'Search live radio'
          : 'Search results';
    [audiusResults, deezerResults, itunesResults, podcastResults, radioResults].forEach(
      (container) => (container.innerHTML = '')
    );
    return;
  }

  setView('search');
  closeDetail();
  searchHint.hidden = true;
  const label =
    searchScope === 'podcast' ? 'Podcast results' : searchScope === 'radio' ? 'Radio results' : 'Results';
  searchHeading.textContent = `${label} for “${query}”`;

  const wantSongs = searchScope === 'all';
  const wantPodcasts = searchScope !== 'radio';
  const wantRadio = searchScope !== 'podcast';

  if (wantSongs) {
    [audiusResults, deezerResults, itunesResults].forEach((container) => (container.innerHTML = skeletonGrid()));
  }
  if (wantPodcasts) podcastResults.innerHTML = skeletonGrid();
  if (wantRadio) radioResults.innerHTML = skeletonGrid();

  const [audius, deezer, itunes, podcasts, radio] = await Promise.allSettled([
    wantSongs ? searchAudius(query) : Promise.resolve<Track[]>([]),
    wantSongs ? searchDeezer(query) : Promise.resolve<Track[]>([]),
    wantSongs ? searchItunes(query) : Promise.resolve<Track[]>([]),
    wantPodcasts ? searchPodcasts(query) : Promise.resolve<Track[]>([]),
    wantRadio ? searchRadio(query) : Promise.resolve<Track[]>([]),
  ]);

  if (seq !== searchSeq) return;

  if (wantSongs) {
    renderResults(audius, audiusResults, 'No full tracks matched on Audius.', 'Audius search failed. Please try again.');
    renderResults(deezer, deezerResults, 'No previews matched on Deezer.', 'Deezer search failed. Please try again.');
    renderResults(itunes, itunesResults, 'No previews matched on iTunes.', 'iTunes search failed. Please try again.');
  }
  if (wantPodcasts) {
    renderResults(podcasts, podcastResults, 'No podcast episodes matched.', 'Podcast search failed. Please try again.');
  }
  if (wantRadio) {
    renderResults(radio, radioResults, 'No live radio stations matched.', 'Radio search failed. Please try again.');
  }
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
  const storedVolume = loadVolume();
  lastVolume = storedVolume > 0 ? storedVolume : 0.8;
  audio.volume = storedVolume;
  audio.muted = storedVolume === 0;
  volume.value = String(storedVolume);
  paintRange(volume, storedVolume);
  syncMuteIcon();
  paintRange(seek, 0);
  playBtn.innerHTML = playIcon;
  detailPlay.innerHTML = playIcon;
  setView('home');
  renderLibrary();
  restorePlayback();
  void loadHome();
  void loadHomeExtras();
}
