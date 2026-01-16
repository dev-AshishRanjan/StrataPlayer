
import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback, useLayoutEffect } from 'react';
import { StrataCore, PlayerState, INITIAL_STATE, TextTrackConfig, SubtitleSettings } from '../core/StrataCore';
import { HlsPlugin } from '../plugins/HlsPlugin';
import {
    PlayIcon, PauseIcon, VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon,
    MaximizeIcon, MinimizeIcon, SettingsIcon, CheckIcon, PipIcon,
    SubtitleIcon, DownloadIcon, Replay10Icon, Forward10Icon, ArrowLeftIcon,
    UploadIcon, LoaderIcon, CastIcon, UsersIcon, ClockIcon, MinusIcon, PlusIcon,
    CustomizeIcon, TypeIcon, PaletteIcon, EyeIcon, MoveVerticalIcon, ResetIcon,
    BoldIcon, CaseUpperIcon, BlurIcon
} from './Icons';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'google-cast-launcher': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

// --- Utils ---
const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const fetchVttWithRetry = async (url: string, retries = 3): Promise<string> => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error('Failed');
}

// Hook to manage CSS transitions for mounting/unmounting
const useTransition = (isActive: boolean, duration: number = 200) => {
    const [isMounted, setIsMounted] = useState(isActive);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsMounted(true);
            // Double RAF ensures the browser paints the initial state before applying the active state
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setIsMounted(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isActive, duration]);

    return { isMounted, isVisible };
};

