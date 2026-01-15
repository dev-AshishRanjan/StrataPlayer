
import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { StrataCore, PlayerState, INITIAL_STATE } from '../core/StrataCore';
import { HlsPlugin } from '../plugins/HlsPlugin';
import { PlayIcon, PauseIcon, VolumeIcon, MaximizeIcon, MinimizeIcon, SettingsIcon, CheckIcon, PipIcon, SubtitleIcon, DownloadIcon, ReplayIcon, ForwardIcon, ArrowLeftIcon } from './Icons';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'google-cast-launcher': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

declare global {
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

// --- Components ---

const NotificationContainer = ({ notifications }: { notifications: PlayerState['notifications'] }) => {
    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`
                        bg-black/80 backdrop-blur-md border border-white/10 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-3 animate-in slide-in-from-left-2 fade-in duration-300 max-w-sm
                        ${n.type === 'error' ? 'border-red-500/50 text-red-100' : ''}
                        ${n.type === 'warning' ? 'border-amber-500/50 text-amber-100' : ''}
                    `}
                >
                    {n.type === 'loading' && (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0"></div>
                    )}
                    <div className="flex flex-col gap-1 w-full">
                        <span>{n.message}</span>
                        {typeof n.progress === 'number' && (
                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${n.progress}%` }}></div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Menu = ({ children, onClose }: { children?: React.ReactNode; onClose: () => void }) => {
    return (
        <div className="absolute bottom-16 right-4 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[240px] text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 ring-1 ring-white/5 max-h-[70vh] overflow-y-auto hide-scrollbar">
            {children}
        </div>
    );
};

const MenuItem = ({ label, value, active, onClick, hasSubmenu }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors text-left text-zinc-200 active:bg-white/5 focus:outline-none focus:bg-white/10">
        <span className="flex-1 font-medium">{label}</span>
        <div className="flex items-center gap-2 text-zinc-400">
            <span>{value}</span>
            {active && <CheckIcon className="w-4 h-4 text-white" />}
            {hasSubmenu && <span className="text-xs">›</span>}
        </div>
    </button>
);

const MenuHeader = ({ label, onBack }: { label: string, onBack: () => void }) => (
    <button
        className="w-full px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-white/10 flex items-center gap-2 hover:bg-white/5 transition-colors focus:outline-none sticky top-0 bg-black/95 z-10"
        onClick={onBack}
    >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>{label}</span>
    </button>
);

// --- Main Player Component ---

interface StrataPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
}

export const StrataPlayer = ({ src, poster, autoPlay }: StrataPlayerProps) => {
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
    const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'boost'>('main');
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);

    // Seek & Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubbingTime, setScrubbingTime] = useState(0);

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
            player.load(src);
        }
    }, [src, player]);

    useEffect(() => {
        if (player && autoPlay) {
            player.video.muted = true;
            player.store.setState({ isMuted: true });
            player.play().catch(() => { });
        }
    }, [player, autoPlay]);

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
        controlsTimeoutRef.current = setTimeout(() => {
            if (!state.isPlaying) return;
            setShowControls(false);
            setSettingsOpen(false);
        }, 2500);
    };

    // --- Seek Logic Rewritten ---
    const calculateTimeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!progressBarRef.current || !state.duration) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
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

    // --- Volume Logic Rewritten ---
    const handleVolumeChange = (e: React.MouseEvent | React.TouchEvent) => {
        if (!volumeBarRef.current || !player) return;
        const rect = volumeBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        player.setVolume(pct);
    };

    const handleProgressMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!state.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        setHoverPos(percent * 100);
        setHoverTime(percent * state.duration);
    };

    // Skip Button Animation Handler
    const triggerSkip = (direction: 'forward' | 'rewind') => {
        if (!player) return;
        player.skip(direction === 'forward' ? 10 : -10);
        setSkipTrigger(direction);
        setTimeout(() => setSkipTrigger(null), 300); // Reset after anim
    };

    // Robust Single/Double Click Handler
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player) return;
        if (settingsOpen) { setSettingsOpen(false); return; }

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

    return (
        <div
            ref={containerRef}
            className="group relative w-full h-full bg-black overflow-hidden select-none font-sans outline-none touch-none rounded-xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (state.isPlaying) setShowControls(false); }}
            tabIndex={0}
            role="region"
            aria-label="Video Player"
        >
            {/* Initialization State */}
            {!player && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-50">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}

            {player && (
                <>
                    {/* Notifications Layer */}
                    <NotificationContainer notifications={state.notifications} />

                    {/* Gesture Overlay (Click Handler) */}
                    <div
                        className="absolute inset-0 z-0"
                        onClick={handleContainerClick}
                        aria-hidden="true"
                    />

                    {/* Double Tap Animation Overlay */}
                    {seekAnimation && (
                        <div
                            key={seekAnimation.id}
                            className={`absolute top-0 bottom-0 flex items-center justify-center w-[35%] z-20 bg-white/10 backdrop-blur-[2px] animate-out fade-out duration-700 ${seekAnimation.type === 'rewind' ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'}`}
                            onAnimationEnd={() => setSeekAnimation(null)}
                        >
                            <div className="flex flex-col items-center text-white/90 drop-shadow-md">
                                {seekAnimation.type === 'rewind' ? <ReplayIcon className="w-12 h-12 animate-ping" /> : <ForwardIcon className="w-12 h-12 animate-ping" />}
                                <span className="font-bold text-lg mt-2 font-mono">{seekAnimation.type === 'rewind' ? '-10s' : '+10s'}</span>
                            </div>
                        </div>
                    )}

                    {/* Buffering Indicator */}
                    {state.isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {/* Error Message - Fatal */}
                    {state.error && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/90 backdrop-blur-md animate-in fade-in">
                            <div className="flex flex-col items-center gap-4 text-red-500 p-6 max-w-md text-center">
                                <span className="text-5xl mb-2">⚠️</span>
                                <h3 className="text-xl font-bold text-white">Playback Error</h3>
                                <p className="text-zinc-400">{state.error}</p>
                                <button
                                    onClick={() => player.load(player.video.src)}
                                    className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors mt-2"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Center Controls Overlay */}
                    {((!state.isPlaying && !state.isBuffering && !state.error) || showControls) && !state.isBuffering ? (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 pointer-events-none ${showControls || !state.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex items-center gap-8 md:gap-12 pointer-events-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); triggerSkip('rewind'); }}
                                    className={`group flex items-center justify-center w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-90 text-white/90 focus:outline-none ${skipTrigger === 'rewind' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                                    aria-label="Rewind 10 seconds"
                                >
                                    <ReplayIcon className="w-6 h-6 md:w-7 md:h-7" />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); player.togglePlay(); }}
                                    className="group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/50 hover:bg-indigo-600/90 border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95 focus:outline-none"
                                    aria-label={state.isPlaying ? "Pause" : "Play"}
                                >
                                    <div className={`transition-all duration-300 transform ${state.isPlaying ? 'scale-100' : 'scale-100'}`}>
                                        {state.isPlaying ?
                                            <PauseIcon className="w-10 h-10 md:w-12 md:h-12 text-white fill-current" /> :
                                            <PlayIcon className="w-10 h-10 md:w-12 md:h-12 text-white ml-1 fill-current" />
                                        }
                                    </div>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); triggerSkip('forward'); }}
                                    className={`group flex items-center justify-center w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all active:scale-90 text-white/90 focus:outline-none ${skipTrigger === 'forward' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                                    aria-label="Forward 10 seconds"
                                >
                                    <ForwardIcon className="w-6 h-6 md:w-7 md:h-7" />
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Bottom Controls */}
                    <div
                        className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 px-3 md:px-6 pb-3 md:pb-5 pt-24 bg-gradient-to-t from-black/90 via-black/60 to-transparent ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Progress Bar Container */}
                        <div
                            ref={progressBarRef}
                            className="relative w-full h-4 group/slider mb-2 cursor-pointer touch-none flex items-center py-2"
                            onMouseMove={handleProgressMove}
                            onMouseLeave={() => setHoverTime(null)}
                            onMouseDown={handleSeekStart}
                            onTouchStart={handleSeekStart}
                        >
                            {/* Hover Tooltip */}
                            {hoverTime !== null && (
                                <div
                                    className="absolute bottom-full mb-3 bg-black/90 border border-white/10 px-2 py-1 rounded text-xs font-mono text-white pointer-events-none transform -translate-x-1/2 whitespace-nowrap z-40 hidden md:block shadow-lg"
                                    style={{ left: `${hoverPos}%` }}
                                >
                                    {formatTime(hoverTime)}
                                </div>
                            )}

                            {/* Track Background */}
                            <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden pointer-events-none">
                                {/* Buffered Ranges */}
                                {state.duration > 0 && state.buffered.map((range, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 bg-white/30"
                                        style={{
                                            left: `${(range.start / state.duration) * 100}%`,
                                            width: `${((range.end - range.start) / state.duration) * 100}%`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Played Track */}
                            <div
                                className="absolute left-0 h-1 bg-indigo-500 rounded-full group-hover/slider:h-1.5 transition-all duration-200 pointer-events-none"
                                style={{ width: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full scale-0 group-hover/slider:scale-100 transition-transform shadow-md z-10 translate-x-1/2"></div>
                            </div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={() => player.togglePlay()}
                                    className="text-white/90 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label={state.isPlaying ? "Pause" : "Play"}
                                >
                                    {state.isPlaying ? <PauseIcon className="w-6 h-6 md:w-7 md:h-7" /> : <PlayIcon className="w-6 h-6 md:w-7 md:h-7" />}
                                </button>

                                <div className="flex items-center gap-2 group/vol">
                                    <button
                                        onClick={() => player.toggleMute()}
                                        className="text-white/90 hover:text-white p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        aria-label={state.isMuted ? "Unmute" : "Mute"}
                                    >
                                        <VolumeIcon level={state.isMuted ? 0 : state.volume} className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>

                                    <div
                                        ref={volumeBarRef}
                                        className="relative w-0 group-hover/vol:w-16 md:group-hover/vol:w-24 transition-all duration-300 h-6 flex items-center cursor-pointer"
                                        onClick={handleVolumeChange}
                                    >
                                        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-white rounded-full pointer-events-none"
                                                style={{ width: `${(state.isMuted ? 0 : state.volume) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs font-medium text-zinc-300 font-mono select-none hidden sm:block">
                                    {formatTime(isScrubbing ? scrubbingTime : state.currentTime)} / {formatTime(state.duration)}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                {/* Google Cast */}
                                <div className="p-2 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                                    <google-cast-launcher></google-cast-launcher>
                                </div>

                                <button
                                    onClick={() => player.togglePip()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label="Picture in Picture"
                                >
                                    <PipIcon className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => player.download()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors hidden sm:block focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label="Download Video"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSettingsOpen(!settingsOpen); setActiveMenu('main'); }}
                                        className={`text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${settingsOpen ? 'rotate-45 text-white bg-white/10' : ''}`}
                                        aria-label="Settings"
                                        aria-haspopup="true"
                                        aria-expanded={settingsOpen}
                                    >
                                        <SettingsIcon className="w-5 h-5" />
                                    </button>

                                    {settingsOpen && (
                                        <Menu onClose={() => setSettingsOpen(false)}>
                                            {activeMenu === 'main' && (
                                                <>
                                                    <MenuItem label="Speed" value={`${state.playbackRate}x`} onClick={() => setActiveMenu('speed')} hasSubmenu />
                                                    <MenuItem
                                                        label="Quality"
                                                        value={state.currentQuality === -1 ? 'Auto' : `${state.qualityLevels[state.currentQuality]?.height}p`}
                                                        onClick={() => setActiveMenu('quality')}
                                                        hasSubmenu
                                                    />
                                                    {state.audioTracks.length > 1 && (
                                                        <MenuItem
                                                            label="Audio"
                                                            value={state.audioTracks[state.currentAudioTrack]?.label || 'Default'}
                                                            onClick={() => setActiveMenu('audio')}
                                                            hasSubmenu
                                                        />
                                                    )}
                                                    {state.subtitleTracks.length > 0 && (
                                                        <MenuItem
                                                            label="Subtitles"
                                                            value={state.currentSubtitle === -1 ? 'Off' : state.subtitleTracks[state.currentSubtitle]?.label}
                                                            onClick={() => setActiveMenu('subtitles')}
                                                            hasSubmenu
                                                        />
                                                    )}
                                                    <MenuItem
                                                        label="Audio Boost"
                                                        value={state.audioGain > 1 ? `${state.audioGain}x` : 'Off'}
                                                        onClick={() => setActiveMenu('boost')}
                                                        hasSubmenu
                                                    />
                                                </>
                                            )}
                                            {activeMenu === 'speed' && (
                                                <>
                                                    <MenuHeader label="Speed" onBack={() => setActiveMenu('main')} />
                                                    {[0.5, 1, 1.5, 2].map(rate => (
                                                        <MenuItem
                                                            key={rate}
                                                            label={`${rate}x`}
                                                            active={state.playbackRate === rate}
                                                            onClick={() => { player.video.playbackRate = rate; }}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {activeMenu === 'quality' && (
                                                <>
                                                    <MenuHeader label="Quality" onBack={() => setActiveMenu('main')} />
                                                    <MenuItem
                                                        label="Auto"
                                                        active={state.currentQuality === -1}
                                                        onClick={() => player.setQuality(-1)}
                                                    />
                                                    {state.qualityLevels.map((lvl) => (
                                                        <MenuItem
                                                            key={lvl.index}
                                                            label={`${lvl.height}p`}
                                                            value={`${Math.round(lvl.bitrate / 1000)}k`}
                                                            active={state.currentQuality === lvl.index}
                                                            onClick={() => player.setQuality(lvl.index)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {activeMenu === 'audio' && (
                                                <>
                                                    <MenuHeader label="Audio Track" onBack={() => setActiveMenu('main')} />
                                                    {state.audioTracks.map((track) => (
                                                        <MenuItem
                                                            key={track.index}
                                                            label={track.label}
                                                            value={track.language}
                                                            active={state.currentAudioTrack === track.index}
                                                            onClick={() => player.setAudioTrack(track.index)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {activeMenu === 'subtitles' && (
                                                <>
                                                    <MenuHeader label="Subtitles" onBack={() => setActiveMenu('main')} />
                                                    <MenuItem
                                                        label="Off"
                                                        active={state.currentSubtitle === -1}
                                                        onClick={() => player.setSubtitle(-1)}
                                                    />
                                                    {state.subtitleTracks.map((track) => (
                                                        <MenuItem
                                                            key={track.index}
                                                            label={track.label}
                                                            value={track.language}
                                                            active={state.currentSubtitle === track.index}
                                                            onClick={() => player.setSubtitle(track.index)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {activeMenu === 'boost' && (
                                                <>
                                                    <MenuHeader label="Audio Boost" onBack={() => setActiveMenu('main')} />
                                                    {[1, 1.5, 2, 3].map(gain => (
                                                        <MenuItem
                                                            key={gain}
                                                            label={gain === 1 ? 'Off' : `${gain}x`}
                                                            active={state.audioGain === gain}
                                                            onClick={() => player.setAudioGain(gain)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        </Menu>
                                    )}
                                </div>

                                <button
                                    onClick={() => player.toggleFullscreen()}
                                    className="text-zinc-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label={state.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
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
