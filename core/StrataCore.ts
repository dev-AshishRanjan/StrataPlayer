
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

export interface SubtitleSettings {
  useNative: boolean; // "Native video subtitle"
  fixCapitalization: boolean;
  backgroundOpacity: number; // 0-100
  backgroundBlur: boolean;
  backgroundBlurAmount: number; // px
  textSize: number; // % (100 = 1em)
  textStyle: 'none' | 'outline' | 'raised' | 'depressed' | 'shadow';
  isBold: boolean;
  textColor: string;
  verticalOffset: number; // px from bottom
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  useNative: false,
  fixCapitalization: false,
  backgroundOpacity: 50,
  backgroundBlur: false,
  backgroundBlurAmount: 4,
  textSize: 100,
  textStyle: 'shadow',
  isBold: false,
  textColor: '#ffffff',
  verticalOffset: 40,
};

export type PlayerTheme = 'default' | 'pixel' | 'game' | 'hacker';

export interface PlayerSource {
  url: string;
  type?: 'hls' | 'mp4' | 'webm' | 'dash' | 'mpegts' | 'webtorrent' | string;
  name?: string;
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
  subtitleOffset: number; // in seconds
  subtitleSettings: SubtitleSettings;
  activeCues: string[]; // For custom rendering
  viewMode: 'normal' | 'theater' | 'pip';
  notifications: Notification[];
  // Appearance
  iconSize: 'small' | 'medium' | 'large';
  themeColor: string;
  theme: PlayerTheme;
  // Sources
  sources: PlayerSource[];
  currentSourceIndex: number;
}

export interface StrataConfig {
  // Playback
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  audioGain?: number;

  // Appearance
  theme?: PlayerTheme;
  themeColor?: string;
  iconSize?: 'small' | 'medium' | 'large';

  // Subtitles
  subtitleSettings?: Partial<SubtitleSettings>;

  // System
  disablePersistence?: boolean;
}

const STORAGE_KEY = 'strata-settings-v3';

export const DEFAULT_STATE: PlayerState = {
  isPlaying: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  buffered: [],
  volume: 1,
  isMuted: false,
  audioGain: 1,
  playbackRate: 1,
  qualityLevels: [],
  currentQuality: -1,
  audioTracks: [],
  currentAudioTrack: -1,
  error: null,
  isFullscreen: false,
  isPip: false,
  subtitleTracks: [],
  currentSubtitle: -1,
  subtitleOffset: 0,
  subtitleSettings: DEFAULT_SUBTITLE_SETTINGS,
  activeCues: [],
  viewMode: 'normal',
  notifications: [],
  iconSize: 'medium',
  themeColor: '#6366f1',
  theme: 'default',
  sources: [],
  currentSourceIndex: -1,
};

