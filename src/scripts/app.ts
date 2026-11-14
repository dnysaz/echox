import {
  formatTime,
  getArtistTracks,
  getTrending,
  searchAudius,
  searchItunes,
  type Track,
} from '../lib/api';

const LIKED_KEY = 'echox:liked';

const playIcon =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
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

const trendingGrid = el<HTMLDivElement>('trending-grid');
const genreChips = el<HTMLDivElement>('genre-chips');
const searchInput = el<HTMLInputElement>('search-input');
const searchHeading = el<HTMLHeadingElement>('search-heading');
const searchHint = el<HTMLParagraphElement>('search-hint');
const audiusResults = el<HTMLDivElement>('audius-results');
const itunesResults = el<HTMLDivElement>('itunes-results');
const likedGrid = el<HTMLDivElement>('liked-grid');
const likedStatus = el<HTMLDivElement>('liked-status');

let queue: Track[] = [];
let index = -1;
let current: Track | null = null;
let searchTimer: number | undefined;
let lastVolume = 0.8;
let detailOpen = false;
let detailKey: string | null = null;
let detailTracks: Track[] = [];

const liked = new Map<string, Track>(loadLiked());

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

function coverMarkup(track: Track, size: 'sm' | 'md' | 'lg'): string {
  const fallback = `<span class="art-fallback art-fallback-${size}" aria-hidden="true">
    <span class="art-fallback-mark">♪</span>
    <span class="art-fallback-word">EchoX</span>
  </span>`;
  if (!track.artwork) return fallback;
  return `${fallback}<img loading="lazy" src="${escapeHtml(track.artwork)}" alt="" onerror="this.style.display='none'">`;
}

function artistKey(track: Track): string {
  return track.source === 'audius'
    ? `audius:${track.artistHandle ?? track.artist}`
    : `itunes:${track.artistId ?? track.artist}`;
}

/* ---------------- Cards ---------------- */

function makeCard(track: Track, list: Track[], position: number): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.dataset.trackId = track.id;
  card.innerHTML = `
    <div class="card-art">
      ${coverMarkup(track, 'md')}
      <span class="badge-src${track.source === 'itunes' ? ' preview' : ''}">
        ${track.source === 'itunes' ? 'PREVIEW' : 'FULL'}
      </span>
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
    void openDetail(track);
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
  detailKey = key;
  detailCount.textContent = '';
  detailList.innerHTML = `<div class="row-skeleton"></div><div class="row-skeleton"></div><div class="row-skeleton"></div>`;

  try {
    const tracks = await getArtistTracks(track);
    if (detailKey !== key || !detailOpen) return;
    detailTracks = tracks.length ? tracks : [track];
    renderDetailList(track);
  } catch {
    if (detailKey !== key) return;
    detailTracks = [track];
    showStatus(detailList, 'Could not load more songs from this artist.', true);
    detailCount.textContent = '';
  }
}

function renderDetailHead(track: Track) {
  detailArt.innerHTML = coverMarkup(track, 'lg');
  detailTitle.textContent = track.title;
  detailArtist.textContent = track.artist;
  detailArtistName.textContent = track.artist;
  detailMeta.textContent =
    track.source === 'audius' ? 'Audius · full track' : 'Apple Music · 30s preview';
  detailPlay.innerHTML = audio.paused ? playIcon : pauseIcon;
  detailPlay.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
  detailLike.classList.toggle('liked', liked.has(track.id));
}

function renderDetailList(active: Track) {
  detailCount.textContent = `${detailTracks.length} ${detailTracks.length === 1 ? 'song' : 'songs'}`;
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
      <span class="row-dur">${formatTime(track.duration)}</span>
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
  nowSrc.textContent =
    track.source === 'audius' ? 'AUDIUS · FULL TRACK' : 'APPLE MUSIC · 30S PREVIEW';
  nowArt.innerHTML = coverMarkup(track, 'md');
  likeBtn.disabled = false;
  likeBtn.classList.toggle('liked', liked.has(track.id));
  cur.textContent = '0:00';
  seek.value = '0';
  paintRange(seek, 0);
  dur.textContent = formatTime(track.duration);
  syncPlayingCards();
  onTrackChanged(track);
  if (autoplay) {
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
  playBtn.innerHTML = pauseIcon;
  playBtn.setAttribute('aria-label', 'Pause');
  if (detailOpen) {
    detailPlay.innerHTML = pauseIcon;
    detailPlay.setAttribute('aria-label', 'Pause');
  }
  syncPlayingCards();
});

audio.addEventListener('pause', () => {
  playBtn.innerHTML = playIcon;
  playBtn.setAttribute('aria-label', 'Play');
  if (detailOpen) {
    detailPlay.innerHTML = playIcon;
    detailPlay.setAttribute('aria-label', 'Play');
  }
  syncPlayingCards();
});

audio.addEventListener('loadedmetadata', () => {
  dur.textContent = formatTime(audio.duration);
  audio.volume = Number(volume.value);
});

audio.addEventListener('timeupdate', () => {
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

el<HTMLButtonElement>('next-btn').addEventListener('click', () => step(1));
el<HTMLButtonElement>('prev-btn').addEventListener('click', () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  step(-1);
});

seek.addEventListener('input', () => {
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
  renderLiked();
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

const views = ['home', 'search', 'library'] as const;
type View = (typeof views)[number];

function setView(view: View) {
  views.forEach((name) => {
    el<HTMLElement>(`view-${name}`).hidden = name !== view;
  });
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  if (view === 'search') {
    searchHint.hidden = searchInput.value.trim().length >= 2;
    searchInput.focus();
  }
}

document.querySelectorAll<HTMLElement>('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setView(btn.dataset.view as View);
    closeDetail();
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
  audiusResults.innerHTML = skeletonGrid();
  itunesResults.innerHTML = skeletonGrid();

  const [audius, itunes] = await Promise.allSettled([
    searchAudius(query),
    searchItunes(query),
  ]);

  if (audius.status === 'fulfilled' && audius.value.length) {
    renderGrid(audiusResults, audius.value);
  } else {
    showStatus(
      audiusResults,
      audius.status === 'rejected'
        ? 'Audius search failed. Please try again.'
        : 'No full tracks matched on Audius.',
      audius.status === 'rejected'
    );
  }

  if (itunes.status === 'fulfilled' && itunes.value.length) {
    renderGrid(itunesResults, itunes.value);
  } else {
    showStatus(
      itunesResults,
      itunes.status === 'rejected'
        ? 'iTunes search failed. Please try again.'
        : 'No previews matched on iTunes.',
      itunes.status === 'rejected'
    );
  }
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

function renderLiked() {
  const tracks = [...liked.values()].reverse();
  likedStatus.hidden = tracks.length > 0;
  likedGrid.innerHTML = '';
  if (tracks.length) renderGrid(likedGrid, tracks);
}

/* ---------------- Init ---------------- */

export function init() {
  audio.volume = 0.8;
  paintRange(volume, 0.8);
  paintRange(seek, 0);
  playBtn.innerHTML = playIcon;
  detailPlay.innerHTML = playIcon;
  setView('home');
  renderLiked();
  void loadHome();
}
