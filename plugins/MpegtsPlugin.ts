import { StrataCore, IPlugin } from 'strataplayer';
import * as MpegtsModule from 'mpegts.js';

const mpegts = (MpegtsModule as any).default || MpegtsModule;

export class MpegtsPlugin implements IPlugin {
  name = 'MpegtsPlugin';
  private player: any = null;
  private core: StrataCore | null = null;

  init(core: StrataCore) {
    this.core = core;
    this.core.events.on('load', (data: { url: string, type: string }) => {
      if (data.type === 'mpegts' || data.type === 'flv') {
        if (mpegts.isSupported()) {
          this.loadMpegts(data.url);
        } else {
          this.core!.triggerError('MPEG-TS/FLV not supported in this browser', true);
        }
      } else {
        this.destroyPlayer();
      }
    });
  }

  private loadMpegts(url: string) {
    this.destroyPlayer();
    try {
      this.player = mpegts.createPlayer({
        type: url.endsWith('.flv') ? 'flv' : 'mpegts',
        url: url,
        isLive: false // Defaulting to false, assuming VOD unless customized or detected
      });

      this.player.attachMediaElement(this.core!.video);
      this.player.load();

      // Error Handling
      this.player.on(mpegts.Events.ERROR, (type: any, details: any, data: any) => {
        if (type === mpegts.ErrorTypes.NETWORK_ERROR) {
          this.core!.triggerError(`Network Error: ${details}`, true);
        } else if (type === mpegts.ErrorTypes.MEDIA_ERROR) {
          this.core!.triggerError(`Media Error: ${details}`, true);
        } else {
          this.core!.triggerError(`Mpegts Error: ${details}`, false);
        }
      });

    } catch (e: any) {
      this.core!.triggerError(`Mpegts Init Failed: ${e.message}`, true);
    }
  }

  private destroyPlayer() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  destroy() {
    this.destroyPlayer();
  }
}