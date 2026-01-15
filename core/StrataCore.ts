
import { EventBus } from './EventBus';
import { NanoStore } from './NanoStore';
import { AudioEngine } from './AudioEngine';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'loading';
  duration?: number; // ms, if null then persistent
  progress?: number; // 0-100
}

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  buffered: { start: number; end: number }[];
  volume: number;
  isMuted: boolean;
  audioGain: number;
  playbackRate: number;
  qualityLevels: { height: number; bitrate: number; index: number }[];
  currentQuality: number;
  audioTracks: { label: string; language: string; index: number }[];
  currentAudioTrack: number;
  error: string | null;
  isFullscreen: boolean;
  isPip: boolean;
  subtitleTracks: { label: string; language: string; index: number }[];
  currentSubtitle: number;
  viewMode: 'normal' | 'theater' | 'pip';
  notifications: Notification[];
}

const STORAGE_KEY = 'strata-settings-v1';

const getSavedSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return {};
};

const saved = getSavedSettings();

export const INITIAL_STATE: PlayerState = {
  isPlaying: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  buffered: [],
  volume: saved.volume ?? 1,
  isMuted: saved.isMuted ?? false,
  audioGain: saved.audioGain ?? 1,
  playbackRate: saved.playbackRate ?? 1,
  qualityLevels: [],
  currentQuality: -1,
  audioTracks: [],
  currentAudioTrack: -1,
  error: null,
  isFullscreen: false,
  isPip: false,
  subtitleTracks: [],
  currentSubtitle: -1,
  viewMode: 'normal',
  notifications: []
};

export interface IPlugin {
  name: string;
  init(core: StrataCore): void;
  destroy?(): void;
}

export class StrataCore {
  public video: HTMLVideoElement;
  public container: HTMLElement | null = null;
  public events: EventBus;
  public store: NanoStore<PlayerState>;
  private plugins: Map<string, IPlugin> = new Map();
  private audioEngine: AudioEngine;

  // Retry Logic
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimer: any = null;
  private currentSrc: string = '';

