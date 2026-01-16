
import React from 'react';

export const Toggle = ({ label, checked, onChange, icon }: any) => (
  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
    <div className="flex items-center gap-3">
      {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors">{icon}</span>}
      <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">{label}</span>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-indigo-500 ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}
    >
      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

export const Slider = ({ label, value, min, max, step, onChange, formatValue, icon }: any) => (
  <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-3">
        {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors">{icon}</span>}
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-medium text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded tabular-nums">{formatValue ? formatValue(value) : value}</span>
    </div>
    <div className="relative h-4 flex items-center px-1">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(value - min) / (max - min) * 100}%, #3f3f46 ${(value - min) / (max - min) * 100}%, #3f3f46 100%)`
        }}
      />
      <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 14px;
                    width: 14px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                    transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                }
            `}</style>
    </div>
  </div>
);

export const Select = ({ label, value, options, onChange, icon }: any) => (
  <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
    <div className="flex items-center gap-3 mb-2">
      {icon && <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors">{icon}</span>}
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
    </div>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none hover:bg-zinc-700 transition-colors cursor-pointer"
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
    {title && <h4 className="px-3 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 mt-2">{title}</h4>}
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);
