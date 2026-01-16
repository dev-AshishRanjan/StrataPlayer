
import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback, useLayoutEffect } from 'react';
import { StrataCore, PlayerState, INITIAL_STATE, TextTrackConfig } from '../core/StrataCore';
import { HlsPlugin } from '../plugins/HlsPlugin';
import {
    PlayIcon, PauseIcon, VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon,
    MaximizeIcon, MinimizeIcon, SettingsIcon, CheckIcon, PipIcon,
    SubtitleIcon, DownloadIcon, Replay10Icon, Forward10Icon, ArrowLeftIcon,
    UploadIcon, LoaderIcon, CastIcon, UsersIcon, ClockIcon, MinusIcon, PlusIcon,
    CustomizeIcon
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
                if (!urlPart.match(/^https?:\/\//) && !urlPart.startsWith('data:')) {
                    urlPart = baseUrl + urlPart;
                }

                let x = 0, y = 0, w = 0, h = 0;
                if (hash && hash.startsWith('xywh=')) {
                    const coords = hash.replace('xywh=', '').split(',');
                    if (coords.length === 4) {
                        x = parseInt(coords[0]);
                        y = parseInt(coords[1]);
                        w = parseInt(coords[2]);
                        h = parseInt(coords[3]);
                    }
                }

                if (w > 0 && h > 0) {
                    cues.push({ start, end, url: urlPart, x, y, w, h });
                }

                start = null;
                end = null;
            }
        }
        return cues;
    } catch (e: any) {
        notify({ type: 'warning', message: `Failed to load thumbnails`, duration: 4000 });
        return [];
    }
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

