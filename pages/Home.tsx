
import React, { useState } from 'react';
import { StrataPlayer } from '../ui/StrataPlayer';
import { TextTrackConfig } from '../core/StrataCore';

interface VideoSource {
  name: string;
  src: string;
  desc: string;
  tags: string[];
  thumbnails?: string;
  tracks?: TextTrackConfig[];
}

const SOURCES: VideoSource[] = [
  {
    name: "Big Buck Bunny (Thumbnails)",
    src: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    desc: "HLS stream with reliable CORS-friendly storyboard thumbnails (Mux).",
    tags: ["HLS", "Thumbnails"],
    thumbnails: "https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/storyboard.vtt"
  },
  {
    name: "Multi-Audio Test (Tears of Steel)",
    src: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-lang.ism/.m3u8",
    desc: "Tears of Steel HLS stream with multiple audio languages.",
    tags: ["HLS", "Multi-Audio"]
  },
  {
    name: "Sintel (External Subs)",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    desc: "MP4 file with verified external VTT subtitles.",
    tags: ["MP4", "VTT Subs"],
    tracks: [
      { kind: 'subtitles', label: 'English', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt', srcLang: 'en', default: true },
      { kind: 'subtitles', label: 'Spanish', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_es.vtt', srcLang: 'es' },
      { kind: 'subtitles', label: 'French', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_fr.vtt', srcLang: 'fr' }
    ]
  },
  {
    name: "Broken Stream (Test Retry)",
    src: "https://httpstat.us/404",
    desc: "Intentionally broken URL to test the 5-step verbose retry logic.",
    tags: ["Error Test"]
  }
];

export const Home = () => {
  const [currentSource, setCurrentSource] = useState(SOURCES[0]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 w-full grid lg:grid-cols-12 gap-12 animate-in fade-in duration-500">

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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{currentSource.name}</h1>
          </div>
          <p className="text-zinc-400 leading-relaxed">{currentSource.desc}</p>
          <div className="flex gap-2 mt-4">
            {currentSource.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-indigo-500/10 rounded-full text-xs font-mono text-indigo-400 border border-indigo-500/20">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Playlist/Selector */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
            <h3 className="font-semibold text-zinc-200">Test Streams</h3>
          </div>
          <div className="divide-y divide-white/5">
            {SOURCES.map((item, i) => (
              <button
                key={i}
                onClick={() => setCurrentSource(item)}
                className={`w-full text-left p-4 hover:bg-white/5 transition-all duration-200 flex items-center gap-4 group ${currentSource.src === item.src ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${currentSource.src === item.src ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-white/10 text-zinc-400 group-hover:bg-white/20'}`}>
                  {i + 1}
                </div>
                <div>
                  <div className={`font-medium transition-colors ${currentSource.src === item.src ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-white'}`}>{item.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{item.tags.join(', ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h3 className="font-semibold mb-2 text-indigo-100">Ready for Production</h3>
          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            StrataPlayer handles edge cases in HLS streaming, multi-audio tracks, and offers a fully customizable React 19 UI.
          </p>
          <button className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg hover:shadow-white/10 text-sm">
            View Documentation
          </button>
        </div>
      </div>

    </div>
  );
};
