
import React, { useRef } from 'react';
import { ArrowLeftIcon, CheckIcon } from '../Icons';

export const Menu = ({ children, onClose, align = 'right', maxHeight, className }: { children?: React.ReactNode; onClose: () => void; align?: 'right' | 'center'; maxHeight?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  const positionClasses = align === 'center' ? 'left-1/2 -translate-x-1/2 origin-bottom' : 'right-0 origin-bottom-right';

  const styleObj = maxHeight ? { maxHeight: `${maxHeight}px` } : {};

  return (
    <div
      className={`absolute bottom-full mb-4 ${positionClasses} bg-[var(--bg-panel)] backdrop-blur-xl border-[length:var(--border-width)] border-white/10 shadow-2xl overflow-hidden w-[300px] max-w-[calc(100vw-32px)] text-sm z-50 ring-1 ring-white/5 font-[family-name:var(--font-main)] flex flex-col p-1.5 transition-all duration-300 ease-out ${className}`}
      style={{ ...styleObj, borderRadius: 'var(--radius-lg)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="overflow-y-auto hide-scrollbar flex-1" style={{ borderRadius: 'var(--radius)' }}>
        <div ref={ref}>{children}</div>
      </div>
    </div>
  );
};

export const MenuItem = ({ label, value, active, onClick, hasSubmenu, icon }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left text-zinc-200 active:bg-white/5 focus:outline-none focus:bg-white/10 group overflow-hidden my-0.5"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <div className="flex items-center gap-3 overflow-hidden">
      {icon && <span className="text-zinc-400 shrink-0 group-hover:text-zinc-300 transition-colors">{icon}</span>}
      <span className={`font-medium truncate text-sm ${active ? 'text-[var(--accent)]' : ''}`} title={label}>{label}</span>
    </div>
    <div className="flex items-center gap-2 text-zinc-400 shrink-0">
      {value && <span className="text-xs font-medium truncate max-w-[60px]" title={value}>{value}</span>}
      {active && <CheckIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />}
      {hasSubmenu && <span className="text-xs group-hover:translate-x-0.5 transition-transform text-zinc-500 shrink-0">›</span>}
    </div>
  </button>
);

export const MenuHeader = ({ label, onBack, rightAction }: { label: string, onBack: () => void, rightAction?: React.ReactNode }) => (
  <div
    className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <button
      className="flex items-center gap-2 hover:text-white transition-colors focus:outline-none"
      onClick={onBack}
    >
      <ArrowLeftIcon className="w-3 h-3" />
      <span>{label}</span>
    </button>
    {rightAction}
  </div>
);

export const MenuDivider = () => <div className="h-px bg-white/5 mx-2 my-1"></div>;
