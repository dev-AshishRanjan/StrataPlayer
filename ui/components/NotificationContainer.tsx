
import React from 'react';
import { PlayerState } from '../../core/StrataCore';
import { LoaderIcon } from '../Icons';

export const NotificationContainer = ({ notifications }: { notifications: PlayerState['notifications'] }) => {
  return (
    <div className="absolute top-4 left-4 z-25 flex flex-col gap-2 pointer-events-none font-sans max-w-[85%] md:max-w-[320px]">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`
                        bg-zinc-950/90 backdrop-blur-md border border-white/10 text-white px-3 py-2 rounded-lg shadow-xl text-xs font-medium flex items-start gap-2.5 animate-in slide-in-from-left-2 fade-in duration-300 pointer-events-auto
                        w-fit max-w-full
                        ${n.type === 'error' ? 'border-red-500/50 text-red-100' : ''}
                        ${n.type === 'warning' ? 'border-amber-500/50 text-amber-100' : ''}
                    `}
        >
          {n.type === 'loading' && <LoaderIcon className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0 mt-0.5" />}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="break-words line-clamp-4 leading-relaxed whitespace-pre-wrap">{n.message}</span>
            {typeof n.progress === 'number' && (
              <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${n.progress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
