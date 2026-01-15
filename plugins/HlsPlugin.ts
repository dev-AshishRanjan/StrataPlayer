
import { StrataCore, IPlugin } from '../core/StrataCore';

declare global {
  interface Window {
    Hls: any;
  }
}

export class HlsPlugin implements IPlugin {
  name = 'HlsPlugin';
  private hls: any = null;
  private core: StrataCore | null = null;

  init(core: StrataCore) {
    this.core = core;

    // Listen for load requests
    this.core.events.on('load', (url: string) => {
      if (!url.includes('.m3u8')) return;

      if (window.Hls && window.Hls.isSupported()) {
        this.loadHls(url);
      } else if (this.core!.video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS fallback (Safari)
        this.core!.video.src = url;
      }
    });

    // Listen for quality changes from UI
    this.core.events.on('quality-request', (index: number) => {
      if (this.hls) {
        this.hls.currentLevel = index;
      }
    });

    // Listen for audio track changes from UI
    this.core.events.on('audio-track-request', (index: number) => {
      if (this.hls) {
        this.hls.audioTrack = index;
      }
    });
  }

  private loadHls(url: string) {
    if (this.hls) {
      this.hls.destroy();
    }

    this.hls = new window.Hls({
      autoStartLoad: true,
      startLevel: -1, // Auto
      capLevelToPlayerSize: true, // Performance opt
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(this.core!.video);

    this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
      const levels = data.levels.map((lvl: any, idx: number) => ({
        height: lvl.height,
        bitrate: lvl.bitrate,
        index: idx
      }));
      this.core!.store.setState({ qualityLevels: levels });
    });

    // Handle Audio Tracks
    this.hls.on(window.Hls.Events.AUDIO_TRACKS_UPDATED, (event: any, data: any) => {
      const tracks = data.audioTracks.map((track: any, idx: number) => ({
        label: track.name || track.lang || `Audio ${idx + 1}`,
        language: track.lang || '',
        index: idx
      }));
      this.core!.store.setState({
        audioTracks: tracks,
        currentAudioTrack: this.hls.audioTrack
      });
    });

    this.hls.on(window.Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
      // Update current quality only if in auto mode to show what's playing
      // If manual, state is already set
    });

    this.hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
      if (data.fatal) {
        switch (data.type) {
          case window.Hls.ErrorTypes.NETWORK_ERROR:
            this.hls.startLoad();
            break;
          case window.Hls.ErrorTypes.MEDIA_ERROR:
            this.hls.recoverMediaError();
            break;
          default:
            this.hls.destroy();
            break;
        }
      }
    });
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}
