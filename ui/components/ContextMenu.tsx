
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { ContextMenuItem } from '../../core/StrataCore';
import { CheckIcon } from '../Icons';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  containerWidth: number;
  containerHeight: number;
}

const RenderContent = ({ content }: { content: string | React.ReactNode }) => {
  if (typeof content === 'string') {
    if (content.trim().startsWith('<')) return <span dangerouslySetInnerHTML={{ __html: content }} />;
    return <span>{content}</span>;
  }
  return <>{content}</>;
};

export const ContextMenu = ({ x, y, items, onClose, containerWidth, containerHeight }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ top: number, left: number, maxHeight?: number, opacity: number }>({
    top: y,
    left: x,
    opacity: 0
  });

  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const width = rect.width;
    // Since we render all items initially, height is accurate
    const height = rect.height;

    let newLeft = x;
    let newTop = y;

    // Horizontal Logic: Flip left if overflowing right
    if (x + width > containerWidth - 10) {
      newLeft = x - width;
    }
    // Clamp left edge
    if (newLeft < 10) newLeft = 10;
    if (newLeft + width > containerWidth) newLeft = Math.max(10, containerWidth - width - 10);

    // Vertical Logic: Flip up if overflowing bottom
    if (y + height > containerHeight - 10) {
      newTop = y - height;
    }

    let availableHeight = containerHeight - 20;

    // Clamp top edge
    if (newTop < 10) newTop = 10;

    // If after flipping/clamping it still overflows bottom, we must shift up or limit height
    if (newTop + height > containerHeight - 10) {
      newTop = Math.max(10, containerHeight - height - 10);
      // If even at top it overflows, height is capped by container
    }

    setLayout({
      top: newTop,
      left: newLeft,
      maxHeight: availableHeight,
      opacity: 1
    });

  }, [x, y, items, containerWidth, containerHeight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[200px] bg-[var(--bg-panel)] backdrop-blur-xl border-[length:var(--border-width)] border-white/10 shadow-2xl p-1.5 font-[family-name:var(--font-main)] overflow-y-auto hide-scrollbar flex flex-col"
      style={{
        top: layout.top,
        left: layout.left,
        maxHeight: layout.maxHeight,
        opacity: layout.opacity,
        borderRadius: 'var(--radius-lg)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <button
            onClick={() => {
              if (!item.disabled) {
                if (item.click) item.click(onClose);
                else if (item.onClick) item.onClick(onClose);
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/10 focus:bg-white/10 focus:outline-none transition-colors text-sm text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed group my-0.5`}
            style={{ borderRadius: 'var(--radius)' }}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {item.icon && <span className="text-zinc-400 w-4 h-4 flex items-center justify-center shrink-0 group-hover:text-zinc-300 transition-colors"><RenderContent content={item.icon} /></span>}
              <span className={`flex items-center font-medium truncate ${item.checked ? 'text-[var(--accent)]' : ''}`}><RenderContent content={item.html} /></span>
            </div>
            {item.checked && <CheckIcon className="w-4 h-4 text-[var(--accent)] shrink-0 ml-2" />}
          </button>
          {item.showBorder && <div className="h-px bg-white/5 mx-2 my-1" />}
        </React.Fragment>
      ))}
    </div>
  );
};