// Improved Menu with Positioning Props
const Menu = ({ children, onClose, align = 'right' }: { children?: React.ReactNode; onClose: () => void; align?: 'right' | 'center' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        if (ref.current) {
            setHeight(ref.current.scrollHeight);
        }
    }, [children]);

    const positionClasses = align === 'center'
        ? 'left-1/2 -translate-x-1/2 origin-bottom'
        : 'right-0 origin-bottom-right';

    return (
        <div
            className={`absolute bottom-full mb-3 ${positionClasses} bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-[260px] text-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 z-50 ring-1 ring-white/5 font-sans`}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ height: height ? `${height}px` : 'auto' }}
            >
                <div ref={ref} className="py-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const SubtitleMenu = ({ tracks, current, onSelect, onUpload, onClose, offset, onOffsetChange }: any) => {
    const [view, setView] = useState<'main' | 'customize'>('main');
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 origin-bottom bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-[260px] text-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 z-50 ring-1 ring-white/5 font-sans"
            onClick={(e) => e.stopPropagation()}
        >
            {view === 'main' && (
                <div className="animate-in slide-in-from-left-4 fade-in duration-200">
                    <div className="px-4 py-3 border-b border-white/10 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5">
                        <span>Subtitles</span>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto hide-scrollbar py-1">
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
                        <MenuDivider />
                        <MenuItem
                            label="Upload Subtitle"
                            icon={<UploadIcon className="w-4 h-4" />}
                            onClick={() => fileInputRef.current?.click()}
                        />
                        <input
                            type="file"
                            accept=".vtt,.srt"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    onUpload(e.target.files[0]);
                                }
                            }}
                        />
                        <MenuItem
                            label="Customize"
                            icon={<CustomizeIcon className="w-4 h-4" />}
                            onClick={() => setView('customize')}
                            hasSubmenu
                        />
                    </div>
                </div>
            )}

            {view === 'customize' && (
                <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                    <MenuHeader label="Customize" onBack={() => setView('main')} />
                    <div className="py-2">
                        <div className="px-4 py-3">
                            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ClockIcon className="w-3 h-3" />
                                <span>Sync Offset</span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center gap-3 border border-white/5">
                                <div className="text-3xl font-mono font-bold tabular-nums text-zinc-100">
                                    {offset > 0 ? '+' : ''}{offset.toFixed(1)}s
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => onOffsetChange(Math.round((offset - 0.1) * 10) / 10)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all p-2 rounded-lg flex items-center justify-center text-zinc-200"
                                        title="Delay -0.1s"
                                    >
                                        <MinusIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onOffsetChange(Math.round((offset + 0.1) * 10) / 10)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 transition-all p-2 rounded-lg flex items-center justify-center text-zinc-200"
                                        title="Delay +0.1s"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onOffsetChange(0)}
                                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const MenuItem = ({ label, value, active, onClick, hasSubmenu, icon }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors text-left text-zinc-200 active:bg-white/5 focus:outline-none focus:bg-white/10 group overflow-hidden">
        <div className="flex items-center gap-3 overflow-hidden">
            {icon && <span className="text-zinc-400 shrink-0">{icon}</span>}
            <span className={`font-medium truncate ${active ? 'text-indigo-400' : ''}`} title={label}>{label}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400 shrink-0">
            {value && <span className="text-xs font-medium truncate max-w-[60px]" title={value}>{value}</span>}
            {active && <CheckIcon className="w-4 h-4 text-indigo-500 shrink-0" />}
            {hasSubmenu && <span className="text-xs group-hover:translate-x-0.5 transition-transform text-zinc-500 shrink-0">›</span>}
        </div>
    </button>
);

const MenuHeader = ({ label, onBack }: { label: string, onBack: () => void }) => (
    <button
        className="w-full px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/10 flex items-center gap-2 hover:bg-white/5 transition-colors focus:outline-none sticky top-0 bg-zinc-950/60 backdrop-blur-xl z-10"
        onClick={onBack}
    >
        <ArrowLeftIcon className="w-3 h-3" />
        <span>{label}</span>
    </button>
);

const MenuDivider = () => <div className="h-px bg-white/10 mx-4 my-1"></div>;

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

    // Subscribe to store
    const state = useSyncExternalStore<PlayerState>(
        useCallback((cb) => player ? player.store.subscribe(cb) : () => { }, [player]),
        () => player ? player.store.get() : INITIAL_STATE,
        () => INITIAL_STATE
    );

    const [showControls, setShowControls] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed' | 'audio' | 'boost' | 'offset' | 'party'>('main');

    // Seek & Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubbingTime, setScrubbingTime] = useState(0);

    // Volume Scrubbing State
    const [isVolumeScrubbing, setIsVolumeScrubbing] = useState(false);
    const [isVolumeHovered, setIsVolumeHovered] = useState(false);

    // Thumbnails & Hover State
    const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);
    const [currentThumbnail, setCurrentThumbnail] = useState<ThumbnailCue | null>(null);

    // Gesture State
    const [seekAnimation, setSeekAnimation] = useState<{ type: 'forward' | 'rewind', id: number } | null>(null);
    const [skipTrigger, setSkipTrigger] = useState<'forward' | 'rewind' | null>(null);
    const clickTimeoutRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<any>(null);

    // Refs for bars
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeBarRef = useRef<HTMLDivElement>(null);

    // Initialize Core
    useEffect(() => {
        if (!containerRef.current) return;

        const core = new StrataCore();
        core.use(new HlsPlugin());
        core.attach(containerRef.current);

        setPlayer(core);

        return () => {
            core.destroy();
            setPlayer(null);
        };
    }, []);

    // Handle src changes & Autoplay
    useEffect(() => {
        if (player && src) {
            player.load(src, textTracks);
        }
    }, [src, textTracks, player]);

    useEffect(() => {
        if (player && autoPlay) {
            player.video.muted = true;
            player.store.setState({ isMuted: true });
            player.play().catch(() => { });
        }
    }, [player, autoPlay]);

    // Parse Thumbnails
    useEffect(() => {
        if (thumbnails && player) {
            parseVTT(thumbnails, player.notify.bind(player)).then(setCues => setThumbnailCues(setCues));
        } else {
            setThumbnailCues([]);
        }
    }, [thumbnails, player]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!player) return;
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    player.togglePlay();
                    break;
                case 'arrowright':
                    e.preventDefault();
                    player.skip(5);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    player.skip(-5);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    player.setVolume(player.video.volume + 0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    player.setVolume(player.video.volume - 0.1);
                    break;
                case 'f':
                    e.preventDefault();
                    player.toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    player.toggleMute();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player]);

    // Controls Visibility Logic
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

        if (settingsOpen || subtitleMenuOpen) return;

        controlsTimeoutRef.current = setTimeout(() => {
            if (!state.isPlaying) return;
            if (settingsOpen || subtitleMenuOpen) return;
            setShowControls(false);
        }, 2500);
    };

    useEffect(() => {
        if (!settingsOpen && !subtitleMenuOpen && state.isPlaying) {
            handleMouseMove();
        } else if (settingsOpen || subtitleMenuOpen) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }
    }, [settingsOpen, subtitleMenuOpen, state.isPlaying]);

    // --- Logic ---
    const calculateTimeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!progressBarRef.current || !state.duration) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct * state.duration;
    };

    const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsScrubbing(true);
        const time = calculateTimeFromEvent(e);
        setScrubbingTime(time);

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            setScrubbingTime(calculateTimeFromEvent(moveEvent));
        };

        const handleUp = (upEvent: MouseEvent | TouchEvent) => {
            const finalTime = calculateTimeFromEvent(upEvent);
            player?.seek(finalTime);
            setIsScrubbing(false);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchend', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchend', handleUp);
    };

    // --- Volume Logic ---
    const calculateVolumeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!volumeBarRef.current) return 0;
        const rect = volumeBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct;
    };

    const handleVolumeStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!player) return;
        setIsVolumeScrubbing(true);
        const vol = calculateVolumeFromEvent(e);
        player.setVolume(vol);

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            player.setVolume(calculateVolumeFromEvent(moveEvent));
        };

        const handleUp = () => {
            setIsVolumeScrubbing(false);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchend', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchend', handleUp);
    };

    const handleProgressMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!state.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * state.duration;
        setHoverPos(percent * 100);
        setHoverTime(time);
        if (thumbnailCues.length > 0) {
            const cue = thumbnailCues.find(c => time >= c.start && time < c.end);
            setCurrentThumbnail(cue || null);
        }
    };

    const triggerSkip = (direction: 'forward' | 'rewind') => {
        if (!player) return;
        player.skip(direction === 'forward' ? 10 : -10);
        setSkipTrigger(direction);
        setTimeout(() => setSkipTrigger(null), 300);
    };

    // Close menus on outside click
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
            if (x < width * 0.35) {
                triggerSkip('rewind');
                setSeekAnimation({ type: 'rewind', id: now });
            } else if (x > width * 0.65) {
                triggerSkip('forward');
                setSeekAnimation({ type: 'forward', id: now });
            } else {
                player.toggleFullscreen();
            }
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                player.togglePlay();
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    // --- Dynamic Icons ---
    const VolIcon = state.isMuted || state.volume === 0 ? VolumeMuteIcon : state.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon;

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
            {/* Init Spinner */}
            {!player && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50">
                    <LoaderIcon className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            )}

            {player && (
                <>
                    <NotificationContainer notifications={state.notifications} />

                    {/* Click Layer */}
                    <div
                        className="absolute inset-0 z-0"
                        onClick={handleContainerClick}
                        aria-hidden="true"
                    />

                    {/* Double Tap Anim */}
                    {seekAnimation && (
                        <div
                            key={seekAnimation.id}
                            className={`absolute top-0 bottom-0 flex items-center justify-center w-[35%] z-20 bg-white/5 backdrop-blur-[1px] animate-out fade-out duration-500 ${seekAnimation.type === 'rewind' ? 'left-0 rounded-r-[4rem]' : 'right-0 rounded-l-[4rem]'}`}
                            onAnimationEnd={() => setSeekAnimation(null)}
                        >
                            <div className="flex flex-col items-center text-white drop-shadow-lg">
                                {seekAnimation.type === 'rewind' ? <Replay10Icon className="w-12 h-12 animate-pulse" /> : <Forward10Icon className="w-12 h-12 animate-pulse" />}
                                <span className="font-bold text-sm mt-2 font-mono">{seekAnimation.type === 'rewind' ? '-10s' : '+10s'}</span>
                            </div>
                        </div>
                    )}

                    {/* Buffering */}
                    {state.isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <LoaderIcon className="w-12 h-12 text-indigo-500 animate-spin drop-shadow-lg" />
                        </div>
                    )}

                    {/* Error Overlay */}
                    {state.error && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/90 backdrop-blur-md animate-in fade-in">
                            <div className="flex flex-col items-center gap-4 text-red-500 p-8 max-w-md text-center">
                                <span className="text-5xl mb-2">⚠️</span>
                                <h3 className="text-xl font-bold text-white">Playback Error</h3>
                                <p className="text-zinc-400 text-sm">{state.error}</p>
                                <button
                                    onClick={() => player.load(player.video.src, textTracks)}
                                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-500 transition-colors mt-4 shadow-lg hover:shadow-indigo-500/20"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Big Center Controls */}
                    {((!state.isPlaying && !state.isBuffering && !state.error) || showControls) && !state.isBuffering ? (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 pointer-events-none ${showControls || !state.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex items-center gap-8 md:gap-16 pointer-events-auto">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSettingsOpen(false);
                                        setSubtitleMenuOpen(false);
                                        triggerSkip('rewind');
                                    }}
                                    className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-110 text-white/90 focus:outline-none backdrop-blur-sm"
                                >
                                    <Replay10Icon className="w-6 h-6" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSettingsOpen(false);
                                        setSubtitleMenuOpen(false);
                                        player.togglePlay();
                                    }}
                                    className="group relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 hover:bg-indigo-600 border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-110 duration-75 focus:outline-none backdrop-blur-md"
                                >
                                    {state.isPlaying ?
                                        <PauseIcon className="w-8 h-8 md:w-9 md:h-9 text-white fill-current" /> :
                                        <PlayIcon className="w-8 h-8 md:w-9 md:h-9 text-white ml-1 fill-current" />
                                    }
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSettingsOpen(false);
                                        setSubtitleMenuOpen(false);
                                        triggerSkip('forward');
                                    }}
                                    className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-110 text-white/90 focus:outline-none backdrop-blur-sm"
                                >
                                    <Forward10Icon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Bottom Bar */}
                    <div
                        className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 px-4 md:px-6 pb-4 md:pb-6 pt-24 bg-gradient-to-t from-black/95 via-black/70 to-transparent ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                        onClick={(e) => {
                            // Clicking on the control bar background closes menus too
                            if (e.target === e.currentTarget) {
                                setSettingsOpen(false);
                                setSubtitleMenuOpen(false);
                            }
                            e.stopPropagation();
                        }}
                    >
                        {/* Scrubber */}
                        <div
                            ref={progressBarRef}
                            className="relative w-full h-3 group/slider mb-3 cursor-pointer touch-none flex items-center"
                            onMouseMove={handleProgressMove}
                            onMouseLeave={() => { setHoverTime(null); setCurrentThumbnail(null); }}
                            onMouseDown={handleSeekStart}
                            onTouchStart={handleSeekStart}
                        >
                            {/* Hover Thumbnail */}
                            {hoverTime !== null && (
                                <div
                                    className="absolute bottom-full mb-4 flex flex-col items-center transform -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-150"
                                    style={{
                                        left: `clamp(70px, ${hoverPos}%, calc(100% - 70px))`
                                    }}
                                >
                                    {currentThumbnail && (
                                        <div
                                            className="bg-black/90 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm"
                                            style={{
                                                width: `${currentThumbnail.w * 0.5}px`,
                                                height: `${currentThumbnail.h * 0.5}px`
                                            }}
                                        >
                                            <div
                                                style={{
                                                    backgroundImage: `url("${currentThumbnail.url}")`,
                                                    width: `${currentThumbnail.w}px`,
                                                    height: `${currentThumbnail.h}px`,
                                                    backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`,
                                                    backgroundRepeat: 'no-repeat',
                                                    transform: 'scale(0.5)',
                                                    transformOrigin: 'top left'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="bg-white text-black px-2 py-0.5 rounded text-[11px] font-bold font-mono shadow-lg tabular-nums mt-2">
                                        {formatTime(hoverTime)}
                                    </div>
                                </div>
                            )}

                            {/* Rail */}
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative backdrop-blur-sm">
                                {/* Buffered */}
                                {state.duration > 0 && state.buffered.map((range, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 bg-white/20"
                                        style={{
                                            left: `${(range.start / state.duration) * 100}%`,
                                            width: `${((range.end - range.start) / state.duration) * 100}%`
                                        }}
                                    />
                                ))}
                                {/* Progress */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-indigo-500"
                                    style={{ width: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }}
                                />
                            </div>

                            {/* Handle */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/slider:scale-100 transition-transform duration-100 z-10"
                                style={{ left: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }}
                            />
                        </div>

                        {/* Controls Container */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => player.togglePlay()}
                                    className="text-zinc-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 focus:outline-none"
                                >
                                    {state.isPlaying ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
                                </button>

                                <div
                                    className="flex items-center gap-2 group/vol"
                                    onMouseEnter={() => setIsVolumeHovered(true)}
                                    onMouseLeave={() => setIsVolumeHovered(false)}
                                >
                                    <button
                                        onClick={() => player.toggleMute()}
                                        className="text-zinc-300 hover:text-white p-2 rounded-lg hover:bg-white/10 focus:outline-none"
                                    >
                                        <VolIcon className="w-5 h-5" />
                                    </button>

                                    <div
                                        className={`relative h-8 flex items-center transition-all duration-300 ease-out overflow-hidden ${isVolumeHovered || isVolumeScrubbing ? 'w-24 opacity-100 ml-1' : 'w-0 opacity-0'}`}
                                    >
                                        <div
                                            ref={volumeBarRef}
                                            className="relative w-full h-full flex items-center cursor-pointer px-2"
                                            onMouseDown={handleVolumeStart}
                                            onTouchStart={handleVolumeStart}
                                        >
                                            {/* Bar Rail */}
                                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white rounded-full"
                                                    style={{ width: `${(state.isMuted ? 0 : state.volume) * 100}%` }}
                                                ></div>
                                            </div>

                                            {/* Grabber - Clamped visibility */}
                                            <div
                                                className="absolute h-3 w-3 bg-white rounded-full shadow-md top-1/2 -translate-y-1/2 pointer-events-none"
                                                style={{ left: `calc(${(state.isMuted ? 0 : state.volume) * 100}% * 0.85 + 4px)` }}
                                            />

                                            {/* Tooltip */}
                                            {(isVolumeScrubbing || isVolumeHovered) && (
                                                <div
                                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shadow-lg pointer-events-none whitespace-nowrap"
                                                >
                                                    {state.isMuted ? '0%' : `${Math.round(state.volume * 100)}%`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs font-medium text-zinc-400 font-mono select-none hidden sm:block tabular-nums">
                                    {formatTime(isScrubbing ? scrubbingTime : state.currentTime)} <span className="text-zinc-600">/</span> {formatTime(state.duration)}
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <div className="p-2 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                                    <google-cast-launcher></google-cast-launcher>
                                </div>

                                {/* Subtitle Popover */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSubtitleMenuOpen(!subtitleMenuOpen);
                                            setSettingsOpen(false);
                                        }}
                                        className={`p-2 rounded-lg transition-colors focus:outline-none ${subtitleMenuOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <SubtitleIcon className="w-5 h-5" />
                                    </button>
                                    {subtitleMenuOpen && (
                                        <SubtitleMenu
                                            tracks={state.subtitleTracks}
                                            current={state.currentSubtitle}
                                            onSelect={(idx: number) => player.setSubtitle(idx)}
                                            onUpload={(file: File) => player.addTextTrack(file, file.name)}
                                            onClose={() => setSubtitleMenuOpen(false)}
                                            offset={state.subtitleOffset}
                                            onOffsetChange={(val: number) => player.setSubtitleOffset(val)}
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={() => player.togglePip()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none"
                                >
                                    <PipIcon className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => player.download()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>

                                {/* Settings Popover */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSettingsOpen(!settingsOpen);
                                            setSubtitleMenuOpen(false);
                                            setActiveMenu('main');
                                        }}
                                        className={`p-2 rounded-lg transition-all duration-300 focus:outline-none ${settingsOpen ? 'rotate-90 text-indigo-400 bg-indigo-500/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <SettingsIcon className="w-5 h-5" />
                                    </button>

                                    {settingsOpen && (
                                        <Menu onClose={() => setSettingsOpen(false)} align="right">
                                            <div className="w-full">
                                                {activeMenu === 'main' && (
                                                    <div className="animate-in slide-in-from-left-4 fade-in duration-200">
                                                        <MenuItem label="Speed" value={`${state.playbackRate}x`} onClick={() => setActiveMenu('speed')} hasSubmenu />
                                                        <MenuItem
                                                            label="Quality"
                                                            value={state.currentQuality === -1 ? 'Auto' : `${state.qualityLevels[state.currentQuality]?.height}p`}
                                                            onClick={() => setActiveMenu('quality')}
                                                            hasSubmenu
                                                        />
                                                        <MenuItem
                                                            label="Audio"
                                                            value={state.audioTracks[state.currentAudioTrack]?.label || 'Default'}
                                                            onClick={() => setActiveMenu('audio')}
                                                            hasSubmenu
                                                        />
                                                        <MenuItem
                                                            label="Audio Boost"
                                                            value={state.audioGain > 1 ? `${state.audioGain}x` : 'Off'}
                                                            onClick={() => setActiveMenu('boost')}
                                                            hasSubmenu
                                                        />
                                                        <MenuDivider />
                                                        <MenuItem
                                                            label="Watch Party"
                                                            icon={<UsersIcon className="w-4 h-4" />}
                                                            onClick={() => setActiveMenu('party')}
                                                            hasSubmenu
                                                        />
                                                        <MenuItem
                                                            label="Cast to Device"
                                                            icon={<CastIcon className="w-4 h-4" />}
                                                            onClick={() => {
                                                                player.requestCast();
                                                                setSettingsOpen(false);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {/* Submenus */}
                                                {['speed', 'quality', 'audio', 'boost', 'party'].includes(activeMenu) && (
                                                    <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                                                        {activeMenu === 'speed' && (
                                                            <>
                                                                <MenuHeader label="Speed" onBack={() => setActiveMenu('main')} />
                                                                {[0.5, 1, 1.5, 2].map(rate => (
                                                                    <MenuItem key={rate} label={`${rate}x`} active={state.playbackRate === rate} onClick={() => player.video.playbackRate = rate} />
                                                                ))}
                                                            </>
                                                        )}
                                                        {activeMenu === 'quality' && (
                                                            <>
                                                                <MenuHeader label="Quality" onBack={() => setActiveMenu('main')} />
                                                                <MenuItem label="Auto" active={state.currentQuality === -1} onClick={() => player.setQuality(-1)} />
                                                                {state.qualityLevels.map((lvl) => (
                                                                    <MenuItem key={lvl.index} label={`${lvl.height}p`} value={`${Math.round(lvl.bitrate / 1000)}k`} active={state.currentQuality === lvl.index} onClick={() => player.setQuality(lvl.index)} />
                                                                ))}
                                                            </>
                                                        )}
                                                        {activeMenu === 'audio' && (
                                                            <>
                                                                <MenuHeader label="Audio Track" onBack={() => setActiveMenu('main')} />
                                                                {state.audioTracks.length === 0 && <div className="px-4 py-3 text-zinc-500 text-xs text-center">No tracks available</div>}
                                                                {state.audioTracks.map((track) => (
                                                                    <MenuItem key={track.index} label={track.label} value={track.language} active={state.currentAudioTrack === track.index} onClick={() => player.setAudioTrack(track.index)} />
                                                                ))}
                                                            </>
                                                        )}
                                                        {activeMenu === 'boost' && (
                                                            <>
                                                                <MenuHeader label="Audio Boost" onBack={() => setActiveMenu('main')} />
                                                                {[1, 1.5, 2, 3].map(gain => (
                                                                    <MenuItem key={gain} label={gain === 1 ? 'Off' : `${gain}x`} active={state.audioGain === gain} onClick={() => player.setAudioGain(gain)} />
                                                                ))}
                                                            </>
                                                        )}
                                                        {activeMenu === 'party' && (
                                                            <>
                                                                <MenuHeader label="Watch Party" onBack={() => setActiveMenu('main')} />
                                                                <div className="p-4 space-y-3">
                                                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                                                        Create a synchronized room on WatchParty.me to watch together.
                                                                    </p>
                                                                    <a
                                                                        href={`https://www.watchparty.me/create?video=${encodeURIComponent(src)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-xs"
                                                                    >
                                                                        Create Room
                                                                    </a>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Menu>
                                    )}
                                </div>

                                <button
                                    onClick={() => player.toggleFullscreen()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-transform hover:scale-110 focus:outline-none"
                                >
                                    {state.isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
