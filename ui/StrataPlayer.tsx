
import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { StrataCore, PlayerState, TextTrackConfig, SubtitleSettings, PlayerTheme, StrataConfig, getResolvedState, DEFAULT_STATE, IPlugin, PlayerSource, ControlItem, ContextMenuItem, SettingItem } from '../core/StrataCore';
import { formatTime, parseVTT, ThumbnailCue } from '../utils/playerUtils';
import { useTransition } from './hooks/useTransition';
import { NotificationContainer } from './components/NotificationContainer';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { Menu, MenuItem, MenuHeader, MenuDivider, MenuExplorer } from './components/Menu';
import { SubtitleMenu } from './components/SubtitleMenu';
import { ContextMenu } from './components/ContextMenu';
import { VideoInfo } from './components/VideoInfo';
import { SettingsGroup, Toggle, Slider, Select } from './components/SettingsPrimitives';
import {
    PlayIcon, PauseIcon, VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon,
    MaximizeIcon, MinimizeIcon, SettingsIcon, PipIcon,
    SubtitleIcon, DownloadIcon, Replay10Icon, Forward10Icon,
    LoaderIcon, CastIcon, UsersIcon, PaletteIcon, CheckIcon,
    CustomizeIcon, CameraIcon, LockIcon, UnlockIcon, WebFullscreenIcon,
    FastForwardIcon, RatioIcon, ExpandIcon, InfoIcon,
    ServerIcon, LayersIcon, CropIcon, SpeakerIcon, FlipIcon, GaugeIcon, MusicIcon, WifiIcon, AlertCircleIcon
} from './Icons';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'google-cast-launcher': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

// Helper to determine best contrast color (black or white) for a given hex background
function getContrastColor(hex: string) {
    if (!hex) return '#ffffff';
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

// --- Main Player Component ---

interface StrataPlayerProps extends StrataConfig {
    src?: string; // Optional if sources are provided
    type?: string; // Optional: Explicitly define type for the src (e.g. 'hls', 'dash')
    sources?: PlayerSource[]; // Array of sources
    poster?: string;
    thumbnails?: string; // URL to VTT thumbnails
    textTracks?: TextTrackConfig[];
    plugins?: IPlugin[]; // Allow injecting plugins from outside
    autoPlay?: boolean; // Added prop
    onGetInstance?: (core: StrataCore) => void; // Expose instance
}

const THEME_COLORS = [
    { label: 'Strata', value: '#6366f1' },
    { label: 'Emerald', value: '#10b981' },
    { label: 'Rose', value: '#f43f5e' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Sky', value: '#0ea5e9' },
    { label: 'Violet', value: '#8b5cf6' },
];

const THEMES: { label: string, value: PlayerTheme, color: string }[] = [
    { label: 'Default', value: 'default', color: '#6366f1' },
    { label: 'Pixel', value: 'pixel', color: '#ef4444' },
    { label: 'Game', value: 'game', color: '#eab308' },
    { label: 'Hacker', value: 'hacker', color: '#22c55e' },
];

// Helper to render HTML strings safely or pass nodes through
const HtmlOrNode = ({ content, className, style }: { content: string | React.ReactNode, className?: string, style?: React.CSSProperties }) => {
    if (typeof content === 'string') {
        if (content.trim().startsWith('<')) {
            return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: content }} />;
        }
        return <div className={className} style={style}>{content}</div>;
    }
    return <div className={className} style={style}>{content}</div>;
};

