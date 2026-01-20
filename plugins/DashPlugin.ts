import { StrataCore, IPlugin } from 'strataplayer';
import * as DashModule from 'dashjs';

// Handle environment differences where dashjs might be a default export or module export
const dashjs = (DashModule as any).default || DashModule;

export class DashPlugin implements IPlugin {
  name = 'DashPlugin';
  private player: any = null;
  private core: StrataCore | null = null;

  init(core: StrataCore) {
    this.core = core;

    // Listen for load requests
    this.core.events.on('load', (data: { url: string, type: string }) => {
      if (data.type === 'dash' || data.url.includes('.mpd')) {
        this.loadDash(data.url);
      } else {
        // Cleanup if we switch away from DASH
        if (this.player) {
          this.player.destroy();
          this.player = null;
        }
      }
    });

    // Quality Handling
    this.core.events.on('quality-request', (index: number) => {
      if (this.player) {
        // -1 means Auto (ABR enabled), otherwise specific index
        if (index === -1) {
          this.player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
        } else {
          this.player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
          this.player.setQualityFor('video', index);
        }
      }
    });

    // Audio Track Handling
    this.core.events.on('audio-track-request', (index: number) => {
      if (this.player) {
        const tracks = this.player.getTracksFor('audio');
        if (tracks[index]) {
          this.player.setCurrentTrack(tracks[index]);
        }
      }
    });
  }

  private loadDash(url: string) {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    try {
      this.player = dashjs.MediaPlayer().create();
      this.player.initialize(this.core!.video, url, this.core!.store.get().isPlaying);

      // Event Listeners
      this.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        this.updateQualityLevels();
        this.updateAudioTracks();
      });

      this.player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        // Pass error to core with retry logic enabled (fatal=true)
        this.core!.triggerError(`Dash Error: ${e.error?.message || 'Unknown'}`, true);
      });

    } catch (e: any) {
      this.core!.triggerError(`Dash Init Failed: ${e.message}`, true);
    }
  }

  private updateQualityLevels() {
    if (!this.player) return;
    const bitrates = this.player.getBitrateInfoListFor('video');
    if (bitrates && bitrates.length) {
      const levels = bitrates.map((b: any, i: number) => ({
        height: b.height,
        bitrate: b.bitrate,
        index: i
      }));
      this.core!.store.setState({ qualityLevels: levels });
    }
  }

  private updateAudioTracks() {
    if (!this.player) return;
    const tracks = this.player.getTracksFor('audio');
    if (tracks && tracks.length) {
      const list = tracks.map((t: any, i: number) => ({
        label: t.lang || t.roles?.[0] || `Audio ${i + 1}`,
        language: t.lang || '',
        index: i
      }));
      this.core!.store.setState({ audioTracks: list });
    }
  }

  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }
}