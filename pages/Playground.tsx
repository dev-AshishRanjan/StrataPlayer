
import React, { useState } from 'react';
import { StrataPlayer } from '../ui/StrataPlayer';
import { PlayIcon } from '../ui/Icons';
import { HlsPlugin } from '../plugins/HlsPlugin';

export const Playground = () => {
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundSrc, setPlaygroundSrc] = useState('');

  const handlePlaygroundPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (playgroundInput.trim()) {
      setPlaygroundSrc(playgroundInput.trim());
    }
  };

  // Initialize plugins (HLS support for the playground)
  const plugins = [new HlsPlugin()];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Stream Playground</h1>
        <p className="text-zinc-400 text-lg">Test any HLS (.m3u8) or MP4 stream URL instantly.</p>
      </div>

      <form onSubmit={handlePlaygroundPlay} className="w-full max-w-2xl flex gap-3 mb-12">
        <input
          type="url"
          required
          placeholder="https://example.com/stream.m3u8"
          value={playgroundInput}
          onChange={(e) => setPlaygroundInput(e.target.value)}
          className="flex-1 bg-zinc-900/80 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95 flex items-center gap-2"
        >
          <PlayIcon className="w-5 h-5 fill-current" />
          <span>Play</span>
        </button>
      </form>

      <div className="w-full aspect-video bg-zinc-900/50 rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
        {playgroundSrc ? (
          <StrataPlayer
            key={playgroundSrc}
            src={playgroundSrc}
            autoPlay={true}
            plugins={plugins}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 select-none pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4 border border-white/5">
              <PlayIcon className="w-8 h-8 ml-1 opacity-50" />
            </div>
            <p className="font-medium">Enter a URL above to start watching</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <span className="text-zinc-500 py-1.5">Try:</span>
        <button
          onClick={() => {
            const url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
            setPlaygroundInput(url);
            setPlaygroundSrc(url);
          }}
          className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-full text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
        >
          Big Buck Bunny
        </button>
        <button
          onClick={() => {
            const url = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel-multi-lang.ism/.m3u8";
            setPlaygroundInput(url);
            setPlaygroundSrc(url);
          }}
          className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-full text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
        >
          Tears of Steel
        </button>
      </div>
    </div>
  );
};