interface ThumbnailCue {
    start: number;
    end: number;
    url: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const parseVTT = async (url: string, notify: (msg: any) => void): Promise<ThumbnailCue[]> => {
    try {
        const text = await fetchVttWithRetry(url);
        const lines = text.split('\n');
        const cues: ThumbnailCue[] = [];
        let start: number | null = null;
        let end: number | null = null;
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        const parseTime = (t: string) => {
            const parts = t.split(':');
            let s = 0;
            if (parts.length === 3) {
                s += parseFloat(parts[0]) * 3600;
                s += parseFloat(parts[1]) * 60;
                s += parseFloat(parts[2]);
            } else {
                s += parseFloat(parts[0]) * 60;
                s += parseFloat(parts[1]);
            }
            return s;
        };
        for (let line of lines) {
            line = line.trim();
            if (line.includes('-->')) {
                const times = line.split('-->');
                start = parseTime(times[0].trim());
                end = parseTime(times[1].trim());
            } else if (start !== null && end !== null && line.length > 0) {
                let [urlPart, hash] = line.split('#');
                if (!urlPart.match(/^https?:\/\//) && !urlPart.startsWith('data:')) urlPart = baseUrl + urlPart;
                let x = 0, y = 0, w = 0, h = 0;
                if (hash && hash.startsWith('xywh=')) {
                    const coords = hash.replace('xywh=', '').split(',');
                    if (coords.length === 4) {
                        x = parseInt(coords[0]); y = parseInt(coords[1]); w = parseInt(coords[2]); h = parseInt(coords[3]);
                    }
                }
                if (w > 0 && h > 0) cues.push({ start, end, url: urlPart, x, y, w, h });
                start = null; end = null;
            }
        }
        return cues;
    } catch (e: any) {
        notify({ type: 'warning', message: `Failed to load thumbnails`, duration: 4000 });
        return [];
    }
};

// --- Subtitle Overlay ---

const SubtitleOverlay = ({ cues, settings }: { cues: string[], settings: SubtitleSettings }) => {
    if (settings.useNative || cues.length === 0) return null;

    const getTextShadow = () => {
        switch (settings.textStyle) {
            case 'outline': return '0px 0px 4px black, 0px 0px 4px black'; // Simplified stroke
            case 'raised': return '0 -1px 1px black, 0 -2px 2px black'; // Pseudo 3D raised
            case 'depressed': return '0 1px 1px white, 0 2px 2px black'; // Pseudo 3D depressed
            case 'shadow': return '2px 2px 2px rgba(0,0,0,0.8)';
            default: return 'none';
        }
    };

    return (
        <div
            className="absolute inset-x-0 flex flex-col items-center justify-end text-center z-10 pointer-events-none transition-all duration-200"
            style={{
                bottom: `${settings.verticalOffset}px`
            }}
        >
            {cues.map((text, i) => (
                <div
                    key={i}
                    className="mb-1 inline-block max-w-[80%]"
                    style={{
                        fontSize: `${settings.textSize}%`,
                        color: settings.textColor,
                        fontWeight: settings.isBold ? 'bold' : 'normal',
                        textTransform: settings.fixCapitalization ? 'capitalize' : 'none',
                        textShadow: getTextShadow(),
                        lineHeight: 1.4
                    }}
                >
                    <span
                        className="px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: `rgba(0, 0, 0, ${settings.backgroundOpacity / 100})`,
                            backdropFilter: settings.backgroundBlur ? `blur(${settings.backgroundBlurAmount}px)` : 'none',
                        }}
                        dangerouslySetInnerHTML={{ __html: text }} // VTT supports some HTML-like tags
                    />
                </div>
            ))}
        </div>
    );
};


// --- Components ---

const NotificationContainer = ({ notifications }: { notifications: PlayerState['notifications'] }) => {
    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none font-sans">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`
                        bg-zinc-950/80 backdrop-blur-md border border-white/10 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-3 animate-in slide-in-from-left-2 fade-in duration-300 max-w-sm
                        ${n.type === 'error' ? 'border-red-500/50 text-red-100' : ''}
                        ${n.type === 'warning' ? 'border-amber-500/50 text-amber-100' : ''}
                    `}
                >
                    {n.type === 'loading' && <LoaderIcon className="w-4 h-4 animate-spin text-indigo-400" />}
                    <div className="flex flex-col gap-1 w-full">
                        <span>{n.message}</span>
                        {typeof n.progress === 'number' && (
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${n.progress}%` }}></div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Menu = ({ children, onClose, align = 'right', maxHeight, className }: { children?: React.ReactNode; onClose: () => void; align?: 'right' | 'center'; maxHeight?: number; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    const positionClasses = align === 'center' ? 'left-1/2 -translate-x-1/2 origin-bottom' : 'right-0 origin-bottom-right';

    const styleObj = maxHeight ? { maxHeight: `${maxHeight}px` } : {};

    return (
        <div
            className={`absolute bottom-full mb-4 ${positionClasses} bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-[300px] max-w-[calc(100vw-32px)] text-sm z-50 ring-1 ring-white/5 font-sans flex flex-col p-1.5 transition-all duration-300 ease-out ${className}`}
            style={styleObj}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="overflow-y-auto hide-scrollbar flex-1 rounded-lg">
                <div ref={ref}>{children}</div>
            </div>
        </div>
    );
};

// --- UI Kit Components ---

const Toggle = ({ label, checked, onChange, icon }: any) => (
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

const Slider = ({ label, value, min, max, step, onChange, formatValue, icon }: any) => (
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

const Select = ({ label, value, options, onChange, icon }: any) => (
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

const SettingsGroup = ({ title, children }: any) => (
    <div className="py-2">
        {title && <h4 className="px-3 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 mt-2">{title}</h4>}
        <div className="space-y-0.5">
            {children}
        </div>
    </div>
);

// --- Subtitle Menu ---

const SubtitleMenu = ({ tracks, current, onSelect, onUpload, onClose, settings, onSettingsChange, onReset, offset, maxHeight, animationClass }: any) => {
    const [view, setView] = useState<'main' | 'customize'>('main');
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <Menu onClose={onClose} align="right" maxHeight={maxHeight} className={animationClass}>
            {view === 'main' && (
                <div className="animate-in slide-in-from-left-4 fade-in duration-200">
                    <div className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 rounded-lg">
                        <span>Subtitles</span>
                    </div>
                    <div>
                        <MenuItem
                            label="Upload Subtitle"
                            icon={<UploadIcon className="w-4 h-4" />}
                            onClick={() => fileInputRef.current?.click()}
                        />
                        <input type="file" accept=".vtt,.srt" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
                        <MenuItem
                            label="Customize"
                            icon={<CustomizeIcon className="w-4 h-4" />}
                            onClick={() => setView('customize')}
                            hasSubmenu
                        />
                        <div className="h-px bg-white/5 mx-2 my-1"></div>
                        <MenuItem
                            label="Off"
                            active={current === -1}
                            onClick={() => { onSelect(-1); onClose(); }}
                        />
                        {tracks.map((track: any) => (
                            <MenuItem
                                key={track.index}
                                label={track.label}
                                value={track.language}
                                active={current === track.index}
                                onClick={() => { onSelect(track.index); onClose(); }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {view === 'customize' && (
                <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                    <MenuHeader
                        label="Customize"
                        onBack={() => setView('main')}
                        rightAction={
                            <button onClick={onReset} className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/10" title="Reset All">
                                <ResetIcon className="w-4 h-4" />
                            </button>
                        }
                    />

                    <div className="pb-1">
                        <SettingsGroup>
                            <Toggle
                                label="Native Video Subtitle"
                                checked={settings.useNative}
                                onChange={(val: boolean) => onSettingsChange({ useNative: val })}
                            />
                        </SettingsGroup>

                        {!settings.useNative && (
                            <>
                                <SettingsGroup title="Sync & Position">
                                    <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <ClockIcon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">Sync Offset</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { const player = (window as any)._strataPlayer; if (player) player.setSubtitleOffset(Math.round((offset - 0.1) * 10) / 10); }}
                                                className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                                            >
                                                <MinusIcon className="w-4 h-4" />
                                            </button>
                                            <div className="flex-1 bg-zinc-900 border border-white/5 rounded-lg h-8 flex items-center justify-center text-xs font-mono font-medium text-indigo-400">
                                                {offset > 0 ? '+' : ''}{offset?.toFixed(1) || '0.0'}s
                                            </div>
                                            <button
                                                onClick={() => { const player = (window as any)._strataPlayer; if (player) player.setSubtitleOffset(Math.round((offset + 0.1) * 10) / 10); }}
                                                className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <Slider
                                        label="Vertical Position"
                                        icon={<MoveVerticalIcon className="w-4 h-4" />}
                                        value={settings.verticalOffset}
                                        min={0} max={200} step={5}
                                        onChange={(val: number) => onSettingsChange({ verticalOffset: val })}
                                        formatValue={(v: number) => `${v}px`}
                                    />
                                </SettingsGroup>

                                <SettingsGroup title="Appearance">
                                    <Slider
                                        label="Text Size"
                                        icon={<TypeIcon className="w-4 h-4" />}
                                        value={settings.textSize}
                                        min={50} max={200} step={10}
                                        onChange={(val: number) => onSettingsChange({ textSize: val })}
                                        formatValue={(v: number) => `${v}%`}
                                    />

                                    <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <PaletteIcon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">Text Color</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 p-1 bg-zinc-800/50 rounded-lg">
                                            {['#ffffff', '#ffff00', '#00ffff', '#ff00ff', '#ff0000', '#00ff00'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => onSettingsChange({ textColor: c })}
                                                    className={`w-6 h-6 rounded-full border border-white/10 transition-transform hover:scale-110 ${settings.textColor === c ? 'ring-2 ring-indigo-500 scale-110' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                                            <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/20 cursor-pointer">
                                                <input
                                                    type="color"
                                                    value={settings.textColor}
                                                    onChange={(e) => onSettingsChange({ textColor: e.target.value })}
                                                    className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Select
                                        label="Text Style"
                                        value={settings.textStyle}
                                        options={[
                                            { label: 'None', value: 'none' },
                                            { label: 'Outline', value: 'outline' },
                                            { label: 'Raised', value: 'raised' },
                                            { label: 'Depressed', value: 'depressed' },
                                            { label: 'Drop Shadow', value: 'shadow' },
                                        ]}
                                        onChange={(val: string) => onSettingsChange({ textStyle: val })}
                                    />

                                    <div className="grid grid-cols-2 gap-2 mt-1 px-1">
                                        <Toggle label="Bold" icon={<BoldIcon className="w-4 h-4" />} checked={settings.isBold} onChange={(v: boolean) => onSettingsChange({ isBold: v })} />
                                        <Toggle label="Fix Caps" icon={<CaseUpperIcon className="w-4 h-4" />} checked={settings.fixCapitalization} onChange={(v: boolean) => onSettingsChange({ fixCapitalization: v })} />
                                    </div>
                                </SettingsGroup>

                                <SettingsGroup title="Background">
                                    <Slider
                                        label="Opacity"
                                        icon={<EyeIcon className="w-4 h-4" />}
                                        value={settings.backgroundOpacity}
                                        min={0} max={100} step={5}
                                        onChange={(val: number) => onSettingsChange({ backgroundOpacity: val })}
                                        formatValue={(v: number) => `${v}%`}
                                    />

                                    <Toggle label="Blur Background" icon={<BlurIcon className="w-4 h-4" />} checked={settings.backgroundBlur} onChange={(v: boolean) => onSettingsChange({ backgroundBlur: v })} />

                                    {settings.backgroundBlur && (
                                        <Slider
                                            label="Blur Intensity"
                                            value={settings.backgroundBlurAmount}
                                            min={0} max={20} step={1}
                                            onChange={(val: number) => onSettingsChange({ backgroundBlurAmount: val })}
                                            formatValue={(v: number) => `${v}px`}
                                        />
                                    )}
                                </SettingsGroup>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Menu>
    );
}

const MenuItem = ({ label, value, active, onClick, hasSubmenu, icon }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 transition-colors text-left text-zinc-200 active:bg-white/5 focus:outline-none focus:bg-white/10 group rounded-lg overflow-hidden my-0.5">
        <div className="flex items-center gap-3 overflow-hidden">
            {icon && <span className="text-zinc-400 shrink-0 group-hover:text-zinc-300 transition-colors">{icon}</span>}
            <span className={`font-medium truncate text-sm ${active ? 'text-indigo-400' : ''}`} title={label}>{label}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400 shrink-0">
            {value && <span className="text-xs font-medium truncate max-w-[60px]" title={value}>{value}</span>}
            {active && <CheckIcon className="w-4 h-4 text-indigo-500 shrink-0" />}
            {hasSubmenu && <span className="text-xs group-hover:translate-x-0.5 transition-transform text-zinc-500 shrink-0">›</span>}
        </div>
    </button>
);

const MenuHeader = ({ label, onBack, rightAction }: { label: string, onBack: () => void, rightAction?: React.ReactNode }) => (
    <div className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 rounded-lg sticky top-0 z-10 backdrop-blur-md">
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

const MenuDivider = () => <div className="h-px bg-white/5 mx-2 my-1"></div>;

// --- Main Player Component ---

interface StrataPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    thumbnails?: string; // URL to VTT thumbnails
    textTracks?: TextTrackConfig[];
}

export const StrataPlayer = ({ src, poster, autoPlay, thumbnails, textTracks }: StrataPlayerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [player, setPlayer] = useState<StrataCore | null>(null);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [playerHeight, setPlayerHeight] = useState(0);

    const state = useSyncExternalStore<PlayerState>(
        useCallback((cb) => player ? player.store.subscribe(cb) : () => { }, [player]),
        () => player ? player.store.get() : INITIAL_STATE,
        () => INITIAL_STATE
    );

    const [showControls, setShowControls] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed' | 'audio' | 'boost' | 'party'>('main');

    // Transition States
    const settingsTransition = useTransition(settingsOpen, 200);
    const subtitleTransition = useTransition(subtitleMenuOpen, 200);

    // Seek & Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubbingTime, setScrubbingTime] = useState(0);
    const [isVolumeScrubbing, setIsVolumeScrubbing] = useState(false);
    const [isVolumeHovered, setIsVolumeHovered] = useState(false);
    const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);
    const [currentThumbnail, setCurrentThumbnail] = useState<ThumbnailCue | null>(null);
    const [seekAnimation, setSeekAnimation] = useState<{ type: 'forward' | 'rewind', id: number } | null>(null);
    const [skipTrigger, setSkipTrigger] = useState<'forward' | 'rewind' | null>(null);
    const clickTimeoutRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<any>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const core = new StrataCore();
        (window as any)._strataPlayer = core; // Hack for menu access to offset
        core.use(new HlsPlugin());
        core.attach(containerRef.current);
        setPlayer(core);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPlayerHeight(entry.contentRect.height);
            }
        });
        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
            core.destroy();
            setPlayer(null);
            (window as any)._strataPlayer = null;
        };
    }, []);

    useEffect(() => {
        if (player && src) {
            setHasPlayed(false);
            player.load(src, textTracks);
        }
    }, [src, textTracks, player]);

    useEffect(() => {
        // We handle poster manually to support cover
        // if (player && poster) player.video.poster = poster;
    }, [player, poster]);

    useEffect(() => {
        if (player && autoPlay) {
            player.video.muted = true;
            player.store.setState({ isMuted: true });
            player.play().catch(() => { });
        }
    }, [player, autoPlay]);

    useEffect(() => {
        if (state.isPlaying && !hasPlayed) setHasPlayed(true);
    }, [state.isPlaying, hasPlayed]);

    useEffect(() => {
        if (thumbnails && player) {
            parseVTT(thumbnails, player.notify.bind(player)).then(setCues => setThumbnailCues(setCues));
        } else setThumbnailCues([]);
    }, [thumbnails, player]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!player) return;
            if (document.activeElement?.tagName === 'INPUT') return;
            switch (e.key.toLowerCase()) {
                case ' ': case 'k': e.preventDefault(); player.togglePlay(); break;
                case 'arrowright': e.preventDefault(); player.skip(5); break;
                case 'arrowleft': e.preventDefault(); player.skip(-5); break;
                case 'arrowup': e.preventDefault(); player.setVolume(player.video.volume + 0.1); break;
                case 'arrowdown': e.preventDefault(); player.setVolume(player.video.volume - 0.1); break;
                case 'f': e.preventDefault(); player.toggleFullscreen(); break;
                case 'm': e.preventDefault(); player.toggleMute(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (settingsOpen || subtitleMenuOpen) return;
        controlsTimeoutRef.current = setTimeout(() => {
            if (!state.isPlaying || settingsOpen || subtitleMenuOpen) return;
            setShowControls(false);
        }, 2500);
    };

    useEffect(() => {
        if (!settingsOpen && !subtitleMenuOpen && state.isPlaying) handleMouseMove();
        else if (settingsOpen || subtitleMenuOpen) { setShowControls(true); if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); }
    }, [settingsOpen, subtitleMenuOpen, state.isPlaying]);

    const calculateTimeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!progressBarRef.current || !state.duration) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct * state.duration;
    };

    const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsScrubbing(true);
        setScrubbingTime(calculateTimeFromEvent(e));
        const handleMove = (moveEvent: MouseEvent | TouchEvent) => setScrubbingTime(calculateTimeFromEvent(moveEvent));
        const handleUp = (upEvent: MouseEvent | TouchEvent) => {
            player?.seek(calculateTimeFromEvent(upEvent));
            setIsScrubbing(false);
            document.removeEventListener('mousemove', handleMove); document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleUp); document.removeEventListener('touchend', handleUp);
        };
        document.addEventListener('mousemove', handleMove); document.addEventListener('touchmove', handleMove);
        document.addEventListener('mouseup', handleUp); document.addEventListener('touchend', handleUp);
    };

    const calculateVolumeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!volumeBarRef.current) return 0;
        const rect = volumeBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const handleVolumeStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!player) return;
        setIsVolumeScrubbing(true);
        player.setVolume(calculateVolumeFromEvent(e));
        const handleMove = (moveEvent: MouseEvent | TouchEvent) => player.setVolume(calculateVolumeFromEvent(moveEvent));
        const handleUp = () => {
            setIsVolumeScrubbing(false);
            document.removeEventListener('mousemove', handleMove); document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleUp); document.removeEventListener('touchend', handleUp);
        };
        document.addEventListener('mousemove', handleMove); document.addEventListener('touchmove', handleMove);
        document.addEventListener('mouseup', handleUp); document.addEventListener('touchend', handleUp);
    };

    const handleProgressMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!state.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * state.duration;
        setHoverPos(percent * 100);
        setHoverTime(time);
        if (thumbnailCues.length > 0) setCurrentThumbnail(thumbnailCues.find(c => time >= c.start && time < c.end) || null);
    };

    const triggerSkip = (direction: 'forward' | 'rewind') => {
        if (!player) return;
        player.skip(direction === 'forward' ? 10 : -10);
        setSkipTrigger(direction);
        setTimeout(() => setSkipTrigger(null), 300);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (settingsOpen) setSettingsOpen(false);
        if (subtitleMenuOpen) setSubtitleMenuOpen(false);
        if (!player) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const now = Date.now();

        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            if (x < width * 0.35) { triggerSkip('rewind'); setSeekAnimation({ type: 'rewind', id: now }); }
            else if (x > width * 0.65) { triggerSkip('forward'); setSeekAnimation({ type: 'forward', id: now }); }
            else player.toggleFullscreen();
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                player.togglePlay();
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    const VolIcon = state.isMuted || state.volume === 0 ? VolumeMuteIcon : state.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon;

    // Calculate max height for menus based on player height
    // ~120px gives room for controls (bottom) and some margin (top)
    const menuMaxHeight = Math.max(100, playerHeight - 120);

    return (
        <div
            ref={containerRef}
            className="group relative w-full h-full bg-black overflow-hidden select-none font-sans outline-none touch-none rounded-xl text-zinc-100"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (state.isPlaying && !settingsOpen && !subtitleMenuOpen) setShowControls(false); }}
            tabIndex={0}
            role="region"
            aria-label="Video Player"
        >
            {!player && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50"><LoaderIcon className="w-10 h-10 text-indigo-500 animate-spin" /></div>}
            {player && (
                <>
                    <NotificationContainer notifications={state.notifications} />
                    <SubtitleOverlay cues={state.activeCues} settings={state.subtitleSettings} />
                    <div className="absolute inset-0 z-0" onClick={handleContainerClick} aria-hidden="true" />

                    {/* Custom Poster Overlay */}
                    {poster && !hasPlayed && (
                        <div
                            className="absolute inset-0 bg-cover bg-center z-[5] pointer-events-none"
                            style={{ backgroundImage: `url(${poster})` }}
                        />
                    )}

                    {seekAnimation && (
                        <div key={seekAnimation.id} className={`absolute top-0 bottom-0 flex items-center justify-center w-[35%] z-20 bg-white/5 backdrop-blur-[1px] animate-out fade-out duration-500 ${seekAnimation.type === 'rewind' ? 'left-0 rounded-r-[4rem]' : 'right-0 rounded-l-[4rem]'}`} onAnimationEnd={() => setSeekAnimation(null)}>
                            <div className="flex flex-col items-center text-white drop-shadow-lg">
                                {seekAnimation.type === 'rewind' ? <Replay10Icon className="w-12 h-12 animate-pulse" /> : <Forward10Icon className="w-12 h-12 animate-pulse" />}
                                <span className="font-bold text-sm mt-2 font-mono">{seekAnimation.type === 'rewind' ? '-10s' : '+10s'}</span>
                            </div>
                        </div>
                    )}
                    {state.isBuffering && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><LoaderIcon className="w-12 h-12 text-indigo-500 animate-spin drop-shadow-lg" /></div>}
                    {state.error && <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/90 backdrop-blur-md animate-in fade-in"><div className="flex flex-col items-center gap-4 text-red-500 p-8 max-w-md text-center"><span className="text-5xl mb-2">⚠️</span><h3 className="text-xl font-bold text-white">Playback Error</h3><p className="text-zinc-400 text-sm">{state.error}</p><button onClick={() => player.load(player.video.src, textTracks)} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-500 transition-colors mt-4 shadow-lg hover:shadow-indigo-500/20">Try Again</button></div></div>}
                    {((!state.isPlaying && !state.isBuffering && !state.error) || showControls) && !state.isBuffering ? (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 pointer-events-none ${showControls || !state.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex items-center gap-8 md:gap-16 pointer-events-auto">
                                <button onClick={(e) => { e.stopPropagation(); setSettingsOpen(false); setSubtitleMenuOpen(false); triggerSkip('rewind'); }} className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-110 text-white/90 focus:outline-none backdrop-blur-sm"><Replay10Icon className="w-6 h-6" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setSettingsOpen(false); setSubtitleMenuOpen(false); player.togglePlay(); }} className="group relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 hover:bg-indigo-600 border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-110 duration-75 focus:outline-none backdrop-blur-md">{state.isPlaying ? <PauseIcon className="w-8 h-8 md:w-9 md:h-9 text-white fill-current" /> : <PlayIcon className="w-8 h-8 md:w-9 md:h-9 text-white ml-1 fill-current" />}</button>
                                <button onClick={(e) => { e.stopPropagation(); setSettingsOpen(false); setSubtitleMenuOpen(false); triggerSkip('forward'); }} className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-110 text-white/90 focus:outline-none backdrop-blur-sm"><Forward10Icon className="w-6 h-6" /></button>
                            </div>
                        </div>
                    ) : null}
                    <div className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 px-4 md:px-6 pb-4 md:pb-6 pt-24 bg-gradient-to-t from-black/95 via-black/70 to-transparent ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} onClick={(e) => { if (e.target === e.currentTarget) { setSettingsOpen(false); setSubtitleMenuOpen(false); } e.stopPropagation(); }}>
                        <div ref={progressBarRef} className="relative w-full h-3 group/slider mb-3 cursor-pointer touch-none flex items-center" onMouseMove={handleProgressMove} onMouseLeave={() => { setHoverTime(null); setCurrentThumbnail(null); }} onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}>
                            {hoverTime !== null && (<div className="absolute bottom-full mb-4 flex flex-col items-center transform -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-150" style={{ left: `clamp(70px, ${hoverPos}%, calc(100% - 70px))` }}>{currentThumbnail && (<div className="bg-black/90 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm" style={{ width: `${currentThumbnail.w * 0.5}px`, height: `${currentThumbnail.h * 0.5}px` }}><div style={{ backgroundImage: `url("${currentThumbnail.url}")`, width: `${currentThumbnail.w}px`, height: `${currentThumbnail.h}px`, backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`, backgroundRepeat: 'no-repeat', transform: 'scale(0.5)', transformOrigin: 'top left' }} /></div>)}<div className="bg-white text-black px-2 py-0.5 rounded text-[11px] font-bold font-mono shadow-lg tabular-nums mt-2">{formatTime(hoverTime)}</div></div>)}
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative backdrop-blur-sm">{state.duration > 0 && state.buffered.map((range, i) => (<div key={i} className="absolute top-0 bottom-0 bg-white/20" style={{ left: `${(range.start / state.duration) * 100}%`, width: `${((range.end - range.start) / state.duration) * 100}%` }} />))}<div className="absolute left-0 top-0 bottom-0 bg-indigo-500" style={{ width: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }} /></div>
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/slider:scale-100 transition-transform duration-100 z-10" style={{ left: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => player.togglePlay()} className="text-zinc-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 focus:outline-none">{state.isPlaying ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}</button>

                                <div className="flex items-center gap-2 group/vol relative" onMouseEnter={() => setIsVolumeHovered(true)} onMouseLeave={() => setIsVolumeHovered(false)}>
                                    <button onClick={() => player.toggleMute()} className="text-zinc-300 hover:text-white p-2 rounded-lg hover:bg-white/10 focus:outline-none"><VolIcon className="w-5 h-5" /></button>
                                    <div className={`relative h-8 flex items-center transition-all duration-300 ease-out overflow-hidden ${isVolumeHovered || isVolumeScrubbing ? 'w-28 opacity-100 ml-1' : 'w-0 opacity-0'}`}>
                                        <div ref={volumeBarRef} className="relative w-full h-full flex items-center cursor-pointer px-2" onMouseDown={handleVolumeStart} onTouchStart={handleVolumeStart}>
                                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-white rounded-full" style={{ width: `${(state.isMuted ? 0 : state.volume) * 100}%` }}></div>
                                            </div>
                                            <div className="absolute h-3 w-3 bg-white rounded-full shadow-md top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `calc(${(state.isMuted ? 0 : state.volume) * 100}% * 0.85 + 4px)` }} />
                                        </div>
                                    </div>
                                    {(isVolumeHovered || isVolumeScrubbing) && (
                                        <div
                                            className="absolute bottom-full mb-3 bg-white text-black px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shadow-lg pointer-events-none whitespace-nowrap z-50 transform -translate-x-1/2"
                                            style={{ left: `calc(52px + ${(state.isMuted ? 0 : state.volume) * 80}px)` }}
                                        >
                                            {state.isMuted ? '0%' : `${Math.round(state.volume * 100)}%`}
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs font-medium text-zinc-400 font-mono select-none hidden sm:block tabular-nums">{formatTime(isScrubbing ? scrubbingTime : state.currentTime)} <span className="text-zinc-600">/</span> {formatTime(state.duration)}</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="p-2 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"><google-cast-launcher></google-cast-launcher></div>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setSubtitleMenuOpen(!subtitleMenuOpen); setSettingsOpen(false); }} className={`p-2 rounded-lg transition-colors focus:outline-none ${subtitleMenuOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}><SubtitleIcon className="w-5 h-5" /></button>
                                    {subtitleTransition.isMounted && (<SubtitleMenu tracks={state.subtitleTracks} current={state.currentSubtitle} onSelect={(idx: number) => player.setSubtitle(idx)} onUpload={(file: File) => player.addTextTrack(file, file.name)} onClose={() => setSubtitleMenuOpen(false)} settings={state.subtitleSettings} onSettingsChange={(s: Partial<SubtitleSettings>) => player.updateSubtitleSettings(s)} onReset={() => player.resetSubtitleSettings()} offset={state.subtitleOffset} maxHeight={menuMaxHeight} animationClass={subtitleTransition.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'} />)}
                                </div>
                                <button onClick={() => player.togglePip()} className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none"><PipIcon className="w-5 h-5" /></button>
                                <button onClick={() => player.download()} className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none"><DownloadIcon className="w-5 h-5" /></button>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setSettingsOpen(!settingsOpen); setSubtitleMenuOpen(false); setActiveMenu('main'); }} className={`p-2 rounded-lg transition-all duration-300 focus:outline-none ${settingsOpen ? 'rotate-90 text-indigo-400 bg-indigo-500/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}><SettingsIcon className="w-5 h-5" /></button>
                                    {settingsTransition.isMounted && (<Menu onClose={() => setSettingsOpen(false)} align="right" maxHeight={menuMaxHeight} className={settingsTransition.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}><div className="w-full">{activeMenu === 'main' && (<div className="animate-in slide-in-from-left-4 fade-in duration-200"><div className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 rounded-lg"><span>Settings</span></div><MenuItem label="Speed" value={`${state.playbackRate}x`} onClick={() => setActiveMenu('speed')} hasSubmenu /><MenuItem label="Quality" value={state.currentQuality === -1 ? 'Auto' : `${state.qualityLevels[state.currentQuality]?.height}p`} onClick={() => setActiveMenu('quality')} hasSubmenu /><MenuItem label="Audio" value={state.audioTracks[state.currentAudioTrack]?.label || 'Default'} onClick={() => setActiveMenu('audio')} hasSubmenu /><MenuItem label="Audio Boost" value={state.audioGain > 1 ? `${state.audioGain}x` : 'Off'} onClick={() => setActiveMenu('boost')} hasSubmenu /><MenuDivider /><MenuItem label="Watch Party" icon={<UsersIcon className="w-4 h-4" />} onClick={() => setActiveMenu('party')} hasSubmenu /><MenuItem label="Cast to Device" icon={<CastIcon className="w-4 h-4" />} onClick={() => { player.requestCast(); setSettingsOpen(false); }} /></div>)}{['speed', 'quality', 'audio', 'boost', 'party'].includes(activeMenu) && (<div className="animate-in slide-in-from-right-4 fade-in duration-200">{activeMenu === 'speed' && (<><MenuHeader label="Speed" onBack={() => setActiveMenu('main')} />{[0.5, 1, 1.5, 2].map(rate => (<MenuItem key={rate} label={`${rate}x`} active={state.playbackRate === rate} onClick={() => player.video.playbackRate = rate} />))}</>)}{activeMenu === 'quality' && (<><MenuHeader label="Quality" onBack={() => setActiveMenu('main')} /><MenuItem label="Auto" active={state.currentQuality === -1} onClick={() => player.setQuality(-1)} />{state.qualityLevels.map((lvl) => (<MenuItem key={lvl.index} label={`${lvl.height}p`} value={`${Math.round(lvl.bitrate / 1000)}k`} active={state.currentQuality === lvl.index} onClick={() => player.setQuality(lvl.index)} />))}</>)}{activeMenu === 'audio' && (<><MenuHeader label="Audio Track" onBack={() => setActiveMenu('main')} />{state.audioTracks.length === 0 && <div className="px-4 py-3 text-zinc-500 text-xs text-center">No tracks available</div>}{state.audioTracks.map((track) => (<MenuItem key={track.index} label={track.label} value={track.language} active={state.currentAudioTrack === track.index} onClick={() => player.setAudioTrack(track.index)} />))}</>)}{activeMenu === 'boost' && (<><MenuHeader label="Audio Boost" onBack={() => setActiveMenu('main')} />{[1, 1.5, 2, 3].map(gain => (<MenuItem key={gain} label={gain === 1 ? 'Off' : `${gain}x`} active={state.audioGain === gain} onClick={() => player.setAudioGain(gain)} />))}</>)}{activeMenu === 'party' && (<><MenuHeader label="Watch Party" onBack={() => setActiveMenu('main')} /><div className="p-4 space-y-3"><p className="text-xs text-zinc-400 leading-relaxed">Create a synchronized room on WatchParty.me to watch together.</p><a href={`https://www.watchparty.me/create?video=${encodeURIComponent(src)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-xs">Create Room</a></div></>)}</div>)}</div></Menu>)}
                                </div>
                                <button onClick={() => player.toggleFullscreen()} className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-transform hover:scale-110 focus:outline-none">{state.isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}</button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