// Helper to merge Defaults -> LocalStorage -> Config
export const getResolvedState = (config: StrataConfig = {}): PlayerState => {
  let saved: any = {};
  if (!config.disablePersistence && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { /* ignore */ }
  }

  const mergedSubtitleSettings = {
    ...DEFAULT_SUBTITLE_SETTINGS,
    ...(saved.subtitleSettings || {}),
    ...(config.subtitleSettings || {})
  };

  return {
    ...DEFAULT_STATE,
    ...saved, // Load saved first
    // Override with config if present (not undefined)
    volume: config.volume ?? saved.volume ?? DEFAULT_STATE.volume,
    isMuted: config.muted ?? saved.isMuted ?? DEFAULT_STATE.isMuted,
    playbackRate: config.playbackRate ?? saved.playbackRate ?? DEFAULT_STATE.playbackRate,
    audioGain: config.audioGain ?? saved.audioGain ?? DEFAULT_STATE.audioGain,
    theme: config.theme ?? saved.theme ?? DEFAULT_STATE.theme,
    themeColor: config.themeColor ?? saved.themeColor ?? DEFAULT_STATE.themeColor,
    iconSize: config.iconSize ?? saved.iconSize ?? DEFAULT_STATE.iconSize,
    subtitleSettings: mergedSubtitleSettings
  };
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
  private config: StrataConfig;

  // Retry Logic
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimer: any = null;
  private currentSource: PlayerSource | null = null;
  private currentSrc: string = '';
  private currentTracks: TextTrackConfig[] = [];

  // Cast
  private castInitialized = false;

  private boundCueChange: () => void;
  private boundFullscreenChange: () => void;

  constructor(config: StrataConfig = {}, videoElement?: HTMLVideoElement) {
    this.config = config;
    this.video = videoElement || document.createElement('video');
    this.video.crossOrigin = "anonymous";
    this.events = new EventBus();

    // Initialize Store with resolved state
    const initialState = getResolvedState(config);
    this.store = new NanoStore(initialState);

    this.audioEngine = new AudioEngine(this.video);
    this.boundCueChange = this.handleCueChange.bind(this);

    // Bind fullscreen listener once
    this.boundFullscreenChange = () => {
      this.store.setState({ isFullscreen: !!document.fullscreenElement });
    };

    // Apply initial state to video element
    this.video.volume = initialState.volume;
    this.video.muted = initialState.isMuted;
    this.video.playbackRate = initialState.playbackRate;
    if (initialState.audioGain > 1) {
      this.audioEngine.setGain(initialState.audioGain);
    }

    this.initVideoListeners();
    this.initCast();

    // Persistence Subscriber
    if (!config.disablePersistence) {
      this.store.subscribe((state) => {
        const settings = {
          volume: state.volume,
          isMuted: state.isMuted,
          playbackRate: state.playbackRate,
          subtitleSettings: state.subtitleSettings,
          iconSize: state.iconSize,
          themeColor: state.themeColor,
          theme: state.theme
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      });
    }
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
      // Success load resets retry count
      this.retryCount = 0;
      this.removeNotification('retry');
      // Clear error if we recovered
      if (this.store.get().error) {
        s({ error: null });
      }
    });
    this.video.addEventListener('canplay', () => s({ isBuffering: false }));

    this.video.addEventListener('timeupdate', () => {
      if (!this.video.seeking) {
        s({ currentTime: this.video.currentTime });
      }
    });

    this.video.addEventListener('seeked', () => s({ currentTime: this.video.currentTime }));
    this.video.addEventListener('durationchange', () => s({ duration: this.video.duration }));
    this.video.addEventListener('volumechange', () => s({ volume: this.video.volume, isMuted: this.video.muted }));
    this.video.addEventListener('ratechange', () => s({ playbackRate: this.video.playbackRate }));
    this.video.addEventListener('error', () => this.handleError());
    this.video.addEventListener('progress', this.updateBuffer.bind(this));
    this.video.addEventListener('enterpictureinpicture', () => s({ isPip: true }));
    this.video.addEventListener('leavepictureinpicture', () => s({ isPip: false }));

    // Global fullscreen listener to catch Esc key or browser button
    document.addEventListener('fullscreenchange', this.boundFullscreenChange);

    this.video.textTracks.addEventListener('addtrack', this.updateSubtitles.bind(this));
    this.video.textTracks.addEventListener('removetrack', this.updateSubtitles.bind(this));
  }

  public triggerError(message: string, isFatal: boolean = false) {
    if (isFatal) {
      this.handleError(message);
    } else {
      this.notify({ type: 'warning', message: `Warning: ${message}`, duration: 5000 });
    }
  }

  private handleError(customMessage?: string) {
    const error = this.video.error;
    const message = customMessage || error?.message || (error ? `Code ${error.code}` : 'Unknown Error');

    this.removeNotification('retry');

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount - 1) * 1500;

      this.notify({
        id: 'retry',
        type: 'loading',
        message: `Error: ${message}. Retrying (${this.retryCount}/${this.maxRetries})...`,
      });

      console.warn(`[StrataPlayer] Error: ${message}. Retrying in ${delay}ms...`);

      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        if (this.currentSource) {
          this.load(this.currentSource, this.currentTracks, true); // True = isRetry

          const time = this.store.get().currentTime;
          if (time > 0) {
            const onCanPlay = () => {
              this.video.currentTime = time;
              this.video.removeEventListener('canplay', onCanPlay);
            };
            this.video.addEventListener('canplay', onCanPlay);
          }
        }
      }, delay);
    } else {
      // Final failure
      this.removeNotification('retry');
      const finalMsg = `Failed to play after ${this.maxRetries} attempts: ${message}`;
      this.store.setState({ error: finalMsg });
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
    setTimeout(() => {
      const tracks = Array.from(this.video.textTracks)
        .filter(t => t.kind === 'subtitles' || t.kind === 'captions')
        .map((track, index) => ({
          label: track.label || track.language || `Track ${index + 1}`,
          language: track.language,
          index: index
        }));
      this.store.setState({ subtitleTracks: tracks });

      // Restore persisted selection if applicable and tracks exist
      const state = this.store.get();
      if (state.currentSubtitle !== -1 && tracks.length > 0 && state.currentSubtitle < tracks.length) {
        this.setSubtitle(state.currentSubtitle);
      }
    }, 50);
  }

  // --- Utility ---

  async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Fetch failed');
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

  setSources(sources: PlayerSource[], tracks: TextTrackConfig[] = []) {
    this.store.setState({ sources });
    this.currentTracks = tracks;
    if (sources.length > 0) {
      this.load(sources[0], tracks);
    }
  }

  switchSource(index: number) {
    const sources = this.store.get().sources;
    if (index >= 0 && index < sources.length) {
      const time = this.video.currentTime;
      const wasPlaying = !this.video.paused;

      this.load(sources[index], this.currentTracks);

      const onCanPlay = () => {
        this.video.currentTime = time;
        if (wasPlaying) this.video.play();
        this.video.removeEventListener('canplay', onCanPlay);
      };
      this.video.addEventListener('canplay', onCanPlay);
    }
  }

  load(source: PlayerSource | string, tracks: TextTrackConfig[] = [], isRetry = false) {
    if (this.retryTimer) clearTimeout(this.retryTimer);

    // Normalize string input to PlayerSource
    const srcObj: PlayerSource = typeof source === 'string' ? { url: source, type: 'auto' } : source;

    if (!isRetry) {
      this.retryCount = 0;
      this.store.setState({ error: null });
      this.removeNotification('retry');
    }

    this.currentSrc = srcObj.url;
    this.currentSource = srcObj;
    this.currentTracks = tracks;

    // Update index state if part of playlist
    const allSources = this.store.get().sources;
    const index = allSources.findIndex(s => s.url === srcObj.url);
    this.store.setState({
      isBuffering: true,
      qualityLevels: [],
      currentQuality: -1, // Reset quality to Auto on source switch
      audioTracks: [],
      currentAudioTrack: -1, // Reset audio track
      // subtitleTracks and currentSubtitle are purposely preserved
      currentSourceIndex: index
    });

    // Determine type if auto
    let type = srcObj.type || 'auto';
    if (type === 'auto') {
      if (srcObj.url.includes('.m3u8')) type = 'hls';
      else if (srcObj.url.includes('.mpd')) type = 'dash';
      else if (srcObj.url.includes('.flv') || srcObj.url.includes('.ts')) type = 'mpegts';
      else if (srcObj.url.startsWith('magnet:') || srcObj.url.includes('.torrent')) type = 'webtorrent';
      else type = 'mp4';
    }

    // Emit load event with source details so plugins can decide to act
    this.events.emit('load', { url: srcObj.url, type });

    const oldTracks = this.video.getElementsByTagName('track');
    while (oldTracks.length > 0) {
      oldTracks[0].remove();
    }

    if (tracks.length > 0) {
      tracks.forEach(t => {
        this.fetchWithRetry(t.src).then(() => {
          this.addTextTrackInternal(t.src, t.label, t.srcLang, t.default);
        }).catch(e => {
          this.notify({ type: 'warning', message: `Failed to load subtitle: ${t.label}`, duration: 4000 });
        });
      });
    }

    // If it's standard MP4/WebM, set src directly. Plugins handle HLS/Dash/Mpegts/WebTorrent.
    if (type === 'mp4' || type === 'webm' || type === 'ogg') {
      this.video.src = srcObj.url;
    }
  }

  public addTextTrack(file: File, label: string) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      let content = e.target.result as string;
      if (file.name.toLowerCase().endsWith('.srt') || !content.trim().startsWith('WEBVTT')) {
        content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        if (!content.trim().startsWith('WEBVTT')) {
          content = 'WEBVTT\n\n' + content;
        }
      }
      const blob = new Blob([content], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      this.addTextTrackInternal(url, label, 'user', true);

      setTimeout(() => {
        const tracks = this.store.get().subtitleTracks;
        const newTrackIndex = tracks.findIndex(t => t.label === label);
        if (newTrackIndex !== -1) {
          this.setSubtitle(newTrackIndex);
          this.notify({ type: 'success', message: 'Subtitle uploaded', duration: 3000 });
        }
      }, 200);
    };
    reader.onerror = () => {
      this.notify({ type: 'error', message: 'Failed to read file', duration: 3000 });
    };
    reader.readAsText(file);
  }

  private addTextTrackInternal(src: string, label: string, lang: string = '', isDefault: boolean = false) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = label;
    track.src = src;
    track.srclang = lang;
    if (isDefault) track.default = true;
    this.video.appendChild(track);
    this.updateSubtitles();
  }

  play() { return this.video.play(); }
  pause() { return this.video.pause(); }
  togglePlay() { this.video.paused ? this.play() : this.pause(); }

  seek(time: number) {
    if (isNaN(time)) return;
    const t = Math.max(0, Math.min(time, this.video.duration));
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

  async toggleFullscreen() {
    if (!this.container) return;
    try {
      if (!document.fullscreenElement) {
        await this.container.requestFullscreen();
        // Attempt to lock orientation to landscape on mobile devices
        if (screen.orientation && 'lock' in screen.orientation) {
          try {
            // @ts-ignore - 'lock' type defs might be missing in some setups
            await screen.orientation.lock('landscape');
          } catch (e) {
            // Orientation lock not supported or failed (expected on some devices/browsers)
            // We fail silently as standard fullscreen is sufficient fallback
          }
        }
      } else {
        if (screen.orientation && 'unlock' in screen.orientation) {
          try {
            // @ts-ignore
            screen.orientation.unlock();
          } catch (e) { }
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed', err);
    }
  }

  togglePip() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (this.video !== document.pictureInPictureElement && (this.video as any).requestPictureInPicture) {
      (this.video as any).requestPictureInPicture();
    }
  }

  private initCast() {
    const w = window as any;
    const initializeCastApi = () => {
      if (this.castInitialized) return;
      try {
        if (w.cast && w.cast.framework && w.chrome && w.chrome.cast) {
          const CastContext = w.cast.framework.CastContext;
          CastContext.getInstance().setOptions({
            receiverApplicationId: w.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: w.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });
          this.castInitialized = true;
        }
      } catch (e) {
        console.warn('Cast Init Error or already initialized', e);
      }
    };

    if (w.cast && w.cast.framework) {
      initializeCastApi();
    } else {
      w.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) initializeCastApi();
      };
    }
  }

  requestCast() {
    const w = window as any;
    if (w.cast && w.cast.framework) {
      try {
        if (!this.castInitialized) this.initCast();
        w.cast.framework.CastContext.getInstance().requestSession()
          .then(() => {
            this.loadMediaToCast();
          })
          .catch((e: any) => {
            if (e !== 'cancel') this.notify({ type: 'error', message: 'Cast failed: ' + e, duration: 3000 });
          });
      } catch (e) {
        this.notify({ type: 'warning', message: 'Cast not available yet', duration: 3000 });
      }
    } else {
      this.notify({ type: 'warning', message: 'Cast API not loaded', duration: 3000 });
    }
  }

  private loadMediaToCast() {
    const w = window as any;
    try {
      const castSession = w.cast.framework.CastContext.getInstance().getCurrentSession();
      if (!castSession) return;
      const mediaInfo = new w.chrome.cast.media.MediaInfo(this.currentSrc, this.currentSrc.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4');
      const request = new w.chrome.cast.media.LoadRequest(mediaInfo);
      castSession.loadMedia(request).then(() => {
        this.notify({ type: 'success', message: 'Casting...', duration: 3000 });
      }).catch((e: any) => console.error('Cast load error', e));
    } catch (e) {
      console.error("Failed to load media into Cast session", e);
    }
  }

  private handleCueChange() {
    const state = this.store.get();
    if (state.currentSubtitle === -1) {
      this.store.setState({ activeCues: [] });
      return;
    }

    // Find active track
    const tracks = Array.from(this.video.textTracks).filter(t => t.kind === 'subtitles' || t.kind === 'captions');
    const track = tracks[state.currentSubtitle];

    if (track && track.activeCues) {
      const cues = Array.from(track.activeCues).map((c: any) => c.text);
      this.store.setState({ activeCues: cues });
    } else {
      this.store.setState({ activeCues: [] });
    }
  }

  setSubtitle(index: number) {
    // Remove listeners from old tracks
    Array.from(this.video.textTracks).forEach(t => {
      t.removeEventListener('cuechange', this.boundCueChange);
      t.mode = 'hidden'; // Reset to hidden before applying new state
    });

    this.store.setState({ currentSubtitle: index, subtitleOffset: 0, activeCues: [] });

    if (index !== -1) {
      // Find active track in the filtered list logic
      const tracks = Array.from(this.video.textTracks).filter(t => t.kind === 'subtitles' || t.kind === 'captions');
      const track = tracks[index];
      if (track) {
        const settings = this.store.get().subtitleSettings;
        // If using Native, mode = showing. If custom, mode = hidden (but not disabled, so cues update)
        track.mode = settings.useNative ? 'showing' : 'hidden';
        track.addEventListener('cuechange', this.boundCueChange);

        // Initial trigger
        this.handleCueChange();
      }
    }
  }

  updateSubtitleSettings(settings: Partial<SubtitleSettings>) {
    const current = this.store.get().subtitleSettings;
    const newSettings = { ...current, ...settings };
    this.store.setState({ subtitleSettings: newSettings });

    // If switching native/custom, re-apply track mode
    if (settings.useNative !== undefined) {
      this.setSubtitle(this.store.get().currentSubtitle);
    }
  }

  resetSubtitleSettings() {
    this.store.setState({ subtitleSettings: DEFAULT_SUBTITLE_SETTINGS });
    this.setSubtitle(this.store.get().currentSubtitle); // Re-apply modes
  }

  setSubtitleOffset(offset: number) {
    const currentOffset = this.store.get().subtitleOffset;
    const delta = offset - currentOffset;

    if (Math.abs(delta) < 0.001) return;

    Array.from(this.video.textTracks).forEach((track) => {
      // If custom (hidden) or native (showing), we adjust cues
      if ((track.mode === 'showing' || track.mode === 'hidden') && track.cues) {
        Array.from(track.cues).forEach((cue: any) => {
          cue.startTime += delta;
          cue.endTime += delta;
        });
      }
    });

    this.store.setState({ subtitleOffset: offset });
    this.notify({ type: 'info', message: `Subtitle Offset: ${offset > 0 ? '+' : ''}${offset.toFixed(1)}s`, duration: 1500 });
  }

  async download() { /* same as before */
    if (!this.video.src) return;
    const src = this.video.src;
    if (src.includes('blob:') || src.includes('.m3u8')) {
      this.notify({ type: 'warning', message: 'Stream download not supported in browser.', duration: 4000 });
      return;
    }
    const notifId = this.notify({ type: 'loading', message: 'Preparing download...', progress: 0 });
    try {
      const response = await this.fetchWithRetry(src);
      if (!response.body) throw new Error('No body');
      const reader = response.body.getReader();
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          const percent = Math.round((loaded / total) * 100);
          this.notify({ id: notifId, type: 'loading', message: `Downloading... ${percent}%`, progress: percent });
        }
      }
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = src.split('/').pop()?.split('?')[0] || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      this.notify({ id: notifId, type: 'success', message: 'Saved!', duration: 3000 });
    } catch (e: any) {
      this.notify({ id: notifId, type: 'error', message: 'Download failed.', duration: 4000 });
      window.open(src, '_blank');
    }
  }

  notify(n: Omit<Notification, 'id'> & { id?: string }) {
    const id = n.id || Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { ...n, id };
    this.store.setState({ notifications: [newNotification] });
    if (n.duration) setTimeout(() => this.removeNotification(id), n.duration);
    return id;
  }

  removeNotification(id: string) {
    const current = this.store.get().notifications;
    this.store.setState({ notifications: current.filter(n => n.id !== id) });
  }

  setAppearance(settings: { iconSize?: 'small' | 'medium' | 'large', themeColor?: string, theme?: PlayerTheme }) {
    this.store.setState(prev => ({
      ...prev,
      ...settings
    }));
  }

  destroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    document.removeEventListener('fullscreenchange', this.boundFullscreenChange);
    this.video.pause();
    this.video.src = '';
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
