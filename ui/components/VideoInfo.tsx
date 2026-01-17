
import React, { useEffect, useState } from 'react';
import { StrataCore } from '../../core/StrataCore';
import { CloseIcon } from '../Icons';

export const VideoInfo = ({ player, onClose }: { player: StrataCore, onClose: () => void }) => {
  const [stats, setStats] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const update = () => {
      if (!player.video) return;
      const v = player.video;
      const q = (v as any).getVideoPlaybackQuality ? (v as any).getVideoPlaybackQuality() : null;

      setStats({
        'Player Size': `${v.offsetWidth} x ${v.offsetHeight}`,
        'Video Resolution': `${v.videoWidth} x ${v.videoHeight}`,
        'Current Time': `${v.currentTime.toFixed(3)}s`,
        'Duration': `${v.duration.toFixed(3)}s`,
        'Volume': `${Math.round(v.volume * 100)}%`,
        'Dropped Frames': q ? q.droppedVideoFrames : 'N/A',
        'Buffer': v.buffered.length > 0 ? `${(v.buffered.end(v.buffered.length - 1) - v.currentTime).toFixed(2)}s` : '0s',
        'Engine': player.store.get().sources[player.store.get().currentSourceIndex]?.type || 'native',
        'URL': v.currentSrc
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [player]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-[var(--bg-panel)] border border-white/10 rounded-xl w-full max-w-md shadow-2xl relative font-mono text-xs text-zinc-300 flex flex-col"
        style={{ borderRadius: 'var(--radius)', maxHeight: '90%' }}
      >
        <div className="p-5 pb-0 flex-shrink-0 relative">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Video Statistics</h3>
        </div>

        <div className="overflow-y-auto hide-scrollbar p-5 pt-0 space-y-2.5 flex-1 min-h-0">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-zinc-500 font-bold shrink-0">{k}</span>
              <span className="text-zinc-200 truncate select-all font-medium bg-white/5 px-1.5 py-0.5 rounded break-all text-right" title={String(v)}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
