
import React from 'react';

// Helper for rendering string/node safely (duplicated from Menu for isolation)
const RenderContent = ({ content }: { content: string | React.ReactNode }) => {
  if (typeof content === 'string') {
    if (content.trim().startsWith('<')) return <span dangerouslySetInnerHTML={{ __html: content }} />;
    return <span>{content}</span>;
  }
  return <>{content}</>;
};

export const Toggle = ({ label, checked, onChange, icon, tooltip }: any) => (
  <div
    className="flex items-center justify-between py-2.5 px-3 hover:bg-white/5 group transition-colors"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors flex items-center justify-center w-4 h-4"><RenderContent content={icon} /></span>}
      <div className="flex flex-col">
        <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors flex items-center">
          <RenderContent content={label} />
        </span>
        {tooltip && <span className="text-[10px] text-zinc-500">{tooltip}</span>}
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 shrink-0 transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${checked ? 'bg-[var(--accent)]' : 'bg-zinc-700'}`}
      style={{
        '--tw-ring-color': 'var(--accent)',
        borderRadius: 'var(--radius-full)',
        borderWidth: 'var(--border-width)',
        borderColor: 'rgba(255,255,255,0.1)'
      } as React.CSSProperties}
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 left-1 bg-white w-4 h-4 transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        style={{ borderRadius: 'var(--radius-full)' }}
      />
    </button>
  </div>
);

export const Slider = ({ label, value, min, max, step, onChange, formatValue, icon }: any) => (
  <div
    className="py-2.5 px-3 hover:bg-white/5 group transition-colors"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-3">
        {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors flex items-center justify-center w-4 h-4"><RenderContent content={icon} /></span>}
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
      </div>
      <span
        className="text-[10px] font-mono font-medium text-zinc-300 bg-white/10 px-1.5 py-0.5 tabular-nums"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >{formatValue ? formatValue(value) : value}</span>
    </div>
    <div className="relative h-4 flex items-center px-1">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 strata-range-input"
        style={{
          borderRadius: 'var(--radius-full)',
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(value - min) / (max - min) * 100}%, #3f3f46 ${(value - min) / (max - min) * 100}%, #3f3f46 100%)`,
          '--tw-ring-color': 'var(--accent)'
        } as React.CSSProperties}
      />
      <style>{`
                .strata-range-input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 14px;
                    width: 14px;
                    background: #ffffff;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                    transition: transform 0.1s;
                    border-radius: var(--radius-full);
                    border: var(--border-width) solid rgba(0,0,0,0.1);
                }
                .strata-range-input::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }
                /* Pixel theme specific overrides are handled by global css */
            `}</style>
    </div>
  </div>
);

export const Select = ({ label, value, options, onChange, icon }: any) => (
  <div
    className="py-2.5 px-3 hover:bg-white/5 group transition-colors"
    style={{ borderRadius: 'var(--radius)' }}
  >
    <div className="flex items-center gap-3 mb-2">
      {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors flex items-center justify-center w-4 h-4"><RenderContent content={icon} /></span>}
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
    </div>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border-[length:var(--border-width)] border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 appearance-none hover:bg-zinc-700 transition-colors cursor-pointer"
        style={{ '--tw-ring-color': 'var(--accent)', borderRadius: 'var(--radius)' } as React.CSSProperties}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  </div>
);

export const SettingsGroup = ({ title, children }: any) => (
  <div className="py-2">
    {title && <h4 className="px-3 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-1 mt-2">{title}</h4>}
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);
