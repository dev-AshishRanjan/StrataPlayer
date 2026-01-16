
import { StrataCore, IPlugin } from '../core/StrataCore';
import Hls from 'hls.js';

export class HlsPlugin implements IPlugin {
  name = 'HlsPlugin';
  private hls: Hls | null = null;
  private core: StrataCore | null = null;

  init(core: StrataCore) {
    this.core = core;

    // Listen for load requests
    this.core.events.on('load', (data: { url: string, type: string }) => {
      // Only proceed if type matches HLS
      if (data.type === 'hls' || data.url.includes('.m3u8')) {
        if (Hls.isSupported()) {
          this.loadHls(data.url);
        } else if (this.core!.video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS fallback (Safari) - Core sets src, we do nothing
          // Core already handles setting video.src if standard
          this.core!.video.src = data.url;
        }
      } else {
        // If we had an active HLS instance but switched to MP4, destroy it
        if (this.hls) {
          this.hls.destroy();
          this.hls = null;
        }
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

    this.hls = new Hls({
      autoStartLoad: true,
      startLevel: -1, // Auto
      capLevelToPlayerSize: true, // Performance opt
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(this.core!.video);

    this.hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
      const levels = data.levels.map((lvl: any, idx: number) => ({
        height: lvl.height,
        bitrate: lvl.bitrate,
        index: idx
      }));
      this.core!.store.setState({ qualityLevels: levels });
    });

    // Handle Audio Tracks
    this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event: any, data: any) => {
      const tracks = data.audioTracks.map((track: any, idx: number) => ({
        label: track.name || track.lang || `Audio ${idx + 1}`,
        language: track.lang || '',
        index: idx
      }));
      this.core!.store.setState({
        audioTracks: tracks,
        currentAudioTrack: this.hls!.audioTrack
      });
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
      // Update current quality only if in auto mode to show what's playing
      // If manual, state is already set
    });

    this.hls.on(Hls.Events.ERROR, (event: any, data: any) => {
      if (data.fatal) {
        // Pass fatal errors to Core to handle the retry loop visibly
        const msg = data.details || 'Unknown HLS Error';
        this.core!.triggerError(msg, true);

        // Cleanup if needed, but core.load() will eventually destroy and re-init this plugin
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
