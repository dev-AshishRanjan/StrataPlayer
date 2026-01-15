
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

export interface TextTrackConfig {
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  label: string;
  src: string;
  srcLang: string;
  default?: boolean;
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
  private maxRetries = 5; // Increased to 5
  private retryTimer: any = null;
  private currentSrc: string = '';
  private currentTracks: TextTrackConfig[] = [];

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
      this.retryCount = 0;
      this.removeNotification('retry');
    });
    this.video.addEventListener('canplay', () => s({ isBuffering: false }));

    // Fix bounce back: Don't update time from video if we are actively seeking
    this.video.addEventListener('timeupdate', () => {
      if (!this.video.seeking) {
        s({ currentTime: this.video.currentTime });
      }
    });

    // Ensure state syncs when seek completes
    this.video.addEventListener('seeked', () => s({ currentTime: this.video.currentTime }));

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

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, this.retryCount - 1) * 1000;

      this.notify({
        id: 'retry',
        type: 'loading',
        message: `Playback error. Retrying attempt ${this.retryCount}/${this.maxRetries}...`,
        duration: delay + 500
      });

      console.warn(`[StrataPlayer] Error ${code}: ${message}. Retrying in ${delay}ms...`);

      this.retryTimer = setTimeout(() => {
        // Reload source and tracks
        const time = this.video.currentTime;
        this.load(this.currentSrc, this.currentTracks);
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
    // Small timeout to allow tracks to fully register
    setTimeout(() => {
      const tracks = Array.from(this.video.textTracks)
        .filter(t => t.kind === 'subtitles' || t.kind === 'captions')
        .map((track, index) => ({
          label: track.label || track.language || `Track ${index + 1}`,
          language: track.language,
          index: index
        }));
      this.store.setState({ subtitleTracks: tracks });
    }, 50);
  }

  // --- Notification System ---

  notify(n: Omit<Notification, 'id'> & { id?: string }) {
    const id = n.id || Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { ...n, id };

    const current = this.store.get().notifications;
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

  load(url: string, tracks: TextTrackConfig[] = []) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.currentSrc = url;
    this.currentTracks = tracks;
    this.retryCount = 0;

    this.store.setState({
      error: null,
      isBuffering: true,
      qualityLevels: [],
      audioTracks: [],
      subtitleTracks: []
    });

    this.events.emit('load', url);

    // Remove old tracks
    const oldTracks = this.video.getElementsByTagName('track');
    while (oldTracks.length > 0) {
      oldTracks[0].remove();
    }

    // Add new tracks
    if (tracks.length > 0) {
      tracks.forEach(t => {
        const track = document.createElement('track');
        track.kind = t.kind;
        track.label = t.label;
        track.src = t.src;
        track.srclang = t.srcLang;
        if (t.default) track.default = true;
        this.video.appendChild(track);
      });
    }

    if (!url.includes('.m3u8')) {
      this.video.src = url;
    }
  }

  play() { return this.video.play(); }
  pause() { return this.video.pause(); }
  togglePlay() { this.video.paused ? this.play() : this.pause(); }

  seek(time: number) {
    if (isNaN(time)) return;
    const t = Math.max(0, Math.min(time, this.video.duration));
    // Optimistic UI update to prevent bounce back
    this.store.setState({ currentTime: t });
    this.video.currentTime = t;
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
      // HLS.js tracks vs Native tracks handling can vary, simply toggle mode
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        track.mode = i === index ? 'showing' : 'hidden';
      }
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
    // Clear tracks
    const oldTracks = this.video.getElementsByTagName('track');
    while (oldTracks.length > 0) oldTracks[0].remove();

    this.events.destroy();
    this.store.destroy();
    this.plugins.forEach(p => p.destroy && p.destroy());
    this.plugins.clear();
    this.video.remove();
    this.audioEngine.destroy();
  }
}
