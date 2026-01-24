
import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { ArrowLeftIcon, CheckIcon } from '../Icons';
import { SettingItem } from '../../core/StrataCore';
import { Toggle, Slider, SettingsGroup } from './SettingsPrimitives';

export const Menu = ({ children, onClose, align = 'right', maxHeight, className }: { children?: React.ReactNode; onClose: () => void; align?: 'right' | 'center'; maxHeight?: number; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  const positionClasses = align === 'center' ? 'left-1/2 -translate-x-1/2 origin-bottom' : 'right-0 origin-bottom-right';

  // Smooth height animation logic
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const updateHeight = () => {
      if (contentRef.current) {
        setHeight(contentRef.current.offsetHeight);
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(contentRef.current);

    // Initial measure
    updateHeight();

    return () => observer.disconnect();
  }, []);

  // Constrain dynamic height by maxHeight prop if provided
  const calculatedStyle = {
    height: height === 'auto' ? 'auto' : `${height + 14}px`, // + padding
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
  };

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-4 ${positionClasses} bg-[var(--bg-panel)] backdrop-blur-xl border-[length:var(--border-width)] border-white/10 shadow-2xl overflow-hidden w-[300px] max-w-[calc(100vw-32px)] text-sm z-50 ring-1 ring-white/5 font-[family-name:var(--font-main)] flex flex-col p-1.5 transition-[height,opacity,transform] duration-300 ease-out ${className}`}
      style={{ ...calculatedStyle, borderRadius: 'var(--radius-lg)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="overflow-y-auto hide-scrollbar flex-1" style={{ borderRadius: 'var(--radius)' }}>
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
};

// Helper for rendering string/node safely
const RenderContent = ({ content, className }: { content: string | React.ReactNode, className?: string }) => {
  if (typeof content === 'string') {
    // If it looks like HTML, use dangerous. Otherwise regular text.
    if (content.trim().startsWith('<')) return <span className={className} dangerouslySetInnerHTML={{ __html: content }} />;
    return <span className={className}>{content}</span>;
  }
  return <span className={className}>{content}</span>;
};

export const MenuItem = ({ label, value, active, onClick, hasSubmenu, icon, rightIcon }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left text-zinc-200 active:bg-white/5 focus:outline-none focus:bg-white/10 group overflow-hidden my-0.5"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <div className="flex items-center gap-3 overflow-hidden">
      {icon && <span className="text-zinc-400 shrink-0 group-hover:text-zinc-300 transition-colors flex items-center justify-center w-4 h-4"><RenderContent content={icon} /></span>}
      <span className={`font-medium truncate text-sm flex items-center ${active ? 'text-[var(--accent)]' : ''}`} title={typeof label === 'string' ? label : undefined}>
        <RenderContent content={label} />
      </span>
    </div>
    <div className="flex items-center gap-2 text-zinc-400 shrink-0">
      {value && <span className="text-xs font-medium truncate max-w-[60px]" title={value}><RenderContent content={value} /></span>}
      {rightIcon}
      {active && <CheckIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />}
      {hasSubmenu && <span className="text-xs group-hover:translate-x-0.5 transition-transform text-zinc-500 shrink-0">›</span>}
    </div>
  </button>
);

export const MenuHeader = ({ label, onBack, rightAction }: { label: string | React.ReactNode, onBack: () => void, rightAction?: React.ReactNode }) => (
  <div
    className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <button
      className="flex items-center gap-2 hover:text-white transition-colors focus:outline-none"
      onClick={onBack}
    >
      <ArrowLeftIcon className="w-3 h-3" />
      <span><RenderContent content={label} /></span>
    </button>
    {rightAction}
  </div>
);

export const MenuDivider = () => <div className="h-px bg-white/5 mx-2 my-1"></div>;

// --- Recursive Menu Explorer ---

export const MenuExplorer = ({ items, onClose, title, maxHeight, className }: { items: SettingItem[], onClose: () => void, title?: string, maxHeight?: number, className?: string }) => {
  const [history, setHistory] = useState<SettingItem[]>([]);

  // Current view context
  const currentItem = history.length > 0 ? history[history.length - 1] : null;
  const currentList = currentItem ? (currentItem.children || []) : items;
  const currentTitle = currentItem ? currentItem.html : (title || 'Menu');

  const goBack = () => {
    setHistory(prev => prev.slice(0, -1));
  };

  const navigateTo = (item: SettingItem) => {
    if (item.children) {
      setHistory(prev => [...prev, item]);
    }
  };

  return (
    <Menu onClose={onClose} maxHeight={maxHeight} className={className}>
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Header (Only if deep or title exists and is root) */}
        {(history.length > 0) ? (
          <MenuHeader label={currentTitle || 'Menu'} onBack={goBack} />
        ) : (
          title && (
            <div className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md" style={{ borderRadius: 'var(--radius)' }}>
              <span>{title}</span>
            </div>
          )
        )}

        <div className="pb-1">
          {currentList.map((item, i) => {
            // Case 0: Separator
            if (item.separator) {
              return <MenuDivider key={i} />;
            }

            // Case 1: Range (Slider)
            if (item.range) {
              return (
                <div key={i} className="px-1">
                  <Slider
                    label={item.html}
                    icon={item.icon}
                    value={item.value ?? item.min ?? 0}
                    min={item.min ?? 0}
                    max={item.max ?? 100}
                    step={item.step ?? 1}
                    onChange={(val: number) => item.onRange && item.onRange(val)}
                    formatValue={item.formatValue}
                  />
                </div>
              );
            }

            // Case 2: Toggle Switch
            if (item.switch !== undefined) {
              return (
                <div key={i} className="px-1">
                  <Toggle
                    label={item.html}
                    icon={item.icon}
                    checked={item.switch}
                    tooltip={item.tooltip}
                    onChange={(val: boolean) => item.onSwitch && item.onSwitch(item, val)}
                  />
                </div>
              );
            }

            // Case 3: Navigation (Children) or Action
            return (
              <React.Fragment key={i}>
                <MenuItem
                  label={item.html}
                  icon={item.icon}
                  value={item.currentLabel || item.value}
                  active={item.active}
                  hasSubmenu={!!item.children}
                  onClick={() => {
                    if (item.children) {
                      navigateTo(item);
                    } else if (item.onClick) {
                      item.onClick(item);
                      if (!item.switch && !item.range) {
                        // Close on standard actions
                        onClose();
                      }
                    } else if (item.click) {
                      item.click(item);
                      onClose();
                    }
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Menu>
  );
};
