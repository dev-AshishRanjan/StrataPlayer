
import { EventBus, EventCallback } from './EventBus';
import { NanoStore } from './NanoStore';
import { AudioEngine } from './AudioEngine';
import { injectLibraryResources } from '../utils/playerUtils';
import React from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'loading';
  duration?: number; // ms, if null then persistent
  progress?: number; // 0-100
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface TextTrackConfig {
  src: string;
  label: string;
  srcLang?: string;
  default?: boolean;
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
}

export interface SubtitleTrackState extends TextTrackConfig {
  index: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  isDefault?: boolean;
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
export type VideoFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface PlayerSource {
  url: string;
  type?: 'hls' | 'mp4' | 'webm' | 'dash' | 'mpegts' | 'webtorrent' | string;
  name?: string;
}

export interface Highlight {
  time: number;
  text: string;
}

export interface LayerConfig {
  name?: string;
  html: string | React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  click?: () => void;
  mounted?: (element: HTMLElement) => void;
}

export interface ContextMenuItem {
  html?: string | React.ReactNode;
  disabled?: boolean;
  icon?: string | React.ReactNode;
  onClick?: (close: () => void) => void;
  click?: (close: () => void) => void;
  checked?: boolean;
  separator?: boolean;
  isLabel?: boolean;
  showBorder?: boolean;
}

export interface SettingItem {
  id?: string;
  html?: string | React.ReactNode; // Optional to support separators
  icon?: string | React.ReactNode;
  tooltip?: string;
  separator?: boolean; // New: Divider support
  isLabel?: boolean; // Header label

  // State
  active?: boolean; // Visual "check" state
  value?: any; // Value identifier for selection logic

  // Toggle Switch
  switch?: boolean;
  onSwitch?: (item: SettingItem, checked: boolean) => void;

  // Range Slider
  range?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onRange?: (value: number) => void;
  formatValue?: (value: number) => string;

  // Action
  onClick?: (item: SettingItem) => void;
  click?: (item: SettingItem) => void; // Alias

  // Recursion (Nested Menu)
  children?: SettingItem[];
  currentLabel?: React.ReactNode; // Label to show in parent (e.g. "1080p") next to arrow
}

export interface ControlItem {
  id?: string;
  position: 'left' | 'right' | 'center';
  index: number;
  html?: string | React.ReactNode;
  tooltip?: string;
  onClick?: (core: StrataCore) => void;
  click?: (core: StrataCore) => void;
  className?: string;
  style?: React.CSSProperties;
  isBuiltIn?: boolean;

  // Nested Menu Support for Controls
  children?: SettingItem[];
}

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  isLive: boolean;
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
  isWebFullscreen: boolean;
  isPip: boolean;
  subtitleTracks: SubtitleTrackState[];
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
  sourceStatuses: Record<number, 'success' | 'error' | undefined>;

  // Phase 1 New Features State
  isLocked: boolean;
  flipState: { horizontal: boolean; vertical: boolean };
  aspectRatio: string; // 'default', '16:9', '4:3', etc
  videoFit: VideoFit;
  brightness: number; // 1.0 is default (100%)
  isAutoSized: boolean; // tracks if autoSize (cover) is currently applied (legacy prop, now maps to videoFit=cover)
  isLooping: boolean; // Track loop state reactively

  // UI State reflected in Core
  controlsVisible: boolean;
}

export interface StrataConfig {
  // Basic
  container?: string; // Class for container
  id?: string;

  // Playback
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  audioGain?: number;
  loop?: boolean;
  playsInline?: boolean;
  isLive?: boolean;
  poster?: string; // Added to Config for Core access
  fetchTimeout?: number; // Default 30000ms

  // Appearance
  theme?: PlayerTheme;
  themeColor?: string;
  iconSize?: 'small' | 'medium' | 'large';
  backdrop?: boolean; // Blur effect
  autoSize?: boolean; // object-fit: cover logic (Legacy)
  brightness?: number; // Initial brightness
  videoFit?: VideoFit; // Initial video fit

  // Subtitles
  subtitleSettings?: Partial<SubtitleSettings>;

  // UI Toggles
  screenshot?: boolean;
  setting?: boolean;
  pip?: boolean;
  fullscreen?: boolean;
  fullscreenWeb?: boolean;
  flip?: boolean;
  aspectRatio?: boolean;
  highlight?: Highlight[];
  centerControls?: boolean; // Default true

  // Controls / Mobile
  hotKey?: boolean;
  lock?: boolean; // Mobile lock button
  gesture?: boolean; // Mobile gestures
  gestureSeek?: boolean; // Drag to seek on mobile. Default false.
  fastForward?: boolean; // Long press
  autoOrientation?: boolean; // Mobile landscape lock (default: true)

  // Phase 2: Customization
  layers?: LayerConfig[];
  contextmenu?: ContextMenuItem[];
  controls?: ControlItem[];
  settings?: SettingItem[]; // Append to main menu

  // System
  useSSR?: boolean;
  disablePersistence?: boolean;
}

const STORAGE_KEY = 'strata-settings';