  constructor(videoElement?: HTMLVideoElement) {
    this.video = videoElement || document.createElement('video');
    this.video.crossOrigin = "anonymous";
    this.events = new EventBus();
    this.store = new NanoStore(INITIAL_STATE);
    this.audioEngine = new AudioEngine(this.video);

    this.video.volume = INITIAL_STATE.volume;
    this.video.muted = INITIAL_STATE.isMuted;
    this.video.playbackRate = INITIAL_STATE.playbackRate;
    if (INITIAL_STATE.audioGain > 1) {
      this.audioEngine.setGain(INITIAL_STATE.audioGain);
    }

    this.initVideoListeners();

    this.store.subscribe((state) => {
      const settings = {
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
        audioGain: state.audioGain
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    });
  }

  private initVideoListeners() {
    const s = (partial: Partial<PlayerState>) => this.store.setState(partial);

    this.video.addEventListener('play', () => s({ isPlaying: true }));
    this.video.addEventListener('pause', () => s({ isPlaying: false }));
    this.video.addEventListener('ended', () => s({ isPlaying: false }));
    this.video.addEventListener('waiting', () => s({ isBuffering: true }));
    this.video.addEventListener('playing', () => s({ isBuffering: false }));
    this.video.addEventListener('loadeddata', () => {
      s({ isBuffering: false });
      this.retryCount = 0; // Reset retries on success
      this.removeNotification('retry');
    });
    this.video.addEventListener('canplay', () => s({ isBuffering: false }));

    this.video.addEventListener('timeupdate', () => s({ currentTime: this.video.currentTime }));
    this.video.addEventListener('durationchange', () => s({ duration: this.video.duration }));
    this.video.addEventListener('volumechange', () => s({ volume: this.video.volume, isMuted: this.video.muted }));
    this.video.addEventListener('ratechange', () => s({ playbackRate: this.video.playbackRate }));

    this.video.addEventListener('error', () => this.handleError());

    this.video.addEventListener('progress', this.updateBuffer.bind(this));

    this.video.addEventListener('enterpictureinpicture', () => s({ isPip: true }));
    this.video.addEventListener('leavepictureinpicture', () => s({ isPip: false }));

    this.video.textTracks.addEventListener('addtrack', this.updateSubtitles.bind(this));
    this.video.textTracks.addEventListener('removetrack', this.updateSubtitles.bind(this));
  }

  private handleError() {
    const error = this.video.error;
    const code = error?.code;
    const message = error?.message;

    // Aborted or Decoded errors usually don't need retry unless source is bad, 
    // Network (2) and SrcNotSupported (4) are candidates.
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount) * 1000;

      this.notify({
        id: 'retry',
        type: 'loading',
        message: `Playback error. Retrying attempt ${this.retryCount}/${this.maxRetries}...`,
        duration: delay + 500
      });

      console.warn(`[StrataPlayer] Error ${code}: ${message}. Retrying in ${delay}ms...`);

      this.retryTimer = setTimeout(() => {
        // Reload source
        const time = this.video.currentTime;
        this.load(this.currentSrc);
        this.video.currentTime = time;
      }, delay);
    } else {
      this.removeNotification('retry');
      this.store.setState({ error: `Failed to load video: ${message || 'Unknown error'}` });
    }
  }

  private updateBuffer() {
    const buffered: { start: number; end: number }[] = [];
    for (let i = 0; i < this.video.buffered.length; i++) {
      buffered.push({
        start: this.video.buffered.start(i),
        end: this.video.buffered.end(i)
      });
    }
    this.store.setState({ buffered });
  }

  private updateSubtitles() {
    const tracks = Array.from(this.video.textTracks).map((track, index) => ({
      label: track.label || `Track ${index + 1}`,
      language: track.language,
      index: index
    }));
    this.store.setState({ subtitleTracks: tracks });
  }

  // --- Notification System ---

  notify(n: Omit<Notification, 'id'> & { id?: string }) {
    const id = n.id || Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { ...n, id };

    const current = this.store.get().notifications;
    // Replace if id exists, else push
    const index = current.findIndex(x => x.id === id);
    let updated = [];
    if (index >= 0) {
      updated = [...current];
      updated[index] = newNotification;
    } else {
      updated = [...current, newNotification];
    }

    this.store.setState({ notifications: updated });

    if (n.duration) {
      setTimeout(() => {
        this.removeNotification(id);
      }, n.duration);
    }
    return id;
  }

  removeNotification(id: string) {
    const current = this.store.get().notifications;
    this.store.setState({ notifications: current.filter(n => n.id !== id) });
  }

  // --- Core Methods ---

  attach(container: HTMLElement) {
    this.container = container;
    if (!this.container.contains(this.video)) {
      this.video.style.width = '100%';
      this.video.style.height = '100%';
      this.video.style.objectFit = 'contain';
      this.video.style.backgroundColor = 'black';
      this.container.appendChild(this.video);
    }
  }

  use(plugin: IPlugin) {
    if (this.plugins.has(plugin.name)) return;
    plugin.init(this);
    this.plugins.set(plugin.name, plugin);
  }

  load(url: string) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.currentSrc = url;
    this.retryCount = 0;

    this.store.setState({ error: null, isBuffering: true, qualityLevels: [], audioTracks: [] });
    this.events.emit('load', url);

    if (!url.includes('.m3u8')) {
      this.video.src = url;
    }
  }

  play() { return this.video.play(); }
  pause() { return this.video.pause(); }
  togglePlay() { this.video.paused ? this.play() : this.pause(); }

  seek(time: number) {
    if (isNaN(time)) return;
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration));
  }

  skip(seconds: number) {
    this.seek(this.video.currentTime + seconds);
  }

  setVolume(vol: number) {
    const safeVol = Math.max(0, Math.min(vol, 1));
    this.video.volume = safeVol;
    if (safeVol > 0 && this.video.muted) this.video.muted = false;
    if (safeVol === 0) this.video.muted = true;
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
  }

  setAudioGain(gain: number) {
    this.store.setState({ audioGain: gain });
    this.audioEngine.setGain(gain);
  }

  setQuality(index: number) {
    this.store.setState({ currentQuality: index });
    this.events.emit('quality-request', index);
  }

  setAudioTrack(index: number) {
    this.store.setState({ currentAudioTrack: index });
    this.events.emit('audio-track-request', index);
  }

  toggleFullscreen() {
    if (!this.container) return;

    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => console.error(err));
      this.store.setState({ isFullscreen: true });
    } else {
      document.exitFullscreen();
      this.store.setState({ isFullscreen: false });
    }
  }

  togglePip() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (this.video !== document.pictureInPictureElement && (this.video as any).requestPictureInPicture) {
      (this.video as any).requestPictureInPicture();
    }
  }

  setSubtitle(index: number) {
    this.store.setState({ currentSubtitle: index });
    Array.from(this.video.textTracks).forEach((track, i) => {
      track.mode = i === index ? 'showing' : 'hidden';
    });
  }

  async download() {
    if (!this.video.src) return;

    const src = this.video.src;

    // HLS Stream protection check
    if (src.includes('blob:') || src.includes('.m3u8')) {
      this.notify({
        type: 'warning',
        message: 'HLS streams cannot be downloaded directly via browser.',
        duration: 4000
      });
      return;
    }

    const notifId = this.notify({
      type: 'loading',
      message: 'Initializing download...',
      progress: 0
    });

    try {
      const response = await fetch(src);
      if (!response.body) throw new Error('ReadableStream not supported.');

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (total) {
          const percent = Math.round((loaded / total) * 100);
          this.notify({
            id: notifId,
            type: 'loading',
            message: `Downloading... ${percent}%`,
            progress: percent
          });
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const filename = src.split('/').pop()?.split('?')[0] || `video-${Date.now()}.mp4`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.notify({
        id: notifId,
        type: 'success',
        message: 'Download complete!',
        duration: 3000
      });
    } catch (e) {
      console.error("Download failed", e);
      // Fallback
      window.open(src, '_blank');
      this.notify({
        id: notifId,
        type: 'warning',
        message: 'Advanced download failed, opened in new tab.',
        duration: 4000
      });
    }
  }

  destroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.video.pause();
    this.video.src = '';
    this.events.destroy();
    this.store.destroy();
    this.plugins.forEach(p => p.destroy && p.destroy());
    this.plugins.clear();
    this.video.remove();
    this.audioEngine.destroy();
  }
}
