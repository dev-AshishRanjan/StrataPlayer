
import { StrataCore, IPlugin } from 'strataplayer';
import * as WebTorrentModule from 'webtorrent';

// Handle flexible import for WebTorrent
const WebTorrent = (WebTorrentModule as any).default || WebTorrentModule;

export class WebTorrentPlugin implements IPlugin {
  name = 'WebTorrentPlugin';
  private client: any = null;
  private core: StrataCore | null = null;
  private statusInterval: any = null;
  private notifId: string | null = null;
  private metadataTimeout: any = null;

  init(core: StrataCore) {
    this.core = core;
    this.core.events.on('load', (data: { url: string, type: string }) => {
      if (data.type === 'webtorrent' || data.url.startsWith('magnet:') || data.url.includes('.torrent')) {
        this.loadTorrent(data.url);
      } else {
        this.destroyClient();
      }
    });
  }

  private loadTorrent(url: string) {
    this.destroyClient();

    // Safety check for browser capabilities
    if (typeof window !== 'undefined' && !(window as any).RTCPeerConnection) {
      this.core!.triggerError('WebRTC is not supported in this browser.', true);
      return;
    }

    try {
      // Check if environment is sane before initializing
      if (typeof process === 'undefined' || !(process as any).version) {
        console.warn('[WebTorrentPlugin] Missing process polyfills, attempting to initialize anyway...');
      }

      this.client = new WebTorrent();

      // Persistent notification for connection status
      this.notifId = this.core!.notify({
        type: 'loading',
        message: 'Initializing P2P connection...',
        progress: 0,
        duration: 0
      });

      // Warn if metadata takes too long (common issue with stale magnet links)
      this.metadataTimeout = setTimeout(() => {
        this.updateStatus('Waiting for peers... This might take a while.', 'warning');
      }, 8000);

      const torrent = this.client.add(url);

      // 1. Metadata Phase
      torrent.on('infoHash', () => {
        this.updateStatus('Resolving Magnet Link...', 'loading');
      });

      torrent.on('metadata', () => {
        if (this.metadataTimeout) clearTimeout(this.metadataTimeout);
        this.updateStatus('Metadata received. Finding video file...', 'loading');
      });

      // 2. Ready Phase (Files identified)
      torrent.on('ready', () => {
        if (this.metadataTimeout) clearTimeout(this.metadataTimeout);

        // Find largest video file that looks streamable
        const file = torrent.files.find((f: any) =>
          f.name.endsWith('.mp4') ||
          f.name.endsWith('.webm') ||
          f.name.endsWith('.m4v') ||
          f.name.endsWith('.mkv')
        );

        if (file) {
          this.updateStatus(`Buffering: ${file.name}`, 'success', 3000);

          // Robust render call with error callback
          file.renderTo(this.core!.video, {
            autoplay: this.core!.store.get().isPlaying,
            controls: false
          }, (err: any, elem: any) => {
            if (err) {
              console.error('[WebTorrent] Render Error:', err);
              this.core!.triggerError(`Render Error: ${err.message}`, true);
            }
          });

          // Start monitoring download stats
          this.startStatusMonitor(torrent);

        } else {
          this.updateStatus('No streamable video file found in torrent.', 'error', 0);
        }
      });

      // 3. Error Handling
      torrent.on('error', (err: any) => {
        console.error('[WebTorrent] Torrent Error:', err);
        this.updateStatus(`Torrent Error: ${err.message}`, 'error', 0);
      });

      this.client.on('error', (err: any) => {
        console.error('[WebTorrent] Client Error:', err);
        this.updateStatus(`Client Error: ${err.message}`, 'error', 0);
      });

      // Warning if no peers for a while
      torrent.on('noPeers', (announceType: string) => {
        if (torrent.progress < 0.01) {
          this.updateStatus('No peers found. Searching trackers...', 'warning');
        }
      });

    } catch (e: any) {
      console.error('[WebTorrentPlugin] Critical Init Error:', e);
      // Specifically catch the "slice" error if it leaks through
      if (e.message && e.message.includes('slice')) {
        this.core!.triggerError('Browser Environment Error: Missing Node.js polyfills.', true);
      } else {
        this.core!.triggerError(`WebTorrent Init Failed: ${e.message}`, true);
      }
    }
  }

  private startStatusMonitor(torrent: any) {
    if (this.statusInterval) clearInterval(this.statusInterval);

    // Ensure we have a notification to update
    if (!this.notifId) {
      this.notifId = this.core!.notify({
        type: 'loading',
        message: 'Starting download...',
        progress: 0,
        duration: 0
      });
    }

    this.statusInterval = setInterval(() => {
      if (!torrent || torrent.destroyed) {
        this.stopStatusMonitor();
        return;
      }

      const progress = Math.round(torrent.progress * 100);
      const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(1); // MB/s
      const peers = torrent.numPeers;

      // If fully downloaded, stop showing loading stats
      if (progress >= 100) {
        this.updateStatus('Download Complete', 'success', 4000);
        this.stopStatusMonitor();
        return;
      }

      // Update the persistent notification
      if (this.notifId) {
        this.core!.notify({
          id: this.notifId,
          type: 'loading',
          message: `Peers: ${peers} | ${speed} MB/s | ${progress}%`,
          progress: progress,
          duration: 0
        });
      }

    }, 1000);
  }

  private stopStatusMonitor() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    // Remove the persistent stats notification
    if (this.notifId) {
      this.core!.removeNotification(this.notifId);
      this.notifId = null;
    }
    if (this.metadataTimeout) {
      clearTimeout(this.metadataTimeout);
      this.metadataTimeout = null;
    }
  }

  private updateStatus(msg: string, type: 'info' | 'success' | 'warning' | 'error' | 'loading' = 'info', duration: number = 0) {
    if (this.notifId) {
      // Update existing
      if (duration > 0) {
        this.core!.notify({ id: this.notifId, type, message: msg, duration });
        this.notifId = null;
      } else {
        this.core!.notify({ id: this.notifId, type, message: msg, duration: 0 });
      }
    } else {
      this.notifId = this.core!.notify({ type, message: msg, duration });
      if (duration > 0) this.notifId = null;
    }
  }

  private destroyClient() {
    this.stopStatusMonitor();
    if (this.client) {
      try {
        this.client.destroy();
      } catch (e) { /* ignore */ }
      this.client = null;
    }
  }

  destroy() {
    this.destroyClient();
  }
}