export const DEFAULT_STATE: PlayerState = {
  isPlaying: false,
  isBuffering: false,
  isLive: false,
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
  isWebFullscreen: false,
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
  sourceStatuses: {},
  // New State Defaults
  isLocked: false,
  flipState: { horizontal: false, vertical: false },
  aspectRatio: 'default',
  videoFit: 'contain',
  brightness: 1,
  isAutoSized: false,
  isLooping: false,
  controlsVisible: true
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

  // Determine initial video fit (Priority: config.videoFit > config.autoSize > saved.videoFit > default)
  const resolvedVideoFit = config.videoFit ?? (config.autoSize ? 'cover' : undefined) ?? saved.videoFit ?? DEFAULT_STATE.videoFit;

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
    subtitleSettings: mergedSubtitleSettings,
    // Config overrides state for these visual modes
    isAutoSized: config.autoSize ?? DEFAULT_STATE.isAutoSized,
    videoFit: resolvedVideoFit,
    brightness: config.brightness ?? saved.brightness ?? DEFAULT_STATE.brightness,
    isLive: config.isLive ?? saved.isLive ?? DEFAULT_STATE.isLive,
    isLooping: config.loop ?? saved.isLooping ?? DEFAULT_STATE.isLooping,
    sourceStatuses: {} // Never persist statuses
  };
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
  public config: StrataConfig;
  private resizeObserver: ResizeObserver | null = null;

  // Retry Logic
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimer: any = null;
  private currentSource: PlayerSource | null = null;
  private currentSrc: string = '';
  // Track configs from setSources are stored here to lazy load
  private trackConfigs: TextTrackConfig[] = [];

  // Download Control
  private activeDownloads = new Map<string, AbortController>();

  // Cast
  private castInitialized = false;

  private boundCueChange: () => void;
  private boundFullscreenChange: () => void;

  constructor(config: StrataConfig = {}, videoElement?: HTMLVideoElement) {
    injectLibraryResources(); // Ensure fonts and external SDKs are loaded
    this.config = config;
    // Set Defaults
    this.config.autoOrientation = this.config.autoOrientation ?? true;
    this.config.fetchTimeout = this.config.fetchTimeout ?? 30000;
    this.config.centerControls = this.config.centerControls ?? true;
    this.config.gestureSeek = this.config.gestureSeek ?? false;

    this.video = videoElement || document.createElement('video');
    this.video.crossOrigin = "anonymous";

    // Aggressive Buffering: 
    // Setting preload="auto" hints the browser to buffer as much as possible.
    // While we can't force chunk size on native mp4 without MSE, this is the best native setting.
    this.video.preload = "auto";

    // Init Config Props to Video
    if (config.playsInline !== false) this.video.playsInline = true;

    this.events = new EventBus();

    // Initialize Store with resolved state
    const initialState = getResolvedState(config);
    this.store = new NanoStore(initialState);

    this.audioEngine = new AudioEngine(this.video);
    this.boundCueChange = this.handleCueChange.bind(this);

    // Bind fullscreen listener once
    this.boundFullscreenChange = () => {
      const doc = document as any;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

      this.store.setState({ isFullscreen: isFs });
      this.emit('resize');
      this.emit(isFs ? 'fullscreen' : 'fullscreen_exit');

      // Auto Orientation logic
      if (isFs && this.config.autoOrientation && screen.orientation && 'lock' in screen.orientation) {
        // Basic logic: if video width > height, lock landscape
        const isLandscape = this.video.videoWidth > this.video.videoHeight;
        const lockType = isLandscape ? 'landscape' : 'portrait';
        try {
          // @ts-ignore
          screen.orientation.lock(lockType).catch(() => { });
        } catch (e) { }
      } else if (!isFs && screen.orientation && 'unlock' in screen.orientation) {
        // @ts-ignore
        screen.orientation.unlock();
      }
    };

    // Apply initial state to video element
    this.video.volume = initialState.volume;
    this.video.muted = initialState.isMuted;
    this.video.playbackRate = initialState.playbackRate;
    this.video.loop = initialState.isLooping; // Apply loop state

    // Apply brightness
    this.video.style.filter = `brightness(${initialState.brightness})`;

    if (initialState.audioGain > 1) {
      this.audioEngine.setGain(initialState.audioGain);
    }

    // Apply Video Fit (replaces simple object-fit)
    this.video.style.objectFit = initialState.videoFit;

    this.initVideoListeners();
    this.initMediaSession();
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
          theme: state.theme,
          isLive: state.isLive,
          isLooping: state.isLooping,
          brightness: state.brightness,
          videoFit: state.videoFit,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      });
    }
  }

  // --- Instance Properties ---

  get playing() { return !this.video.paused && !this.video.ended && this.video.readyState > 2; }

  get currentTime() { return this.video.currentTime; }
  set currentTime(val: number) { this.seek(val); }

  get duration() { return this.video.duration || 0; }

  get paused() { return this.video.paused; }

  get volume() { return this.video.volume; }
  set volume(val: number) { this.setVolume(val); }

  get muted() { return this.video.muted; }
  set muted(val: boolean) {
    this.video.muted = val;
    this.store.setState({ isMuted: val });
  }

  get playbackRate() { return this.video.playbackRate; }
  set playbackRate(val: number) { this.video.playbackRate = val; }

  get loop() { return this.video.loop; }
  set loop(val: boolean) {
    this.video.loop = val;
    this.store.setState({ isLooping: val });
  }

  // --- Instance Methods ---

  forward(seconds: number = 10) { this.skip(seconds); }
  backward(seconds: number = 10) { this.skip(-seconds); }

  // --- Event API ---

  on(event: string, callback: EventCallback) { return this.events.on(event, callback); }
  off(event: string, callback: EventCallback) { return this.events.off(event, callback); }
  emit(event: string, data?: any) { return this.events.emit(event, data); }

  private initVideoListeners() {
    const s = (partial: Partial<PlayerState>) => this.store.setState(partial);

    const events = [
      'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended', 'error',
      'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 'play', 'playing', 'progress',
      'ratechange', 'seeked', 'seeking', 'stalled', 'suspend', 'timeupdate', 'volumechange', 'waiting'
    ];

    // Standard video event proxying
    events.forEach(event => {
      this.video.addEventListener(event, (e) => {
        // 1. Emit namespaced event (e.g. video:timeupdate)
        this.emit(`video:${event}`, e);

        // 2. Emit core events (e.g. play, pause)
        if (event === 'play') this.emit('play');
        if (event === 'pause') this.emit('pause');
        if (event === 'ended') this.emit('ended');
        if (event === 'error') this.emit('error', this.video.error);
        if (event === 'seeked') this.emit('seek');

        // 3. Update internal store for UI
        switch (event) {
          case 'play':
            s({ isPlaying: true });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            this.updateMediaSessionPosition();
            break;
          case 'pause':
            s({ isPlaying: false });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            break;
          case 'ended':
            s({ isPlaying: false });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            break;

          case 'waiting':
            s({ isBuffering: true });
            this.emit('loading', true);
            break;
          case 'playing':
            s({ isBuffering: false });
            this.emit('loading', false);
            break;
          case 'canplay':
            s({ isBuffering: false });
            this.emit('loading', false);
            // Mark source as success
            this.updateSourceStatus('success');
            break;

          case 'loadeddata':
            s({ isBuffering: false });
            this.retryCount = 0;
            this.removeNotification('retry');
            if (this.store.get().error) s({ error: null });
            // Mark source as success
            this.updateSourceStatus('success');
            break;
          case 'loadedmetadata':
            this.updateMediaSessionMetadata();
            this.updateMediaSessionPosition();
            break;
          case 'timeupdate':
            if (!this.video.seeking) s({ currentTime: this.video.currentTime });
            this.updateMediaSessionPosition();
            break;
          case 'seeked':
            s({ currentTime: this.video.currentTime });
            this.updateMediaSessionPosition();
            break;
          case 'durationchange':
            s({ duration: this.video.duration });
            this.updateMediaSessionPosition();
            break;
          case 'volumechange': s({ volume: this.video.volume, isMuted: this.video.muted }); break;
          case 'ratechange':
            s({ playbackRate: this.video.playbackRate });
            this.updateMediaSessionPosition();
            break;
          case 'error': this.handleError(); break;
          case 'progress': this.updateBuffer(); break;
          case 'enterpictureinpicture': s({ isPip: true }); break;
          case 'leavepictureinpicture': s({ isPip: false }); break;
        }
      });
    });

    // PiP events are not in the standard list above usually
    this.video.addEventListener('enterpictureinpicture', () => {
      s({ isPip: true });
      this.emit('pip', true);
    });
    this.video.addEventListener('leavepictureinpicture', () => {
      s({ isPip: false });
      this.emit('pip', false);
    });

    // Global fullscreen listener with vendor prefixes
    const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fsEvents.forEach(evt => document.addEventListener(evt, this.boundFullscreenChange));
  }

  private updateSourceStatus(status: 'success' | 'error') {
    const idx = this.store.get().currentSourceIndex;
    if (idx !== -1) {
      this.store.setState((prev) => ({
        sourceStatuses: { ...prev.sourceStatuses, [idx]: status }
      }));
    }
  }

  // --- Media Session API ---

  private initMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    ms.setActionHandler('play', () => this.play());
    ms.setActionHandler('pause', () => this.pause());
    ms.setActionHandler('seekbackward', (details) => this.skip(details.seekOffset ? -details.seekOffset : -10));
    ms.setActionHandler('seekforward', (details) => this.skip(details.seekOffset || 10));
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
    ms.setActionHandler('stop', () => {
      this.pause();
      this.seek(0);
    });
    // Playlist controls
    ms.setActionHandler('previoustrack', () => {
      const idx = this.store.get().currentSourceIndex;
      if (idx > 0) this.switchSource(idx - 1);
    });
    ms.setActionHandler('nexttrack', () => {
      const idx = this.store.get().currentSourceIndex;
      const total = this.store.get().sources.length;
      if (idx < total - 1) this.switchSource(idx + 1);
    });
  }

  private updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;

    const title = this.currentSource?.name || this.currentSource?.url.split('/').pop() || 'Video';

    const artwork = [];

    // 1. Prioritize configured poster or source-specific poster
    if (this.config.poster) {
      artwork.push({ src: this.config.poster, sizes: '512x512', type: 'image/jpeg' });
    }

    // 2. Fallback to relative logo path.
    artwork.push({ src: 'logo.png', sizes: '512x512', type: 'image/png' });

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: 'StrataPlayer',
      artwork: artwork
    });
  }

  private updateMediaSessionPosition() {
    if (!('mediaSession' in navigator)) return;

    const duration = this.video.duration;
    const position = this.video.currentTime;
    const playbackRate = this.video.playbackRate;

    if (!isNaN(duration) && isFinite(duration) && !isNaN(position)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate,
          position: Math.max(0, Math.min(position, duration)) // Ensure within [0, duration]
        });
      } catch (e) {
        console.warn("MediaSession Position Error:", e);
      }
    }
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
    this.emit('video:error', error); // Emitting video:error separately

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.pow(2, this.retryCount - 1) * 1500;

      this.notify({
        id: 'retry',
        type: 'loading',
        // Cleaned up formatting with newline
        message: `Error: ${message}.\nRetrying (${this.retryCount}/${this.maxRetries})`,
      });

      console.warn(`[StrataPlayer] Error: ${message}. Retrying in ${delay}ms...`);

      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        if (this.currentSource) {
          this.load(this.currentSource, this.trackConfigs, true); // True = isRetry

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
      this.emit('error', finalMsg);
      // Mark source as error
      this.updateSourceStatus('error');
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

  private updateSubtitleTrackState(index: number, partial: Partial<SubtitleTrackState>) {
    this.store.setState((prev) => {
      const newTracks = [...prev.subtitleTracks];
      if (newTracks[index]) {
        newTracks[index] = { ...newTracks[index], ...partial };
      }
      return { subtitleTracks: newTracks };
    });
  }

  // --- Utility ---

  async fetchWithRetry(url: string, retries = 3, timeout?: number, signal?: AbortSignal): Promise<Response> {
    const effectiveTimeout = timeout ?? this.config.fetchTimeout ?? 30000;
    for (let i = 0; i < retries; i++) {
      // Create local controller only if external signal not provided
      const localController = signal ? null : new AbortController();
      const fetchSignal = signal || localController?.signal;

      const id = setTimeout(() => localController?.abort(), effectiveTimeout);
      try {
        const res = await fetch(url, { signal: fetchSignal });
        clearTimeout(id);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (e: any) {
        clearTimeout(id);
        if (signal?.aborted) throw new Error('Aborted');
        if (i === retries - 1) throw e;
        // If it's an abort error, warn
        if (e.name === 'AbortError') {
          if (signal?.aborted) throw e; // Pass up external aborts
          console.warn(`Fetch timeout (${effectiveTimeout}ms) for ${url}`);
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Fetch failed');
  }

  // Helper to ensure subtitle content is VTT
  private convertToVTT(content: string): string {
    let text = content.trim();
    if (!text.startsWith('WEBVTT')) {
      // Replace SRT comma timestamps (00:00:20,000) with VTT dot timestamps (00:00:20.000)
      // Robust Regex for SRT -> VTT: (\d+:\d{2}:\d{2}),(\d{3}) -> 1:02:03.400 (Flexible hours)
      let vtt = text.replace(/(\d+:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      // Regex: (\d{2}:\d{2}),(\d{3}) -> 02:03.400 (MM:SS,mmm - optional hours)
      vtt = vtt.replace(/(\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      return 'WEBVTT\n\n' + vtt;
    }
    return text;
  }

  // Enhanced Format Duration: Days, Hours, Minutes, Seconds
  private formatDuration(ms: number): string {
    if (!isFinite(ms) || ms <= 0) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  }

  // --- Core Methods ---

  attach(container: HTMLElement) {
    // 1. Cleanup old observer to prevent memory leaks or zombie updates
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.container = container;

    // 2. Force append the video to the new container. 
    // appendChild moves the node if it is already in the DOM, solving the portal detach issue.
    this.container.appendChild(this.video);

    // 3. Re-apply critical styles to ensure the video fills the new container
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = this.store.get().videoFit;
    this.video.style.backgroundColor = 'black';

    // Apply potentially persisted aspect ratio
    this.updateAspectRatio();

    // 4. Setup new Resize Observer
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.emit('resize', { width: entry.contentRect.width, height: entry.contentRect.height });
        this.updateAspectRatio();
      }
    });
    this.resizeObserver.observe(this.container);

    // Emit ready event
    this.emit('ready');
  }

  use(plugin: IPlugin) {
    if (this.plugins.has(plugin.name)) return;
    plugin.init(this);
    this.plugins.set(plugin.name, plugin);
  }

  setSources(sources: PlayerSource[], tracks: TextTrackConfig[] = []) {
    this.store.setState({ sources });
    this.trackConfigs = tracks;
    if (sources.length > 0) {
      this.load(sources[0], tracks);
    }
  }

  switchSource(index: number) {
    const sources = this.store.get().sources;
    if (index >= 0 && index < sources.length) {
      const time = this.video.currentTime;
      const wasPlaying = !this.video.paused;

      this.load(sources[index], this.trackConfigs);

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
    this.trackConfigs = tracks;

    // Update index state if part of playlist
    const allSources = this.store.get().sources;
    const index = allSources.findIndex(s => s.url === srcObj.url);

    // Prepare initial subtitle tracks state based on configuration
    const initialSubtitleTracks: SubtitleTrackState[] = tracks.map((t, i) => ({
      ...t,
      index: i,
      status: 'idle',
      isDefault: !!t.default
    }));

    this.store.setState({
      isBuffering: true,
      qualityLevels: [],
      currentQuality: -1, // Reset quality to Auto on source switch
      audioTracks: [],
      currentAudioTrack: -1, // Reset audio track
      subtitleTracks: initialSubtitleTracks,
      currentSubtitle: -1,
      currentSourceIndex: index
    });

    // Update Metadata early
    this.updateMediaSessionMetadata();

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

    // Clear existing tracks from DOM
    const oldTracks = this.video.getElementsByTagName('track');
    while (oldTracks.length > 0) {
      oldTracks[0].remove();
    }

    // Lazy load default subtitle if present
    const defaultTrackIndex = initialSubtitleTracks.findIndex(t => t.default);
    if (defaultTrackIndex !== -1) {
      this.setSubtitle(defaultTrackIndex);
    }

    // If it's standard MP4/WebM, set src directly. Plugins handle HLS/Dash/Mpegts/WebTorrent.
    if (type === 'mp4' || type === 'webm' || type === 'ogg') {
      this.video.src = srcObj.url;
    }
  }

  // Wrapper for external subtitle API
  public loadSubtitle(url: string, label: string = 'Subtitle') {
    // Add to state list dynamically
    const newIndex = this.store.get().subtitleTracks.length;
    const newTrack: SubtitleTrackState = {
      src: url,
      label,
      srcLang: 'user',
      default: true,
      kind: 'subtitles',
      index: newIndex,
      status: 'idle',
      isDefault: true
    };

    this.store.setState(prev => ({
      subtitleTracks: [...prev.subtitleTracks, newTrack]
    }));

    this.setSubtitle(newIndex);
  }

  public addTextTrack(file: File, label: string) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      let content = e.target.result as string;
      content = this.convertToVTT(content);

      const blob = new Blob([content], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);

      this.loadSubtitle(url, label);
      this.notify({ type: 'success', message: 'Subtitle uploaded', duration: 3000 });
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

  setControlsVisible(visible: boolean) {
    if (this.store.get().controlsVisible !== visible) {
      this.store.setState({ controlsVisible: visible });
      this.emit('control', visible);
    }
  }

  async toggleFullscreen() {
    if (!this.container) return;

    const doc = document as any;
    const el = this.container as any;

    // Check for native fullscreen support with vendor prefixes
    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    // 1. Exit if active
    if (isFullscreen) {
      if (doc.exitFullscreen) await doc.exitFullscreen().catch(() => { });
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
      // Orientation unlock handled by event listener
      return;
    }

    // 2. If currently web fullscreen, toggle it off.
    if (this.store.get().isWebFullscreen) {
      this.toggleWebFullscreen();
      return;
    }

    // 3. Try aggressive native fullscreen.
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      } else if (this.video && (this.video as any).webkitEnterFullscreen) {
        // iOS Fallback: Use video native fullscreen if container fullscreen is missing
        (this.video as any).webkitEnterFullscreen();
      } else {
        throw new Error("Native fullscreen API not supported");
      }
    } catch (err) {
      // 4. Fallback: Force Web Fullscreen (CSS)
      // This ensures the user gets a fullscreen-like experience regardless of restrictions or errors.
      console.warn('Native fullscreen failed, falling back to Web Fullscreen', err);
      this.toggleWebFullscreen();
    }
  }

  toggleWebFullscreen() {
    const isWebFs = this.store.get().isWebFullscreen;

    // If native fullscreen is active, exit it first to avoid conflicts
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => { });
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
    }

    const newState = !isWebFs;
    this.store.setState({ isWebFullscreen: newState });

    // Lock body scroll when in web fullscreen
    if (typeof document !== 'undefined') {
      document.body.style.overflow = newState ? 'hidden' : '';
    }

    this.emit('webfullscreen', newState);
  }

  togglePip() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (this.video !== document.pictureInPictureElement && (this.video as any).requestPictureInPicture) {
      (this.video as any).requestPictureInPicture();
    }
  }

  screenshot() {
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `screenshot-${new Date().toISOString()}.png`;
        a.href = url;
        a.click();
        this.notify({ type: 'success', message: 'Screenshot saved', duration: 2000 });
      } catch (e) {
        this.notify({ type: 'error', message: 'Failed to take screenshot', duration: 3000 });
      }
    }
  }

  toggleLock() {
    this.store.setState((prev) => ({ isLocked: !prev.isLocked }));
  }

  toggleLoop() {
    this.video.loop = !this.video.loop;
    this.store.setState({ isLooping: this.video.loop });
    this.notify({ type: 'info', message: `Loop: ${this.video.loop ? 'On' : 'Off'}`, duration: 1500 });
  }

  setFlip(direction: 'horizontal' | 'vertical') {
    const current = this.store.get().flipState;
    const newState = {
      ...current,
      [direction]: !current[direction]
    };
    this.store.setState({ flipState: newState });

    const scaleX = newState.horizontal ? -1 : 1;
    const scaleY = newState.vertical ? -1 : 1;
    this.video.style.transform = `scale(${scaleX}, ${scaleY})`;
  }

  setAspectRatio(ratio: string) {
    this.store.setState({ aspectRatio: ratio });
    this.updateAspectRatio();

    if (ratio !== 'default') {
      this.notify({ type: 'info', message: `Aspect Ratio: ${ratio}`, duration: 2000 });
    }
  }

  setVideoFit(fit: VideoFit) {
    this.store.setState({ videoFit: fit });
    this.video.style.objectFit = fit;
    // We also re-trigger aspect ratio calculation as it depends on container/video sizes
    this.updateAspectRatio();
  }

  setBrightness(val: number) {
    const safe = Math.max(0, Math.min(val, 2)); // Cap at 200%
    this.store.setState({ brightness: safe });
    this.video.style.filter = `brightness(${safe})`;
  }

  private updateAspectRatio() {
    if (!this.container) return;
    const { aspectRatio, videoFit } = this.store.get();

    if (aspectRatio === 'default') {
      this.video.style.width = '100%';
      this.video.style.height = '100%';
      this.video.style.objectFit = videoFit;
      return;
    }

    const [w, h] = aspectRatio.split(':').map(Number);
    if (!w || !h) return;

    const targetRatio = w / h;
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const containerRatio = rect.width / rect.height;

    let finalW, finalH;

    // To maintain aspect ratio completely visible within container but stretched to fill that ratio
    // We size the box to the largest rectangle of targetRatio that fits in container.
    if (containerRatio > targetRatio) {
      // Container is wider (e.g. 21:9 container, 16:9 video)
      // Video height = container height. Video width = height * ratio.
      finalH = rect.height;
      finalW = finalH * targetRatio;
    } else {
      // Container is narrower (e.g. 4:3 container, 16:9 video)
      // Video width = container width. Video height = width / ratio.
      finalW = rect.width;
      finalH = finalW / targetRatio;
    }

    this.video.style.width = `${finalW}px`;
    this.video.style.height = `${finalH}px`;
    this.video.style.objectFit = 'fill'; // When forcing aspect ratio box, we usually want fill
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

    // Find active track in DOM
    const tracks = Array.from(this.video.textTracks).filter(t => t.kind === 'subtitles' || t.kind === 'captions');
    // We need to match the DOM track with our state index.
    // Since we only add tracks that are "loaded", the index in DOM matches the filter of loaded tracks in our state.
    // However, simplest is to look for the track with mode='showing'.
    const activeTrack = tracks.find(t => t.mode === 'showing' || t.mode === 'hidden'); // Hidden is used for custom render

    if (activeTrack && activeTrack.activeCues) {
      const cues = Array.from(activeTrack.activeCues).map((c: any) => c.text);
      this.store.setState({ activeCues: cues });
    } else {
      this.store.setState({ activeCues: [] });
    }
  }

  async setSubtitle(index: number) {
    const state = this.store.get();
    const targetTrack = state.subtitleTracks[index];

    // 1. Disable all current tracks
    Array.from(this.video.textTracks).forEach(t => {
      t.removeEventListener('cuechange', this.boundCueChange);
      t.mode = 'disabled'; // Use disabled to stop fetching/processing events for unused tracks
    });
    this.store.setState({ currentSubtitle: index, subtitleOffset: 0, activeCues: [] });

    if (index === -1) return;
    if (!targetTrack) return;

    // 2. Check if loaded. If not, fetch it.
    if (targetTrack.status === 'idle' || targetTrack.status === 'error') {
      this.updateSubtitleTrackState(index, { status: 'loading' });

      try {
        // Fetch blob to ensure valid response and handle CORS if needed
        const response = await this.fetchWithRetry(targetTrack.src);
        let text = await response.text();

        // Auto-convert SRT to VTT if needed
        text = this.convertToVTT(text);

        // Convert to Blob for safe addition (fixes some CORS issues with native track element)
        const blob = new Blob([text], { type: 'text/vtt' });
        const blobUrl = URL.createObjectURL(blob);

        // Add to DOM
        // Don't set isDefault here to avoid browser auto-enabling it before we set the correct mode
        this.addTextTrackInternal(blobUrl, targetTrack.label, targetTrack.srcLang, false);
        this.updateSubtitleTrackState(index, { status: 'success' });
      } catch (e) {
        this.updateSubtitleTrackState(index, { status: 'error' });
        console.error("Failed to load subtitle", e);
        return;
      }
    }

    // 3. Enable the track in DOM
    // We find the track by label/srclang since DOM index might vary
    // If multiple tracks match, we try to use the one that is currently disabled (not active) or just the last one added
    const domTracks = Array.from(this.video.textTracks);

    // Robust finding: prefer matching label AND lang, fallback to label only
    let track = domTracks.find(t => t.label === targetTrack.label && t.language === targetTrack.srcLang);
    if (!track) {
      track = domTracks.find(t => t.label === targetTrack.label);
    }

    if (track) {
      const settings = this.store.get().subtitleSettings;
      track.mode = settings.useNative ? 'showing' : 'hidden';
      track.addEventListener('cuechange', this.boundCueChange);
      this.handleCueChange();
    }
  }

  updateSubtitleSettings(settings: Partial<SubtitleSettings>) {
    const current = this.store.get().subtitleSettings;
    const newSettings = { ...current, ...settings };
    this.store.setState({ subtitleSettings: newSettings });

    // If switching native/custom, re-apply track mode
    if (settings.useNative !== undefined) {
      // Re-trigger setSubtitle to apply correct mode (hidden vs showing)
      // We don't need to re-fetch since status is already success
      const idx = this.store.get().currentSubtitle;
      if (idx !== -1) {
        // Find active track and update mode directly
        const state = this.store.get();
        const target = state.subtitleTracks[idx];
        const track = Array.from(this.video.textTracks).find(t => t.label === target.label && t.language === target.srcLang);
        if (track) {
          track.mode = settings.useNative ? 'showing' : 'hidden';
        }
      }
    }
  }

  resetSubtitleSettings() {
    this.store.setState({ subtitleSettings: DEFAULT_SUBTITLE_SETTINGS });
    this.updateSubtitleSettings({ useNative: false }); // Trigger mode update
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

  cancelDownload(id?: string) {
    if (id && this.activeDownloads.has(id)) {
      this.activeDownloads.get(id)?.abort();
      this.activeDownloads.delete(id);
      this.notify({ type: 'info', message: 'Download cancelled', duration: 2000 });
      this.removeNotification(id);
    } else if (!id) {
      // Legacy/Fallback: cancel all
      if (this.activeDownloads.size > 0) {
        this.activeDownloads.forEach(c => c.abort());
        this.activeDownloads.clear();
        this.notify({ type: 'info', message: 'All downloads cancelled', duration: 2000 });
      }
    }
  }

  async download(options: { format?: 'ts' | 'mp4' } = {}) {
    // Prefer the original source URL if available, as video.src might be a blob (MSE)
    const src = this.currentSource?.url || this.video.src;
    if (!src) return;

    // 1. Handle HLS or DASH explicitly if current source type matches
    // We check both the URL extension and the explicit type from the source config
    if (src.includes('.m3u8') || this.currentSource?.type === 'hls') {
      this.downloadHls(src, options.format || 'ts');
      return;
    }

    if (src.startsWith('blob:')) {
      this.notify({ type: 'warning', message: 'Stream download not supported in browser.', duration: 4000 });
      return;
    }

    const notifId = Math.random().toString(36).substr(2, 9);
    const controller = new AbortController();
    this.activeDownloads.set(notifId, controller);
    const signal = controller.signal;

    this.notify({
      id: notifId,
      type: 'loading',
      message: 'Preparing download',
      progress: 0,
      action: {
        label: 'Cancel',
        onClick: () => this.cancelDownload(notifId)
      }
    });

    try {
      const response = await this.fetchWithRetry(src, 3, undefined, signal);
      if (!response.body) throw new Error('No body');
      const reader = response.body.getReader();
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      const chunks = [];
      const startTime = Date.now();

      // Sliding window for smoothing speed: Store [timestamp, totalLoaded]
      const progressSamples: { time: number, loaded: number }[] = [];
      let lastUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          const now = Date.now();

          // Debounce updates: update every 800ms or if complete
          if (now - lastUpdate > 800 || loaded === total) {
            lastUpdate = now;
            const percent = Math.round((loaded / total) * 100);

            // Add sample
            progressSamples.push({ time: now, loaded });

            // Remove samples older than 5 seconds
            while (progressSamples.length > 0 && now - progressSamples[0].time > 5000) {
              progressSamples.shift();
            }

            let etaSuffix = '';

            // Calculate speed based on sliding window
            let rate = 0; // bytes per ms

            if (progressSamples.length > 1) {
              const oldest = progressSamples[0];
              const newest = progressSamples[progressSamples.length - 1];
              const timeDiff = newest.time - oldest.time;
              const bytesDiff = newest.loaded - oldest.loaded;
              if (timeDiff > 0) rate = bytesDiff / timeDiff;
            } else {
              // Fallback to overall average if not enough samples
              const elapsed = now - startTime;
              if (elapsed > 0) rate = loaded / elapsed;
            }

            if (rate > 0) {
              const remaining = total - loaded;
              const etaMs = remaining / rate;
              // Format with newline for visibility
              etaSuffix = `\n${this.formatDuration(etaMs)} remaining`;
            }

            this.notify({
              id: notifId,
              type: 'loading',
              // Cleaned string
              message: `${etaSuffix}`,
              progress: percent,
              action: {
                label: 'Cancel',
                onClick: () => this.cancelDownload(notifId)
              }
            });
          }
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
      if (signal.aborted) {
        this.removeNotification(notifId); // Handled by cancelDownload notify usually, but ensure cleanup
      } else {
        this.notify({ id: notifId, type: 'error', message: 'Download failed.', duration: 4000 });
        // Fallback
        window.open(src, '_blank');
      }
    } finally {
      this.activeDownloads.delete(notifId);
    }
  }

  async downloadHls(url: string, format: 'ts' | 'mp4') {
    const notifId = Math.random().toString(36).substr(2, 9);
    const controller = new AbortController();
    this.activeDownloads.set(notifId, controller);
    const signal = controller.signal;

    this.notify({
      id: notifId,
      type: 'loading',
      message: 'Analyzing HLS stream',
      progress: 0,
      action: { label: 'Cancel', onClick: () => this.cancelDownload(notifId) }
    });

    try {
      // 1. Fetch Playlist
      let response = await this.fetchWithRetry(url, 3, undefined, signal);
      let content = await response.text();
      let baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // 2. Check for Master Playlist
      if (content.includes('#EXT-X-STREAM-INF')) {
        this.notify({ id: notifId, type: 'loading', message: 'Selecting best quality', progress: 0 }); // Removed ...
        // Parse variants
        const lines = content.split('\n');
        let bestBandwidth = 0;
        let bestUrl = '';
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('#EXT-X-STREAM-INF')) {
            const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
              const bandwidth = parseInt(bandwidthMatch[1]);
              // Next line is URL
              let nextLine = lines[i + 1]?.trim();
              if (nextLine && !nextLine.startsWith('#')) {
                if (bandwidth > bestBandwidth) {
                  bestBandwidth = bandwidth;
                  bestUrl = nextLine;
                }
              }
            }
          }
        }

        if (bestUrl) {
          // Handle relative URL
          if (!bestUrl.startsWith('http')) {
            bestUrl = baseUrl + bestUrl;
          }
          // Fetch best variant playlist
          response = await this.fetchWithRetry(bestUrl, 3, undefined, signal);
          content = await response.text();
          baseUrl = bestUrl.substring(0, bestUrl.lastIndexOf('/') + 1);
        }
      }

      // 3. Parse Segments
      if (content.includes('#EXT-X-KEY')) {
        throw new Error('Encrypted HLS streams are not supported for download.');
      }

      const lines = content.split('\n');
      const segments: string[] = [];
      for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          if (!line.startsWith('http')) {
            segments.push(baseUrl + line);
          } else {
            segments.push(line);
          }
        }
      }

      if (segments.length === 0) throw new Error('No segments found.');

      // 4. Determine Output Format
      let extension = format === 'mp4' ? 'mp4' : 'ts';
      let mime = format === 'mp4' ? 'video/mp4' : 'video/mp2t';

      // 5. Setup Writer (File System API or Memory)
      let fileHandle: any = null;
      let writable: any = null;
      let memoryBlobs: Blob[] = [];
      const useFileSystem = 'showSaveFilePicker' in window;

      if (useFileSystem) {
        try {
          // @ts-ignore
          fileHandle = await window.showSaveFilePicker({
            suggestedName: `video.${extension}`,
            types: [{
              description: format === 'mp4' ? 'MPEG-4 Video' : 'MPEG Transport Stream',
              accept: { [mime]: [`.${extension}`] },
            }],
          });
          writable = await fileHandle.createWritable();
        } catch (e: any) {
          if (e.name === 'AbortError') {
            this.removeNotification(notifId);
            this.notify({ type: 'info', message: 'Download cancelled', duration: 2000 });
            this.activeDownloads.delete(notifId);
            return;
          }
          // User cancelled or not supported, fallback to memory
          console.warn('File System API cancelled or failed, falling back to memory', e);
        }
      }

      // 6. Download Loop
      let isTsContent = false;
      const startTime = Date.now();

      // Sliding window for segment processing speed
      const segmentSamples: { time: number, count: number }[] = [];
      let lastUpdate = 0;

      for (let i = 0; i < segments.length; i++) {
        if (signal.aborted) break;

        const now = Date.now();
        // Debounce: update every 800ms or first/last segment
        if (now - lastUpdate > 800 || i === 0 || i === segments.length - 1) {
          lastUpdate = now;
          const progress = Math.round(((i + 1) / segments.length) * 100);

          // Add sample
          segmentSamples.push({ time: now, count: i + 1 });

          // Remove samples older than 5 seconds
          while (segmentSamples.length > 0 && now - segmentSamples[0].time > 5000) {
            segmentSamples.shift();
          }

          let etaSuffix = '';

          if (segmentSamples.length > 1) {
            const oldest = segmentSamples[0];
            const newest = segmentSamples[segmentSamples.length - 1];
            const timeDiff = newest.time - oldest.time;
            const countDiff = newest.count - oldest.count;

            if (timeDiff > 0 && countDiff > 0) {
              const msPerSegment = timeDiff / countDiff;
              const remainingSegments = segments.length - (i + 1);
              const etaMs = remainingSegments * msPerSegment;
              etaSuffix = `\n${this.formatDuration(etaMs)} remaining`;
            }
          } else if (i > 0) {
            // Fallback
            const elapsed = now - startTime;
            const avgTime = elapsed / i;
            const remaining = segments.length - i;
            const etaMs = remaining * avgTime;
            etaSuffix = `\n${this.formatDuration(etaMs)} remaining`;
          }

          this.notify({
            id: notifId,
            type: 'loading',
            // Cleaned string
            message: `Downloading segment ${i + 1}/${segments.length}${etaSuffix}`,
            progress: progress,
            action: { label: 'Cancel', onClick: () => this.cancelDownload(notifId) }
          });
        }

        const segRes = await this.fetchWithRetry(segments[i], 3, undefined, signal);
        const buffer = await segRes.arrayBuffer();

        // 7. Check content type on first segment
        if (i === 0) {
          const bytes = new Uint8Array(buffer.slice(0, 4));
          // TS Sync Byte is 0x47
          if (bytes[0] === 0x47) {
            isTsContent = true;
            if (format === 'mp4') {
              this.notify({
                type: 'info',
                message: 'Stream is MPEG-TS. Downloading as .ts to prevent corruption.',
                duration: 5000
              });
              // Fallback to TS extension if we can't transmux
              // If using File System API, filename is already set, so we just write raw bytes
              // Ideally we should warn BEFORE saving but here we just process.
              extension = 'ts';
              mime = 'video/mp2t';
            }
          }
        }

        const blob = new Blob([buffer]);
        if (writable) {
          await writable.write(blob);
        } else {
          memoryBlobs.push(blob);
        }
      }

      if (signal.aborted) {
        if (writable) await writable.abort();
        throw new Error('Aborted');
      }

      if (writable) {
        await writable.close();
        this.notify({ id: notifId, type: 'success', message: 'Download complete!', duration: 3000 });
      } else {
        // Combine blobs and download
        this.notify({ id: notifId, type: 'loading', message: 'Stitching video', progress: 100 }); // Removed ...
        const finalBlob = new Blob(memoryBlobs, { type: mime });
        const url = window.URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // If content was TS but requested MP4, fallback extension
        const finalExt = (format === 'mp4' && isTsContent) ? 'ts' : extension;
        a.download = `video.${finalExt}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.notify({ id: notifId, type: 'success', message: 'Saved!', duration: 3000 });
      }

    } catch (e: any) {
      if (signal.aborted) {
        this.removeNotification(notifId);
      } else {
        this.notify({ id: notifId, type: 'error', message: `Download failed: ${e.message}`, duration: 4000 });
      }
    } finally {
      this.activeDownloads.delete(notifId);
    }
  }

  notify(n: Omit<Notification, 'id'> & { id?: string }) {
    const id = n.id || Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = { ...n, id };

    // If update, replace. If new, append.
    this.store.setState(prev => {
      const exists = prev.notifications.find(existing => existing.id === id);
      if (exists) {
        return { notifications: prev.notifications.map(existing => existing.id === id ? newNotification : existing) };
      }
      return { notifications: [...prev.notifications, newNotification] };
    });

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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    // Cancel all downloads
    this.activeDownloads.forEach(c => c.abort());
    this.activeDownloads.clear();

    // Clean up web fullscreen scroll lock if active
    if (this.store.get().isWebFullscreen && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fsEvents.forEach(evt => document.removeEventListener(evt, this.boundFullscreenChange));

    this.video.pause();
    this.video.src = '';
    const oldTracks = this.video.getElementsByTagName('track');
    while (oldTracks.length > 0) oldTracks[0].remove();
    this.emit('destroy');
    this.events.destroy();
    this.store.destroy();
    this.plugins.forEach(p => p.destroy && p.destroy());
    this.plugins.clear();
    this.video.remove();
    this.audioEngine.destroy();
  }
}
