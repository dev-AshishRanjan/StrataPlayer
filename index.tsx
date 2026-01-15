
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StrataPlayer } from './ui/StrataPlayer';

interface VideoSource {
    name: string;
    src: string;
    desc: string;
    tags: string[];
    thumbnails?: string;
    tracks?: { kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata', label: string, src: string, srcLang: string, default?: boolean }[];
}

const SOURCES: VideoSource[] = [
    {
        name: "Tears of Steel (Multi-Audio)",
        src: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        desc: "High-quality HLS stream with multiple audio tracks (En, De, Fr, Es) and subtitles.",
        tags: ["HLS", "Multi-Audio", "Subs"]
    },
    {
        name: "Sintel (External Subs & Thumbnails)",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        desc: "MP4 file with verified external VTT subtitles and thumbnail sprites.",
        tags: ["MP4", "VTT Subs", "Thumbnails"],
        thumbnails: "https://bitdash-a.akamaihd.net/content/sintel/hls/sprites/sprite.vtt",
        tracks: [
            { kind: 'subtitles', label: 'English', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt', srcLang: 'en', default: true },
            { kind: 'subtitles', label: 'Spanish', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_es.vtt', srcLang: 'es' },
            { kind: 'subtitles', label: 'French', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_fr.vtt', srcLang: 'fr' }
        ]
    },
    {
        name: "Big Buck Bunny (HLS Quality)",
        src: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        desc: "Standard HLS stream for testing adaptive bitrate switching and quality selection.",
        tags: ["HLS", "ABR"]
    },
    {
        name: "Broken Stream (Test Retry)",
        src: "https://httpstat.us/404",
        desc: "Intentionally broken URL to test the 5-step verbose retry logic.",
        tags: ["Error Test"]
    }
];

const App = () => {
    const [currentSource, setCurrentSource] = useState(SOURCES[0]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg"></div>
                        <span className="font-bold text-xl tracking-tight">StrataPlayer</span>
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-zinc-400">
                        <a href="#" className="hover:text-white transition-colors">Documentation</a>
                        <a href="#" className="hover:text-white transition-colors">Showcase</a>
                        <a href="#" className="hover:text-white transition-colors">GitHub</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full grid lg:grid-cols-12 gap-12">

                {/* Left Column: Player */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="aspect-video w-full bg-black rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 relative z-0">
                        <StrataPlayer
                            key={currentSource.src} // Force remount on source change
                            src={currentSource.src}
                            thumbnails={currentSource.thumbnails}
                            textTracks={currentSource.tracks}
                            autoPlay={false}
                        />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">{currentSource.name}</h1>
                        <p className="text-zinc-400">{currentSource.desc}</p>
                        <div className="flex gap-2 mt-4">
                            {currentSource.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-indigo-400 border border-indigo-500/20">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Playlist/Selector */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5">
                            <h3 className="font-semibold text-zinc-200">Test Streams</h3>
                        </div>
                        <div className="divide-y divide-white/5">
                            {SOURCES.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentSource(item)}
                                    className={`w-full text-left p-4 hover:bg-white/5 transition-colors flex items-center gap-4 ${currentSource.src === item.src ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono text-zinc-400 shrink-0">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className={`font-medium ${currentSource.src === item.src ? 'text-indigo-400' : 'text-zinc-300'}`}>{item.name}</div>
                                        <div className="text-xs text-zinc-500 mt-1">{item.tags.join(', ')}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-white/5">
                        <h3 className="font-semibold mb-2">Ready for Production</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            StrataPlayer handles edge cases in HLS streaming, multi-audio tracks, and offers a fully customizable React 19 UI.
                        </p>
                        <button className="w-full py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                            View Documentation
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
