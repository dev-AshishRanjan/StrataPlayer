
import React, { useState } from 'react';
import { StrataPlayer } from '../ui/StrataPlayer';
import { TextTrackConfig, PlayerTheme, PlayerSource } from '../core/StrataCore';
import { HlsPlugin } from '../plugins/HlsPlugin';
import { DashPlugin } from '../plugins/DashPlugin';
import { MpegtsPlugin } from '../plugins/MpegtsPlugin';
import { WebTorrentPlugin } from '../plugins/WebTorrentPlugin';

interface VideoSource {
  name: string;
  // Single source fallback
  src?: string;
  // Multi-source support
  sources?: PlayerSource[];
  desc: string;
  tags: string[];
  thumbnails?: string;
  poster?: string;
  tracks?: TextTrackConfig[];
  // Demo overrides
  theme?: PlayerTheme;
  themeColor?: string;
}

const SOURCES: VideoSource[] = [
  {
    name: "Big Buck Bunny (HLS)",
    sources: [
      { name: 'HLS Auto', url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", type: 'hls' },
      { name: 'MP4 Fallback', url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", type: 'mp4' }
    ],
    desc: "Standard HLS stream with storyboard thumbnails (Mux). Includes MP4 fallback.",
    tags: ["HLS", "Thumbnails", "Default Theme"],
    thumbnails: "https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/storyboard.vtt",
    theme: 'default',
    themeColor: '#6366f1'
  },
  {
    name: "Tears of Steel (DASH 4K)",
    src: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.mpd",
    desc: "Adaptive DASH stream supporting 4K resolution handled by dash.js plugin.",
    tags: ["DASH", "4K", "Game Theme"],
    theme: 'game',
    themeColor: '#eab308'
  },
  {
    name: "Sintel (WebTorrent)",
    // Using Sintel magnet with added WebRTC trackers for better browser support
    src: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Fopen.weissbier.gerbsen.de%3A443%2Fannounce",
    desc: "P2P streaming directly from the browser using WebRTC (WebTorrent). No server required. (Using Magnet Link)",
    tags: ["WebTorrent", "P2P", "Hacker Theme"],
    theme: 'hacker',
    themeColor: '#22c55e'
  },
  {
    name: "Sintel (MP4 Multi-Audio)",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    desc: "Classic MP4 file with external VTT subtitles.",
    tags: ["MP4", "VTT Subs", "Pixel Theme"],
    theme: 'pixel',
    themeColor: '#f43f5e',
    tracks: [
      { kind: 'subtitles', label: 'English', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt', srcLang: 'en', default: true },
      { kind: 'subtitles', label: 'Spanish', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_es.vtt', srcLang: 'es' },
      { kind: 'subtitles', label: 'French', src: 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_fr.vtt', srcLang: 'fr' },
      {  kind: 'subtitles',label: 'Eng', src: 'https://cacdn.hakunaymatata.com/subtitle/e1f0ae34a91dd6aa8af6451de5a9d9af.srt?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9jYWNkbi5oYWt1bmF5bWF0YXRhLmNvbS9zdWJ0aXRsZS8qIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzcwNDU5NDA0fX19XX0_&Signature=ArV2BKtF7uWBuywYx1xFHU6ixmvVIQhqOTRcsXYORI0kkHiKFutSVC2xhB21XJqJCINrU3YkTcOWIgsJ5UMTnZRyC~KMposocQv59veXW0OmflQk5rRLw-DsX6ZKi2MV9DOq9NTY4bKObPAhjUg~k2bYk4Wrt5DjcH11Yofy1o7SLAzPm60U6arIsyzSlVAa~eqz6KRY~tLUg3iXBObzGiuEjTSZKj3ioHE6FHn3ram2Pwu6GwJ9V4IZkfTkOAM5dAzBXlT9fpHBsEgtUVmUlKKSZPIO0g36ElyoBXeGfJ~dL86uDwxmGoYn1KxXt8MGSwxHmIfZqx5gUS8iRYiMDQ__&Key-Pair-Id=KMHN1LQ1HEUPL', srcLang: 'en' }
    ]
  },
  {
    name: "Broken Stream (Error Test)",
    src: "https://example.com/broken-video-stream.m3u8",
    desc: "A non-existent stream to demonstrate the player's automatic exponential backoff retry system and error handling.",
    tags: ["Error Handling", "Retry Logic", "Default Theme"],
    theme: 'default',
    themeColor: '#ef4444'
  }
];

export const Home = () => {
  const [currentSource, setCurrentSource] = useState(SOURCES[0]);

  // Initialize all plugins for the demo
  // Note: In a real app, you might only initialize the ones you need or lazy load them
  const plugins = [
    new HlsPlugin(),
    new DashPlugin(),
    new MpegtsPlugin(),
    new WebTorrentPlugin()
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 w-full grid lg:grid-cols-12 gap-12 animate-in fade-in duration-500">

      {/* Left Column: Player */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="aspect-video w-full bg-black rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 relative z-0">
          <StrataPlayer
            key={currentSource.name} // Force remount on source change to ensure clean plugin swap
            src={currentSource.src}
            sources={currentSource.sources}
            poster={currentSource.poster}
            thumbnails={currentSource.thumbnails}
            textTracks={currentSource.tracks}
            autoPlay={false}
            volume={0.8}
            plugins={plugins}

            // Pass demo config
            theme={currentSource.theme}
            themeColor={currentSource.themeColor}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{currentSource.name}</h1>
          </div>
          <p className="text-zinc-400 leading-relaxed">{currentSource.desc}</p>
          <div className="flex gap-2 mt-4 flex-wrap">
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
            <h3 className="font-semibold text-zinc-200">Format Gallery</h3>
          </div>
          <div className="divide-y divide-white/5">
            {SOURCES.map((item, i) => (
              <button
                key={i}
                onClick={() => setCurrentSource(item)}
                className={`w-full text-left p-4 hover:bg-white/5 transition-all duration-200 flex items-center gap-4 group ${currentSource.name === item.name ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${currentSource.name === item.name ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-white/10 text-zinc-400 group-hover:bg-white/20'}`}>
                  {i + 1}
                </div>
                <div>
                  <div className={`font-medium transition-colors ${currentSource.name === item.name ? 'text-indigo-400' : 'text-zinc-300 group-hover:text-white'}`}>{item.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{item.tags.join(', ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h3 className="font-semibold mb-2 text-indigo-100">Universal Playback</h3>
          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            StrataPlayer now supports HLS, DASH, MPEG-TS, and WebTorrent out of the box via a unified plugin system.
          </p>
          <a href="https://github.com/dev-AshishRanjan/StrataPlayer" target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg hover:shadow-white/10 text-sm">
            View Plugins Code
          </a>
        </div>
      </div>

    </div>
  );
};