export const StrataPlayer = (props: StrataPlayerProps) => {
    const { src, type, sources, poster, autoPlay, thumbnails, textTracks, plugins, onGetInstance, ...config } = props;

    // Default configs for optionals
    const useScreenshot = config.screenshot ?? false;
    const usePip = config.pip ?? true;
    const useSetting = config.setting ?? true;
    const useFullscreen = config.fullscreen ?? true;
    const useFullscreenWeb = config.fullscreenWeb ?? false;
    const useLock = config.lock ?? false;
    const useFastForward = config.fastForward ?? true;
    const useFlip = config.flip ?? true;
    const useAspectRatio = config.aspectRatio ?? true;
    const useHotKey = config.hotKey ?? true;
    const isBackdrop = config.backdrop ?? true;
    const useGestureSeek = config.gestureSeek ?? false;
    const useCenterControls = config.centerControls ?? true;
    const fetchTimeout = config.fetchTimeout ?? 30000;

    // Default AutoOrientation to true
    const useAutoOrientation = config.autoOrientation ?? true;

    const containerRef = useRef<HTMLDivElement>(null);
    const [player, setPlayer] = useState<StrataCore | null>(null);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [playerHeight, setPlayerHeight] = useState(0);
    const [playerWidth, setPlayerWidth] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Resolve initial state based on props + defaults + localStorage BEFORE mounting
    const initialState = useMemo(() => getResolvedState(config), []);

    const state = useSyncExternalStore<PlayerState>(
        useCallback((cb) => player ? player.store.subscribe(cb) : () => { }, [player]),
        () => player ? player.store.get() : initialState,
        () => initialState
    );

    const accentContrast = useMemo(() => getContrastColor(state.themeColor), [state.themeColor]);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
    // Active menu in Settings. Supports built-ins + dynamic 'custom-{index}' for user settings
    const [activeMenu, setActiveMenu] = useState<string>('main');

    // State for Custom Control Popovers (track ID of open control)
    const [activeControlId, setActiveControlId] = useState<string | null>(null);
    // Ref to track last active control for exit animations
    const lastActiveControlId = useRef<string | null>(null);
    if (activeControlId) lastActiveControlId.current = activeControlId;

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });
    const [showVideoInfo, setShowVideoInfo] = useState(false);

    // Transition States - Increased to 300ms to match CSS transition-duration
    const settingsTransition = useTransition(settingsOpen, 300);
    const subtitleTransition = useTransition(subtitleMenuOpen, 300);
    const controlTransition = useTransition(!!activeControlId, 300);

    // Helper to close all menus
    const closeAllMenus = useCallback(() => {
        setSettingsOpen(false);
        setSubtitleMenuOpen(false);
        setActiveControlId(null);
        setContextMenu(prev => ({ ...prev, visible: false }));
        // We generally don't reset activeMenu so if user re-opens settings they are where they left off, 
        // or you can reset it: setActiveMenu('main');
    }, []);

    // Seek & Scrubbing State
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubbingTime, setScrubbingTime] = useState(0);
    const [isVolumeScrubbing, setIsVolumeScrubbing] = useState(false);
    const [isVolumeHovered, setIsVolumeHovered] = useState(false);
    const [isVolumeLocked, setIsVolumeLocked] = useState(false); // For mobile/touch

    const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);
    const [currentThumbnail, setCurrentThumbnail] = useState<ThumbnailCue | null>(null);
    const [seekAnimation, setSeekAnimation] = useState<{ type: 'forward' | 'rewind', id: number } | null>(null);
    const [skipTrigger, setSkipTrigger] = useState<'forward' | 'rewind' | null>(null);

    // Fast Forward State
    const [isFastForwarding, setIsFastForwarding] = useState(false);
    const fastForwardTimerRef = useRef<any>(null);
    const originalRateRef = useRef<number>(1);

    // Gesture Refs
    const touchStartX = useRef<number | null>(null);
    const touchStartTime = useRef<number>(0);
    const isDraggingRef = useRef(false);

    const clickTimeoutRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<any>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeBarRef = useRef<HTMLDivElement>(null);
    const animationCleanupRef = useRef<any>(null);

    // Force re-attach player to container when WebFullscreen toggles (Portal)
    useLayoutEffect(() => {
        if (player && containerRef.current) {
            player.attach(containerRef.current);
        }
    }, [player, state.isWebFullscreen]);

    // Separate ResizeObserver to ensure it tracks the correct DOM node through portal transitions
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const updateDims = () => {
            if (containerRef.current) {
                setPlayerHeight(containerRef.current.clientHeight);
                setPlayerWidth(containerRef.current.clientWidth);
            }
        };

        // Initialize size immediately
        updateDims();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPlayerHeight(entry.contentRect.height);
                setPlayerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [state.isWebFullscreen]); // Re-bind when portal state changes

    useEffect(() => {
        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);

        if (!containerRef.current) return;
        // Pass poster into core config so metadata can use it
        const core = new StrataCore({ ...config, poster });

        // Register plugins
        if (plugins && plugins.length > 0) {
            plugins.forEach(p => core.use(p));
        }

        core.attach(containerRef.current);
        setPlayer(core);
        if (onGetInstance) onGetInstance(core);

        // Core Init complete

        return () => {
            core.destroy();
            setPlayer(null);
        };
    }, []); // Only runs once on mount to setup Core

    // Reactive Prop Updates
    useEffect(() => {
        if (!player) return;
        const updates: any = {};
        if (config.theme !== undefined && config.theme !== state.theme) updates.theme = config.theme;
        if (config.themeColor !== undefined && config.themeColor !== state.themeColor) updates.themeColor = config.themeColor;
        if (config.iconSize !== undefined && config.iconSize !== state.iconSize) updates.iconSize = config.iconSize;

        if (Object.keys(updates).length > 0) {
            player.setAppearance(updates);
        }

        if (config.volume !== undefined && Math.abs(config.volume - state.volume) > 0.01) player.setVolume(config.volume);
        if (config.muted !== undefined && config.muted !== state.isMuted) {
            if (config.muted) player.video.muted = true;
            else { player.video.muted = false; }
        }
    }, [player, config.theme, config.themeColor, config.iconSize, config.volume, config.muted]);

    useEffect(() => {
        if (!player) return;
        const tracks = textTracks || [];
        if (sources && sources.length > 0) {
            setHasPlayed(false);
            player.setSources(sources, tracks);
        } else if (src) {
            setHasPlayed(false);
            player.setSources([{ url: src, type: type || 'auto' }], tracks);
        }
    }, [src, type, sources, textTracks, player]);

    useEffect(() => {
        if (player && autoPlay) {
            // Note: Autoplay might be blocked by browsers if not muted, but user requested unmuted default.
            player.play().catch(() => {
                // If autoplay fails (likely due to audio), we could fallback to mute, but keeping strictly as requested.
                console.warn('Autoplay failed (likely needs user interaction)');
            });
        }
    }, [player, autoPlay]);

    useEffect(() => {
        if (state.isPlaying && !hasPlayed) setHasPlayed(true);
    }, [state.isPlaying, hasPlayed]);

    useEffect(() => {
        if (thumbnails && player) {
            parseVTT(thumbnails, player.notify.bind(player), fetchTimeout).then(setCues => setThumbnailCues(setCues));
        } else setThumbnailCues([]);
    }, [thumbnails, player, fetchTimeout]);

    // Safety cleanup for seek animation if onAnimationEnd fails
    useEffect(() => {
        if (seekAnimation) {
            if (animationCleanupRef.current) clearTimeout(animationCleanupRef.current);
            animationCleanupRef.current = setTimeout(() => {
                setSeekAnimation(null);
            }, 600); // slightly longer than 500ms animation
        }
        return () => {
            if (animationCleanupRef.current) clearTimeout(animationCleanupRef.current);
        };
    }, [seekAnimation]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!player || !useHotKey) return;
            if (document.activeElement?.tagName === 'INPUT') return;
            const key = e.key.toLowerCase();
            switch (key) {
                case ' ': case 'k': e.preventDefault(); player.togglePlay(); break;
                case 'arrowright': e.preventDefault(); player.skip(5); break;
                case 'arrowleft': e.preventDefault(); player.skip(-5); break;
                case 'arrowup': e.preventDefault(); player.setVolume(player.video.volume + 0.1); break;
                case 'arrowdown': e.preventDefault(); player.setVolume(player.video.volume - 0.1); break;
                case 'f': e.preventDefault(); player.toggleFullscreen(); break;
                case 'm': e.preventDefault(); player.toggleMute(); break;
                case 'escape':
                    // Check store directly to avoid stale state in closure
                    if (player.store.get().isWebFullscreen) {
                        e.preventDefault();
                        player.toggleWebFullscreen();
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player, useHotKey]);

    const handleMouseMove = () => {
        if (!player) return;
        // Even if locked, we want to wake up controls so the lock button becomes visible
        player.setControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (settingsOpen || subtitleMenuOpen || activeControlId) return;
        controlsTimeoutRef.current = setTimeout(() => {
            if (!state.isPlaying || settingsOpen || subtitleMenuOpen || activeControlId) return;
            player.setControlsVisible(false);
        }, 2500);
    };

    useEffect(() => {
        if (!player) return;
        if (!settingsOpen && !subtitleMenuOpen && !activeControlId && state.isPlaying) handleMouseMove();
        else if (settingsOpen || subtitleMenuOpen || activeControlId) {
            player.setControlsVisible(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        }
    }, [settingsOpen, subtitleMenuOpen, activeControlId, state.isPlaying, player]);

    // --- Fast Forward Logic ---
    const startFastForward = useCallback(() => {
        if (!useFastForward || !player || !state.isPlaying || state.isLocked) return;

        // Prevent gestures if menus are open
        if (settingsOpen || subtitleMenuOpen || activeControlId) {
            closeAllMenus();
            return;
        }

        originalRateRef.current = player.video.playbackRate;
        fastForwardTimerRef.current = setTimeout(() => {
            player.video.playbackRate = 2;
            setIsFastForwarding(true);
        }, 500); // 500ms delay for long press
    }, [useFastForward, player, state.isPlaying, state.isLocked, settingsOpen, subtitleMenuOpen, activeControlId]);

    const stopFastForward = useCallback(() => {
        if (fastForwardTimerRef.current) clearTimeout(fastForwardTimerRef.current);
        if (isFastForwarding && player) {
            player.video.playbackRate = originalRateRef.current; // Restore original rate
            setIsFastForwarding(false);
        }
    }, [isFastForwarding, player]);

    // --- Gesture Seek Logic ---
    const handleTouchStart = (e: React.TouchEvent) => {
        startFastForward();

        // Prevent gestures if menus are open
        if (settingsOpen || subtitleMenuOpen || activeControlId) {
            closeAllMenus();
            return;
        }

        if (useGestureSeek && !state.isLocked) {
            touchStartX.current = e.touches[0].clientX;
            touchStartTime.current = state.currentTime;
            isDraggingRef.current = false;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (state.isLocked) return;

        // If we are moving and gesture seek is enabled
        if (useGestureSeek && touchStartX.current !== null) {
            const deltaX = e.touches[0].clientX - touchStartX.current;

            // Threshold to start dragging
            if (Math.abs(deltaX) > 10) {
                // If we start dragging, cancel any pending fast forward
                stopFastForward();

                isDraggingRef.current = true;
                setIsScrubbing(true);

                if (containerRef.current && state.duration) {
                    const rect = containerRef.current.getBoundingClientRect();
                    // Sensitivity: map drag distance to timeline progress directly relative to container width
                    const deltaRatio = deltaX / rect.width;
                    const newTime = Math.max(0, Math.min(state.duration, touchStartTime.current + (deltaRatio * state.duration)));
                    setScrubbingTime(newTime);
                }
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        stopFastForward();

        if (useGestureSeek && isDraggingRef.current) {
            player?.seek(scrubbingTime);
            setIsScrubbing(false);
            isDraggingRef.current = false;
            touchStartX.current = null;
            // Prevent subsequent click event from toggling play
            return;
        }

        touchStartX.current = null;
    };

    const calculateTimeFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!progressBarRef.current || !state.duration) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct * state.duration;
    };

    const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (state.isLocked) return;

        // Ensure menus close when interacting with progress bar
        if (settingsOpen || subtitleMenuOpen || activeControlId) {
            closeAllMenus();
        }

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
        e.stopPropagation();
        if (!player || state.isLocked) return;
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
        if (!state.duration || state.isLive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * state.duration;
        setHoverPos(percent * 100);
        setHoverTime(time);
        if (thumbnailCues.length > 0) setCurrentThumbnail(thumbnailCues.find(c => time >= c.start && time < c.end) || null);
    };

    const triggerSkip = (direction: 'forward' | 'rewind') => {
        if (!player || state.isLocked) return;
        player.skip(direction === 'forward' ? 10 : -10);
        setSkipTrigger(direction);
        setTimeout(() => setSkipTrigger(null), 300);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player) return;

        // If we just finished a drag gesture, ignore the click
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            return;
        }

        // Close menus on outside click. If menus were open, stop here (don't toggle play/seek).
        if (settingsOpen || subtitleMenuOpen || activeControlId || contextMenu.visible) {
            closeAllMenus();
            return;
        }

        if (isVolumeLocked) setIsVolumeLocked(false);

        // Wake up controls so lock button is visible if locked
        player.setControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!state.isPlaying || settingsOpen || subtitleMenuOpen || activeControlId) return;
            player.setControlsVisible(false);
        }, 2500);

        // If locked, do nothing else (prevent play/pause, seek, double tap)
        if (state.isLocked) return;

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

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent container click from firing
        if (state.isLocked) return;

        // Close other menus first
        closeAllMenus();

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Small timeout to allow state updates (closeAllMenus) to propagate
        // before opening the new context menu
        requestAnimationFrame(() => {
            setContextMenu({
                visible: true,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        });
    };

    const handleVolumeIconClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        closeAllMenus(); // Close context menu if open

        if (isVolumeLocked) {
            setIsVolumeLocked(false);
            return;
        }

        if (isMobile) {
            setIsVolumeLocked(true);
        } else {
            // Desktop default behavior: Mute toggle
            player?.toggleMute();
        }
    };

    const VolIcon = state.isMuted || state.volume === 0 ? VolumeMuteIcon : state.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon;

    const menuMaxHeight = Math.max(100, playerHeight - 120);

    const getIconClass = () => {
        switch (state.iconSize) {
            case 'small': return 'w-4 h-4';
            case 'large': return 'w-6 h-6';
            default: return 'w-5 h-5';
        }
    }
    const getButtonClass = () => {
        switch (state.iconSize) {
            case 'small': return 'p-2 min-w-[32px] min-h-[32px]';
            case 'large': return 'p-3 min-w-[44px] min-h-[44px]'; // Larger touch targets
            default: return 'p-2.5 min-w-[36px] min-h-[36px]';
        }
    }
    const iconClass = getIconClass();
    const btnClass = getButtonClass();

    const getCenterSizes = () => {
        switch (state.iconSize) {
            case 'small':
                return {
                    playBtn: 'w-14 h-14',
                    playIcon: 'w-6 h-6',
                    skipBtn: 'w-10 h-10',
                    skipIcon: 'w-5 h-5'
                };
            case 'large':
                return {
                    playBtn: 'w-24 h-24',
                    playIcon: 'w-12 h-12',
                    skipBtn: 'w-16 h-16',
                    skipIcon: 'w-8 h-8'
                };
            default: // medium
                return {
                    playBtn: 'w-20 h-20',
                    playIcon: 'w-9 h-9',
                    skipBtn: 'w-12 h-12',
                    skipIcon: 'w-6 h-6'
                };
        }
    }
    const center = getCenterSizes();

    // Bottom Controls Visibility: Show if paused, or actively showing controls, or menus open. 
    // HIDDEN IF LOCKED.
    // Use state.controlsVisible from Core to sync with external listeners (like ArtPlayer consumers)
    const isControlsVisible = !state.isLocked && (state.controlsVisible || !state.isPlaying || settingsOpen || subtitleMenuOpen || activeControlId || contextMenu.visible);
    const isVolumeVisible = isVolumeHovered || isVolumeScrubbing || isVolumeLocked;

    const backdropClass = isBackdrop ? 'backdrop-blur-xl bg-black/80' : 'bg-black/95';

    // --- Dynamic Controls Rendering ---
    const controls: ControlItem[] = useMemo(() => {
        const items: ControlItem[] = [
            { id: 'play', position: 'left', index: 10, isBuiltIn: true },
            { id: 'volume', position: 'left', index: 20, isBuiltIn: true },
            { id: 'time', position: 'left', index: 30, isBuiltIn: true },
            { id: 'subtitle', position: 'right', index: 80, isBuiltIn: true },
            { id: 'screenshot', position: 'right', index: 85, isBuiltIn: true },
            { id: 'pip', position: 'right', index: 90, isBuiltIn: true },
            { id: 'download', position: 'right', index: 95, isBuiltIn: true },
            { id: 'settings', position: 'right', index: 100, isBuiltIn: true },
            { id: 'fullscreenWeb', position: 'right', index: 110, isBuiltIn: true },
            { id: 'fullscreen', position: 'right', index: 120, isBuiltIn: true },
        ];

        if (config.controls) {
            // Merge user controls
            config.controls.forEach(c => {
                const existing = items.find(i => i.id === c.id);
                if (existing) {
                    Object.assign(existing, c); // Override
                } else {
                    items.push(c);
                }
            });
        }

        // Filter based on config toggles
        return items.filter(c => {
            if (c.id === 'screenshot' && !useScreenshot) return false;
            if (c.id === 'pip' && !usePip) return false;
            if (c.id === 'settings' && !useSetting) return false;
            if (c.id === 'fullscreen' && !useFullscreen) return false;
            if (c.id === 'fullscreenWeb' && !useFullscreenWeb) return false;
            return true;
        }).sort((a, b) => a.index - b.index);
    }, [config.controls, useScreenshot, usePip, useSetting, useFullscreen, useFullscreenWeb]);

    const renderControl = (item: ControlItem) => {
        if (!item.isBuiltIn) {
            // Render custom user control
            const controlId = item.id || `ctrl-${item.index}`;
            const isMenuOpen = activeControlId === controlId;

            // Allow rendering if it's the active one OR if it was the last active one during the unmount phase
            const shouldRenderMenu = isMenuOpen || (controlTransition.isMounted && lastActiveControlId.current === controlId);

            return (
                <div key={item.index} className="relative">
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.children) {
                                // Toggle logic: If click same button, toggle off. If click diff button, close old, open new.
                                const wasOpen = isMenuOpen;
                                closeAllMenus();
                                if (!wasOpen) setActiveControlId(controlId);
                            } else {
                                closeAllMenus(); // Close context menu
                                if (item.click) item.click(player!);
                                else if (item.onClick) item.onClick(player!);
                            }
                        }}
                        className={`strata-control-btn transition-colors focus:outline-none flex items-center justify-center ${btnClass} ${isMenuOpen ? 'text-[var(--accent)] bg-white/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'} ${item.className || ''}`}
                        style={{ borderRadius: 'var(--radius)', ...item.style }}
                        title={item.tooltip}
                    >
                        <HtmlOrNode content={item.html || ''} />
                    </button>
                    {/* Use MenuExplorer for nested controls */}
                    {item.children && shouldRenderMenu && (
                        <MenuExplorer
                            items={item.children}
                            onClose={closeAllMenus}
                            maxHeight={menuMaxHeight}
                            className={`strata-backdrop ${backdropClass} ${controlTransition.isVisible ? 'opacity-100 translate-y-0 scale-100 animate-in fade-in zoom-in-95 duration-300' : 'opacity-0 translate-y-2 scale-95 duration-300'}`}
                        />
                    )}
                </div>
            );
        }

        // Built-ins
        switch (item.id) {
            case 'play':
                return (
                    <button key="play" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.togglePlay(); }} className={`strata-control-btn text-zinc-300 hover:text-white transition-colors hover:bg-white/10 focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }}>
                        {state.isPlaying ? <PauseIcon className={`${iconClass} fill-current`} /> : <PlayIcon className={`${iconClass} fill-current`} />}
                    </button>
                );
            case 'volume':
                return (
                    <div key="volume" className="flex items-center gap-2 group/vol relative"
                        onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setIsVolumeHovered(true); }}
                        onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) setIsVolumeHovered(false); }}
                    >
                        <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={handleVolumeIconClick} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }}>
                            <VolIcon className={iconClass} />
                        </button>
                        <div className={`relative h-8 flex items-center transition-all duration-300 ease-out overflow-hidden ${isVolumeVisible ? 'w-28 opacity-100 ml-1' : 'w-0 opacity-0'}`}>
                            <div ref={volumeBarRef} className="relative w-full h-full flex items-center cursor-pointer px-2" onMouseDown={handleVolumeStart} onTouchStart={handleVolumeStart}>
                                <div className="w-full h-1 bg-white/20 overflow-hidden" style={{ borderRadius: 'var(--radius-full)' }}>
                                    <div className="h-full bg-white" style={{ width: `${(state.isMuted ? 0 : state.volume) * 100}%`, borderRadius: 'var(--radius-full)' }}></div>
                                </div>
                                <div className="absolute h-3 w-3 bg-white shadow-md top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `calc(${(state.isMuted ? 0 : state.volume) * 100}% * 0.85 + 4px)`, borderRadius: 'var(--radius-full)' }} />
                            </div>
                        </div>
                        {isVolumeVisible && <div className="strata-tooltip absolute bottom-full mb-2 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shadow-lg pointer-events-none whitespace-nowrap z-50 transform -translate-x-1/2" style={{ left: `calc(52px + ${(state.isMuted ? 0 : state.volume) * 80}px)` }}>{state.isMuted ? '0%' : `${Math.round(state.volume * 100)}%`}</div>}
                    </div>
                );
            case 'time':
                return config.isLive ? (
                    <div key="live" className="flex items-center gap-2 px-2 py-0.5 rounded-md border border-white/10" style={{ backgroundColor: `${state.themeColor}1a`, borderColor: `${state.themeColor}33` }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: state.themeColor }} />
                        <span className="text-[10px] font-bold tracking-wider" style={{ color: state.themeColor }}>LIVE</span>
                    </div>
                ) : (
                    <div key="time" className="text-xs font-medium text-zinc-400 font-mono select-none hidden sm:block tabular-nums">{formatTime(isScrubbing ? scrubbingTime : state.currentTime)} <span className="text-zinc-600">/</span> {formatTime(state.duration)}</div>
                );
            case 'subtitle':
                return (
                    <div key="subtitle" className="relative">
                        <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); const wasOpen = subtitleMenuOpen; closeAllMenus(); if (!wasOpen) setSubtitleMenuOpen(true); }} className={`strata-control-btn transition-colors focus:outline-none ${btnClass} ${subtitleMenuOpen ? 'text-[var(--accent)] bg-white/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`} style={{ borderRadius: 'var(--radius)' }}><SubtitleIcon className={iconClass} /></button>
                        {subtitleTransition.isMounted && (
                            <SubtitleMenu
                                tracks={state.subtitleTracks} current={state.currentSubtitle} onSelect={(idx: number) => player?.setSubtitle(idx)}
                                onUpload={(file: File) => player?.addTextTrack(file, file.name)} onClose={() => setSubtitleMenuOpen(false)}
                                settings={state.subtitleSettings} onSettingsChange={(s: Partial<SubtitleSettings>) => player?.updateSubtitleSettings(s)}
                                onReset={() => player?.resetSubtitleSettings()} offset={state.subtitleOffset} onOffsetChange={(val: number) => player?.setSubtitleOffset(val)}
                                maxHeight={menuMaxHeight} animationClass={`strata-backdrop ${backdropClass} ${subtitleTransition.isVisible ? 'opacity-100 translate-y-0 scale-100 animate-in fade-in zoom-in-95 duration-300' : 'opacity-0 translate-y-2 scale-95 duration-300'}`}
                            />
                        )}
                    </div>
                );
            case 'screenshot': return <button key="ss" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.screenshot(); }} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }} title="Screenshot"><CameraIcon className={iconClass} /></button>;
            case 'pip': return <button key="pip" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.togglePip(); }} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }}><PipIcon className={iconClass} /></button>;
            case 'download': return <button key="dl" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.download(); }} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }}><DownloadIcon className={iconClass} /></button>;
            case 'fullscreen': return <button key="fs" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.toggleFullscreen(); }} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-transform focus:outline-none ${btnClass}`} style={{ borderRadius: 'var(--radius)' }}>{(state.isFullscreen || state.isWebFullscreen) ? <MinimizeIcon className={iconClass} /> : <MaximizeIcon className={iconClass} />}</button>;
            case 'fullscreenWeb': return <button key="fsw" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player?.toggleWebFullscreen(); }} className={`strata-control-btn text-zinc-300 hover:text-white hover:bg-white/10 hidden sm:block focus:outline-none ${btnClass} ${state.isWebFullscreen ? 'text-[var(--accent)]' : ''}`} style={{ borderRadius: 'var(--radius)' }} title="Web Fullscreen"><WebFullscreenIcon className={iconClass} /></button>;
            case 'settings':
                return (
                    <div key="settings" className="relative">
                        <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); const wasOpen = settingsOpen; closeAllMenus(); if (!wasOpen) { setSettingsOpen(true); setActiveMenu('main'); } }} className={`strata-control-btn transition-all duration-300 focus:outline-none ${btnClass} ${settingsOpen ? 'rotate-90 text-[var(--accent)] bg-white/10' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`} style={{ borderRadius: 'var(--radius)' }}><SettingsIcon className={iconClass} /></button>
                        {settingsTransition.isMounted && (<Menu onClose={() => setSettingsOpen(false)} align="right" maxHeight={menuMaxHeight} className={`strata-backdrop ${backdropClass} ${settingsTransition.isVisible ? 'opacity-100 translate-y-0 scale-100 animate-in fade-in zoom-in-95 duration-300' : 'opacity-0 translate-y-2 scale-95 duration-300'}`}><div className="w-full">
                            {activeMenu === 'main' && (
                                <div className="animate-in slide-in-from-left-4 fade-in duration-200">
                                    <div className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md" style={{ borderRadius: 'var(--radius)' }}><span>Settings</span></div>

                                    {/* Source - Top Priority */}
                                    {state.sources.length > 1 && (
                                        <>
                                            <MenuItem label="Source" icon={<ServerIcon className="w-4 h-4" />} value={state.sources[state.currentSourceIndex]?.name || `Source ${state.currentSourceIndex + 1}`} onClick={() => setActiveMenu('sources')} hasSubmenu />
                                            <MenuDivider />
                                        </>
                                    )}

                                    {/* Playback Configuration */}
                                    <MenuItem label="Quality" icon={<LayersIcon className="w-4 h-4" />} value={state.currentQuality === -1 ? 'Auto' : `${state.qualityLevels[state.currentQuality]?.height}p`} onClick={() => setActiveMenu('quality')} hasSubmenu />
                                    <MenuItem label="Speed" icon={<GaugeIcon className="w-4 h-4" />} value={`${state.playbackRate}x`} onClick={() => setActiveMenu('speed')} hasSubmenu />
                                    <MenuItem label="Audio" icon={<MusicIcon className="w-4 h-4" />} value={state.audioTracks[state.currentAudioTrack]?.label || 'Default'} onClick={() => setActiveMenu('audio')} hasSubmenu />

                                    <MenuDivider />

                                    {/* Visual Adjustments */}
                                    {useFlip && <MenuItem label="Flip" icon={<FlipIcon className="w-4 h-4" />} value={state.flipState.horizontal ? 'H' : state.flipState.vertical ? 'V' : 'Normal'} onClick={() => setActiveMenu('flip')} hasSubmenu />}
                                    {useAspectRatio && <MenuItem label="Aspect Ratio" icon={<CropIcon className="w-4 h-4" />} value={state.aspectRatio} onClick={() => setActiveMenu('ratio')} hasSubmenu />}

                                    {/* Audio Tools */}
                                    <MenuItem label="Audio Boost" icon={<SpeakerIcon className="w-4 h-4" />} value={state.audioGain > 1 ? `${state.audioGain}x` : 'Off'} onClick={() => setActiveMenu('boost')} hasSubmenu />

                                    <MenuDivider />

                                    {/* Network & Social */}
                                    <MenuItem label="Watch Party" icon={<UsersIcon className="w-4 h-4" />} onClick={() => setActiveMenu('party')} hasSubmenu />
                                    <MenuItem label="Cast to Device" icon={<CastIcon className="w-4 h-4" />} onClick={() => { player?.requestCast(); setSettingsOpen(false); }} />

                                    {/* Custom User Settings (Nested Support Added Here) */}
                                    {config.settings && config.settings.length > 0 && <MenuDivider />}
                                    {config.settings?.map((s, i) => (
                                        s.switch !== undefined ? (
                                            <div key={`cust-${i}`} className="px-1">
                                                <Toggle
                                                    label={s.html}
                                                    icon={s.icon}
                                                    checked={s.switch}
                                                    tooltip={s.tooltip}
                                                    onChange={(val: boolean) => { if (s.onSwitch) s.onSwitch(s, val); }}
                                                />
                                            </div>
                                        ) : (
                                            <MenuItem
                                                key={`cust-${i}`}
                                                label={s.html}
                                                icon={s.icon}
                                                value={s.currentLabel || s.value}
                                                hasSubmenu={!!s.children}
                                                onClick={() => {
                                                    if (s.children) {
                                                        setActiveMenu(`custom-${i}`);
                                                    } else {
                                                        if (s.click) s.click(s);
                                                        else if (s.onClick) s.onClick(s);
                                                        setSettingsOpen(false);
                                                    }
                                                }}
                                            />
                                        )
                                    ))}

                                    <MenuDivider />

                                    {/* Appearance - Bottom */}
                                    <MenuItem label="Appearance" icon={<PaletteIcon className="w-4 h-4" />} onClick={() => setActiveMenu('appearance')} hasSubmenu />
                                </div>
                            )}

                            {/* Render Nested Custom Setting Menu if active */}
                            {activeMenu.startsWith('custom-') && (() => {
                                const idx = parseInt(activeMenu.split('-')[1]);
                                const item = config.settings?.[idx];
                                if (!item || !item.children) return null;
                                return (
                                    <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                                        <MenuHeader label={item.html || 'Menu'} onBack={() => setActiveMenu('main')} />
                                        {item.children.map((child, k) => (
                                            <React.Fragment key={k}>
                                                {child.separator && <MenuDivider />}
                                                {child.switch !== undefined && (
                                                    <div className="px-1"><Toggle label={child.html} checked={child.switch} onChange={(v: boolean) => child.onSwitch && child.onSwitch(child, v)} /></div>
                                                )}
                                                {!child.separator && child.switch === undefined && (
                                                    <MenuItem
                                                        label={child.html}
                                                        icon={child.icon}
                                                        value={child.value}
                                                        active={child.active}
                                                        onClick={() => {
                                                            if (child.onClick) child.onClick(child);
                                                            else if (child.click) child.click(child);
                                                            setSettingsOpen(false);
                                                        }}
                                                    />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                );
                            })()}

                            {['speed', 'quality', 'audio', 'boost', 'party', 'appearance', 'sources', 'flip', 'ratio'].includes(activeMenu) && (
                                <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                                    {activeMenu === 'sources' && (
                                        <>
                                            <MenuHeader label="Select Source" onBack={() => setActiveMenu('main')} />
                                            {state.sources.map((src, i) => {
                                                const status = state.sourceStatuses[i];
                                                const statusIcon = status === 'success'
                                                    ? <WifiIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                    : status === 'error'
                                                        ? <AlertCircleIcon className="w-3.5 h-3.5 text-red-500" />
                                                        : null;
                                                return (
                                                    <MenuItem
                                                        key={i}
                                                        label={src.name || `Source ${i + 1}`}
                                                        value={src.type}
                                                        active={state.currentSourceIndex === i}
                                                        rightIcon={statusIcon}
                                                        onClick={() => player?.switchSource(i)}
                                                    />
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeMenu === 'speed' && (<><MenuHeader label="Speed" onBack={() => setActiveMenu('main')} />{[0.5, 1, 1.5, 2].map(rate => (<MenuItem key={rate} label={`${rate}x`} active={state.playbackRate === rate} onClick={() => player!.video.playbackRate = rate} />))}</>)}
                                    {activeMenu === 'quality' && (<><MenuHeader label="Quality" onBack={() => setActiveMenu('main')} /><MenuItem label="Auto" active={state.currentQuality === -1} onClick={() => player?.setQuality(-1)} />{state.qualityLevels.map((lvl) => (<MenuItem key={lvl.index} label={`${lvl.height}p`} value={`${Math.round(lvl.bitrate / 1000)}k`} active={state.currentQuality === lvl.index} onClick={() => player?.setQuality(lvl.index)} />))}</>)}
                                    {activeMenu === 'audio' && (<><MenuHeader label="Audio Track" onBack={() => setActiveMenu('main')} />{state.audioTracks.length === 0 && <div className="px-4 py-3 text-zinc-500 text-xs text-center">No tracks available</div>}{state.audioTracks.map((track) => (<MenuItem key={track.index} label={track.label} value={track.language} active={state.currentAudioTrack === track.index} onClick={() => player?.setAudioTrack(track.index)} />))}</>)}
                                    {activeMenu === 'boost' && (<><MenuHeader label="Audio Boost" onBack={() => setActiveMenu('main')} />{[1, 1.5, 2, 3].map(gain => (<MenuItem key={gain} label={gain === 1 ? 'Off' : `${gain}x`} active={state.audioGain === gain} onClick={() => player?.setAudioGain(gain)} />))}</>)}
                                    {activeMenu === 'flip' && (
                                        <>
                                            <MenuHeader label="Video Flip" onBack={() => setActiveMenu('main')} />
                                            <div className="p-2 space-y-1">
                                                <Toggle label="Horizontal Flip" checked={state.flipState.horizontal} onChange={() => player?.setFlip('horizontal')} />
                                                <Toggle label="Vertical Flip" checked={state.flipState.vertical} onChange={() => player?.setFlip('vertical')} />
                                            </div>
                                        </>
                                    )}
                                    {activeMenu === 'ratio' && (
                                        <>
                                            <MenuHeader label="Aspect Ratio" onBack={() => setActiveMenu('main')} />
                                            {['default', '16:9', '4:3'].map(r => (
                                                <MenuItem key={r} label={r === 'default' ? 'Default' : r} active={state.aspectRatio === r} onClick={() => player?.setAspectRatio(r)} />
                                            ))}
                                        </>
                                    )}
                                    {activeMenu === 'party' && (<><MenuHeader label="Watch Party" onBack={() => setActiveMenu('main')} /><div className="p-4 space-y-3"><p className="text-xs text-zinc-400 leading-relaxed">Create a synchronized room on WatchParty.me to watch together.</p><a href={`https://www.watchparty.me/create?video=${encodeURIComponent(state.sources[state.currentSourceIndex]?.url || src || '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-2.5 bg-[var(--accent)] hover:opacity-90 text-white font-medium transition-opacity text-xs" style={{ borderRadius: 'var(--radius)' }}>Create Room</a></div></>)}
                                    {activeMenu === 'appearance' && (
                                        <>
                                            <MenuHeader label="Appearance" onBack={() => setActiveMenu('main')} />
                                            <div className="pb-1">
                                                <SettingsGroup title="Theme">
                                                    <div className="grid grid-cols-2 gap-2 px-3">
                                                        {THEMES.map(theme => (
                                                            <button key={theme.value} onClick={() => player?.setAppearance({ theme: theme.value, themeColor: theme.color })} className={`py-2 text-xs font-bold uppercase tracking-wide transition-colors border-[length:var(--border-width)] border-white/10 ${state.theme === theme.value ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-zinc-400 hover:text-white'}`} style={{ borderRadius: 'var(--radius)' }}>{theme.label}</button>
                                                        ))}
                                                    </div>
                                                </SettingsGroup>
                                                <SettingsGroup title="Icon Size">
                                                    <div className="grid grid-cols-3 gap-1 px-3">
                                                        {(['small', 'medium', 'large'] as const).map(s => (
                                                            <button key={s} onClick={() => player?.setAppearance({ iconSize: s })} className={`py-1.5 text-xs font-medium transition-colors ${state.iconSize === s ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-zinc-200'}`} style={{ borderRadius: 'var(--radius)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                                                        ))}
                                                    </div>
                                                </SettingsGroup>
                                                <SettingsGroup title="Theme Color">
                                                    <div className="grid grid-cols-6 gap-2 px-3">
                                                        {THEME_COLORS.map(c => (
                                                            <button key={c.value} title={c.label} onClick={() => player?.setAppearance({ themeColor: c.value })} className={`w-6 h-6 transition-transform hover:scale-110 ${state.themeColor === c.value ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/10'}`} style={{ backgroundColor: c.value, borderRadius: 'var(--radius-full)' }}>{state.themeColor === c.value && <CheckIcon className="w-3 h-3 text-white mx-auto stroke-[3]" />}</button>
                                                        ))}
                                                    </div>
                                                    <div className="px-3 pt-4">
                                                        <div className="flex items-center gap-3 bg-white/5 p-2 hover:bg-white/10 transition-colors group" style={{ borderRadius: 'var(--radius)' }}>
                                                            <div className="relative w-6 h-6 overflow-hidden ring-1 ring-white/20" style={{ borderRadius: 'var(--radius-full)' }}>
                                                                <input type="color" value={state.themeColor} onChange={(e) => player?.setAppearance({ themeColor: e.target.value })} className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 border-0" />
                                                            </div>
                                                            <span className="text-xs text-zinc-400 font-medium group-hover:text-zinc-200">Custom Color</span>
                                                            <span className="text-[10px] font-mono text-zinc-500 ml-auto uppercase">{state.themeColor}</span>
                                                        </div>
                                                    </div>
                                                </SettingsGroup>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div></Menu>)}
                    </div>
                );
            default: return null;
        }
    };

    // --- Dynamic Context Menu ---
    const contextMenuItems: ContextMenuItem[] = useMemo(() => {
        const items: ContextMenuItem[] = [
            // Loop (Playback Group)
            { html: 'Playback', isLabel: true },
            {
                html: 'Loop',
                checked: state.isLooping,
                onClick: () => player?.toggleLoop()
            },
            { separator: true },

            // Flip (Transform Group)
            { html: 'Transform', isLabel: true },
            { html: 'Flip Horizontal', onClick: () => player?.setFlip('horizontal') },
            { html: 'Flip Vertical', onClick: () => player?.setFlip('vertical') },
            { separator: true },

            // Aspect Ratio Group
            { html: 'Aspect Ratio', isLabel: true },
            { html: 'Default', checked: state.aspectRatio === 'default', onClick: () => player?.setAspectRatio('default') },
            { html: '16:9', checked: state.aspectRatio === '16:9', onClick: () => player?.setAspectRatio('16:9') },
            { html: '4:3', checked: state.aspectRatio === '4:3', onClick: () => player?.setAspectRatio('4:3') },
            { separator: true },

            // Stats
            {
                html: 'Video Info',
                icon: <InfoIcon className="w-3.5 h-3.5" />,
                onClick: () => setShowVideoInfo(true)
            },
            { separator: true }
        ];

        if (config.contextmenu) {
            items.push(...config.contextmenu);
        }

        // Branding
        items.push({
            html: <span className="text-zinc-500 text-xs font-semibold tracking-wide">StrataPlayer</span>,
            disabled: true
        });

        // Always append Close at the very end
        items.push({
            html: 'Close',
            onClick: (close) => close(), // Wrapper handles close
            icon: <div className="text-red-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></div>
        });

        return items;
    }, [config.contextmenu, state.aspectRatio, state.isLooping, player]);

    const isWebFs = state.isWebFullscreen;

    const playerContent = (
        <div
            id={config.id}
            ref={containerRef}
            className={`group bg-black overflow-hidden select-none font-[family-name:var(--font-main)] outline-none text-zinc-100 strata-player-reset flex items-center justify-center ${isWebFs ? 'fixed inset-0 z-[2147483647] w-screen h-screen rounded-none' : 'relative w-full h-full rounded-[var(--radius)]'} ${config.container || ''}`}
            // touch-action: manipulation improves tap response
            style={{ touchAction: 'manipulation', '--accent': state.themeColor, '--accent-contrast': accentContrast } as React.CSSProperties}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (state.isPlaying && !settingsOpen && !subtitleMenuOpen && !activeControlId && player) player.setControlsVisible(false); }}

            // Mouse Events
            onMouseDown={startFastForward}
            onMouseUp={stopFastForward}

            // Touch Events (Unified Gesture Logic)
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}

            onContextMenu={handleContextMenu}
            tabIndex={0}
            role="region"
            aria-label="Video Player"
            data-theme={state.theme}
        >
            {/* Same styles block as before */}
            <style>{`
                [data-theme="default"] {
                    --radius: 0.75rem;
                    --radius-lg: 0.75rem;
                    --radius-sm: 0.375rem;
                    --radius-full: 9999px;
                    --font-main: "Inter", sans-serif;
                    --border-width: 0px;
                    --bg-panel: rgba(9, 9, 11, 0.95);
                    --tooltip-bg: #ffffff;
                    --tooltip-text: #000000;
                    --tooltip-border: 0px solid transparent;
                }
                [data-theme="pixel"] {
                    --radius: 0px;
                    --radius-lg: 0px;
                    --radius-sm: 0px;
                    --radius-full: 0px;
                    --font-main: "Press Start 2P", cursive;
                    --border-width: 2px;
                    --bg-panel: #000000;
                    --tooltip-bg: #000000;
                    --tooltip-text: #ffffff;
                    --tooltip-border: 2px solid #ffffff;
                    image-rendering: pixelated;
                }
                [data-theme="game"] {
                    --radius: 4px;
                    --radius-lg: 6px;
                    --radius-sm: 2px;
                    --radius-full: 4px;
                    --font-main: "Cinzel", serif;
                    --border-width: 1px;
                    --bg-panel: #0a0a0a;
                    --tooltip-bg: #1a1a1a;
                    --tooltip-text: #ffffff;
                    --tooltip-border: 1px solid var(--accent);
                }
                [data-theme="hacker"] {
                    --radius: 0px;
                    --radius-lg: 0px;
                    --radius-sm: 0px;
                    --radius-full: 0px;
                    --font-main: "JetBrains Mono", monospace;
                    --border-width: 1px;
                    --bg-panel: #000000;
                    --tooltip-bg: #000000;
                    --tooltip-text: var(--accent);
                    --tooltip-border: 1px solid var(--accent);
                    text-shadow: 0 0 5px var(--accent);
                }
                
                [data-theme="pixel"] .strata-control-btn {
                    border: 2px solid white;
                    background: black;
                }
                [data-theme="pixel"] .strata-control-btn:hover {
                    background: white;
                    color: black;
                }
                [data-theme="pixel"] .strata-range-input::-webkit-slider-thumb {
                    border-radius: 0 !important;
                    height: 16px !important;
                    width: 16px !important;
                    box-shadow: none !important;
                }
                
                [data-theme="hacker"] .strata-scanlines {
                    background: linear-gradient(
                        to bottom,
                        rgba(255,255,255,0),
                        rgba(255,255,255,0) 50%,
                        rgba(0,0,0,0.2) 50%,
                        rgba(0,0,0,0.2)
                    );
                    background-size: 100% 4px;
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 40;
                }

                .strata-tooltip {
                    background-color: var(--tooltip-bg);
                    color: var(--tooltip-text);
                    border: var(--tooltip-border);
                    border-radius: var(--radius-sm);
                    font-family: var(--font-main);
                }
                
                /* Override Backdrop for specific themes if needed */
                [data-theme="pixel"] .strata-backdrop { backdrop-filter: none; background: #000; }
                [data-theme="hacker"] .strata-backdrop { backdrop-filter: none; background: #000; }
            `}</style>

            {state.theme === 'hacker' && <div className="strata-scanlines" />}

            {!player && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50"><LoaderIcon className="w-10 h-10 text-[var(--accent)] animate-spin" /></div>}

            {player && (
                <>
                    {/* Custom Layers */}
                    {config.layers?.map((layer, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 pointer-events-none z-10 ${layer.className || ''}`}
                            style={layer.style}
                        >
                            <HtmlOrNode content={layer.html || ''} className="w-full h-full" />
                        </div>
                    ))}

                    <NotificationContainer notifications={state.notifications} />
                    <SubtitleOverlay cues={state.activeCues} settings={state.subtitleSettings} />

                    {/* Main Interaction Layer */}
                    <div className="absolute inset-0 z-0" onClick={handleContainerClick} aria-hidden="true" />

                    {poster && !hasPlayed && (
                        <div
                            className="absolute inset-0 bg-cover bg-center z-[5] pointer-events-none"
                            style={{ backgroundImage: `url(${poster})` }}
                        />
                    )}

                    {/* Context Menu */}
                    {contextMenu.visible && (
                        <ContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            items={contextMenuItems}
                            onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                            containerWidth={playerWidth}
                            containerHeight={playerHeight}
                        />
                    )}

                    {/* Video Info Modal */}
                    {showVideoInfo && player && (
                        <VideoInfo player={player} onClose={() => setShowVideoInfo(false)} />
                    )}

                    {/* Fast Forward Overlay */}
                    {isFastForwarding && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 z-40 animate-in fade-in zoom-in duration-200">
                            <FastForwardIcon className="w-4 h-4 text-[var(--accent)] fill-current" />
                            <span className="text-xs font-bold tracking-wider">2x Speed</span>
                        </div>
                    )}

                    {/* Mobile Lock Button */}
                    {useLock && isMobile && state.controlsVisible && (
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); player.toggleLock(); }}
                            className={`absolute left-4 md:left-6 bottom-24 md:bottom-28 z-50 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white transition-all active:scale-95 ${state.isLocked ? 'text-[var(--accent)] bg-white/10' : 'hover:bg-white/10'}`}
                        >
                            {state.isLocked ? <LockIcon className="w-5 h-5" /> : <UnlockIcon className="w-5 h-5" />}
                        </button>
                    )}

                    {seekAnimation && (
                        <div
                            key={seekAnimation.id}
                            className={`absolute top-0 bottom-0 flex items-center justify-center w-[35%] z-20 bg-white/5 backdrop-blur-[1px] animate-out fade-out duration-500 fill-mode-forwards ${seekAnimation.type === 'rewind' ? 'left-0 rounded-r-[4rem]' : 'right-0 rounded-l-[4rem]'}`}
                            onAnimationEnd={() => setSeekAnimation(null)}
                        >
                            <div className="flex flex-col items-center text-white drop-shadow-lg">
                                {seekAnimation.type === 'rewind' ? <Replay10Icon className="w-12 h-12 animate-pulse" /> : <Forward10Icon className="w-12 h-12 animate-pulse" />}
                                <span className="font-bold text-sm mt-2 font-mono">{seekAnimation.type === 'rewind' ? '-10s' : '+10s'}</span>
                            </div>
                        </div>
                    )}
                    {state.isBuffering && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><LoaderIcon className="w-12 h-12 text-[var(--accent)] animate-spin drop-shadow-lg" /></div>}
                    {state.error && <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/90 backdrop-blur-md animate-in fade-in"><div className="flex flex-col items-center gap-4 text-red-500 p-8 max-w-md text-center"><span className="text-5xl mb-2">⚠️</span><h3 className="text-xl font-bold text-white">Playback Error</h3><p className="text-zinc-400 text-sm">{state.error}</p><button onClick={() => player.load(player.store.get().sources[player.store.get().currentSourceIndex] || { url: src || '', type: type || 'auto' }, textTracks)} className="px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-full hover:opacity-90 transition-opacity mt-4 shadow-lg">Try Again</button></div></div>}

                    {/* Center Controls - Hidden if locked or configured off */}
                    {useCenterControls && !state.isLocked && (((!state.isPlaying && !state.isBuffering && !state.error) || state.controlsVisible) && !state.isBuffering) ? (
                        <div
                            className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 pointer-events-none ${state.controlsVisible || !state.isPlaying ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className="flex items-center gap-8 md:gap-16 pointer-events-auto">
                                <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); triggerSkip('rewind'); }} className={`group flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all duration-300 active:scale-125 active:opacity-80 text-white/90 focus:outline-none backdrop-blur-sm ${center.skipBtn}`}><Replay10Icon className={center.skipIcon} /></button>
                                <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); player.togglePlay(); }} className={`group relative flex items-center justify-center rounded-full bg-white/10 hover:bg-[var(--accent)] border border-white/10 shadow-2xl transition-all duration-300 active:scale-90 active:opacity-80 focus:outline-none backdrop-blur-md ${center.playBtn}`}>{state.isPlaying ? <PauseIcon className={`${center.playIcon} text-white fill-current`} /> : <PlayIcon className={`${center.playIcon} text-white ml-1 fill-current`} />}</button>
                                <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeAllMenus(); triggerSkip('forward'); }} className={`group flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all duration-300 active:scale-125 active:opacity-80 text-white/90 focus:outline-none backdrop-blur-sm ${center.skipBtn}`}><Forward10Icon className={center.skipIcon} /></button>
                            </div>
                        </div>
                    ) : null}

                    {/* Bottom Control Bar - Hidden if locked */}
                    <div
                        className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 px-4 md:px-6 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent ${isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                        onClick={(e) => {
                            if (settingsOpen || subtitleMenuOpen || activeControlId) {
                                closeAllMenus();
                            }
                            // Stop prop to prevent play toggle, but allow menu closing logic above to run first
                            if (e.target === e.currentTarget) {
                                setIsVolumeLocked(false);
                            }
                            e.stopPropagation();
                        }}
                    >
                        {/* Progress Bar (Hidden in Live Mode) */}
                        {!config.isLive && (
                            <div
                                ref={progressBarRef}
                                className="relative w-full h-3 group/slider mb-3 cursor-pointer touch-none flex items-center"
                                onMouseMove={handleProgressMove}
                                onMouseLeave={() => { setHoverTime(null); setCurrentThumbnail(null); }}
                                onMouseDown={handleSeekStart}
                                onTouchStart={handleSeekStart}
                            >
                                {/* Highlights */}
                                {config.highlight?.map((h, i) => (
                                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full z-10 pointer-events-none" style={{ left: `${(h.time / state.duration) * 100}%` }} title={h.text} />
                                ))}

                                {hoverTime !== null && (<div className="absolute bottom-full mb-1.5 flex flex-col items-center transform -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-150" style={{ left: `clamp(70px, ${hoverPos}%, calc(100% - 70px))` }}>{currentThumbnail && (<div className="bg-black/90 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm" style={{ width: `${currentThumbnail.w * 0.5}px`, height: `${currentThumbnail.h * 0.5}px`, borderRadius: 'var(--radius)' }}><div style={{ backgroundImage: `url("${currentThumbnail.url}")`, width: `${currentThumbnail.w}px`, height: `${currentThumbnail.h}px`, backgroundPosition: `-${currentThumbnail.x}px -${currentThumbnail.y}px`, backgroundRepeat: 'no-repeat', transform: 'scale(0.5)', transformOrigin: 'top left' }} /></div>)}<div className="strata-tooltip px-2 py-0.5 text-[11px] font-bold font-mono shadow-lg tabular-nums mt-1">{formatTime(hoverTime)}</div></div>)}

                                {/* Track */}
                                <div className="w-full h-1 bg-white/20 overflow-hidden relative backdrop-blur-sm border-[length:var(--border-width)] border-white/10" style={{ borderRadius: 'var(--radius-full)' }}>
                                    {state.duration > 0 && state.buffered.map((range, i) => (<div key={i} className="absolute top-0 bottom-0 bg-white/20" style={{ left: `${(range.start / state.duration) * 100}%`, width: `${((range.end - range.start) / state.duration) * 100}%` }} />))}
                                    <div className="absolute left-0 top-0 bottom-0 bg-[var(--accent)]" style={{ width: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%` }} />
                                </div>

                                {/* Thumb */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white shadow-md scale-0 group-hover/slider:scale-100 transition-transform duration-100 z-10"
                                    style={{
                                        left: `${((isScrubbing ? scrubbingTime : state.currentTime) / state.duration) * 100}%`,
                                        borderRadius: 'var(--radius-full)'
                                    }}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between pointer-events-auto">
                            <div className="flex items-center gap-3">
                                {controls.filter(c => c.position === 'left' || c.position === 'center').map(renderControl)}
                            </div>

                            <div className="flex items-center gap-1">
                                {controls.filter(c => c.position === 'right').map(renderControl)}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    if (isWebFs && typeof document !== 'undefined') {
        return createPortal(playerContent, document.body);
    }

    return playerContent;
};
