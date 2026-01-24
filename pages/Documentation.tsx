
import React, { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { StrataPlayer } from '../ui/StrataPlayer';
import { HlsPlugin } from '../plugins/HlsPlugin';
import { DashPlugin } from '../plugins/DashPlugin';
import { MpegtsPlugin } from '../plugins/MpegtsPlugin';
import { WebTorrentPlugin } from '../plugins/WebTorrentPlugin';
import {
  CheckIcon, CopyIcon, MenuIcon, SettingsIcon,
  ArrowLeftIcon, PlayIcon, InfoIcon, FastForwardIcon,
  CustomizeIcon, WebFullscreenIcon, PaletteIcon, LockIcon,
  LayersIcon, MenuIcon as HamburgerIcon
} from '../ui/Icons';

// --- Helper Components ---

const CodeBlock = ({ code, language = 'tsx', title }: { code: string, language?: string, title?: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-[#0d1117] border border-white/10 shadow-lg group">
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <span className="text-xs font-mono text-zinc-400 font-medium">{title || language}</span>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto hide-scrollbar">
        <pre className="text-sm font-mono text-zinc-300 whitespace-pre leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const LiveExample = ({
  children,
  code
}: {
  children: React.ReactNode,
  code?: string
}) => {
  return (
    <div className="my-8 border border-white/10 rounded-xl overflow-hidden bg-zinc-900/30">
      <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Live Preview</span>
      </div>
      <div className="p-6 flex justify-center bg-black/20">
        <div className="w-full max-w-2xl aspect-video rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 relative z-0">
          {children}
        </div>
      </div>
      {code && (
        <div className="border-t border-white/10">
          <div className="px-4 py-2 bg-black/40 text-xs font-mono text-zinc-500 border-b border-white/5">Source Code</div>
          <div className="p-4 bg-[#0d1117] overflow-x-auto hide-scrollbar">
            <pre className="text-sm font-mono text-zinc-400">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const PropDoc = ({ name, type, defaultValue, description, example }: { name: string, type: string, defaultValue?: string, description: string, example?: string }) => (
  <div className="mb-10 pb-8 border-b border-white/5 last:border-0">
    <div className="flex items-baseline gap-3 mb-3 flex-wrap">
      <h3 className="text-lg font-bold text-white font-mono bg-white/5 px-2 py-1 rounded">{name}</h3>
      <span className="text-sm font-mono text-[var(--accent)]">{type}</span>
      {defaultValue && <span className="text-xs text-zinc-500 font-mono">default: {defaultValue}</span>}
    </div>
    <p className="text-zinc-300 leading-relaxed mb-4">{description}</p>
    {example && <CodeBlock code={example} />}
  </div>
);

const ApiItem = ({ name, signature, description, example }: { name: string, signature: string, description: string, example: string }) => (
  <div className="mb-10 pb-8 border-b border-white/5 last:border-0">
    <h3 className="text-lg font-bold text-white font-mono mb-2">{name}</h3>
    <div className="text-sm font-mono text-zinc-400 mb-3 bg-black/30 p-2 rounded border border-white/5 inline-block">
      {signature}
    </div>
    <p className="text-zinc-300 leading-relaxed mb-4">{description}</p>
    <CodeBlock code={example} />
  </div>
);

const InstanceIntro = () => (
  <div className="mb-12 p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
    <h3 className="text-lg font-bold text-white mb-4">How to access the Player Instance</h3>
    <p className="text-zinc-400 mb-4">
      To use the API methods, properties, or events, you need to capture the `StrataCore` instance.
    </p>
    <CodeBlock title="React Example" code={`import { StrataPlayer } from 'strataplayer';\n\nconst App = () => {\n  return (\n    <StrataPlayer \n      src="..."\n      onGetInstance={(player) => {\n        // You now have access to the player instance\n        console.log('Player version:', player.version);\n        \n        player.on('ready', () => {\n            player.play();\n        });\n      }}\n    />\n  );\n};`} />
  </div>
);

// --- Pages ---

const IntroPage = () => (
  <div className="space-y-12 animate-in fade-in duration-500">
    <div className="space-y-6">
      <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
        StrataPlayer
      </h1>
      <p className="text-xl text-zinc-300 leading-relaxed max-w-4xl">
        StrataPlayer is a <strong>universal media engine</strong> designed for the modern web.
        It abstracts the complexities of adaptive streaming, browser inconsistencies, and state management into a unified, robust API.
      </p>
      <p className="text-zinc-400 leading-relaxed max-w-4xl">
        Unlike simple wrappers around the HTML5 video tag, StrataPlayer acts as an orchestrator. It manages the entire playback lifecycle,
        from network negotiation and buffering strategies to audio context manipulation and UI synchronization.
        Built with performance as a first principle, it ensures that your application remains responsive even during high-bitrate 4K playback.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-colors">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
          <FastForwardIcon className="w-6 h-6 fill-current" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Performance Architecture</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          We use a decoupled state management system powered by <strong>NanoStores</strong>.
          Playback events (like time updates) occur independently of the React render cycle.
          This isolation prevents heavy re-renders, ensuring 60fps UI performance even on mobile devices.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-colors">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
          <CustomizeIcon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Modular Ecosystem</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The core player is ultra-lightweight. Support for complex formats like <strong>HLS, DASH, MPEG-TS, and WebTorrent</strong>
          is injected via plugins. You only ship the code your users actually need, keeping your bundle size minimal.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-colors">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <LockIcon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Robust & Resilient</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Network instability is handled automatically. The player features <strong>exponential backoff retry logic</strong>,
          automatic source failover, and comprehensive error recovery. It is designed to keep playing when others fail.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-colors">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <WebFullscreenIcon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Universal Compatibility</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          While StrataPlayer provides a first-class React component, the core engine is <strong>framework agnostic</strong>.
          It mounts seamlessly into Vue, Svelte, Angular, or Vanilla JS environments, making it a "write once, run everywhere" solution for media.
        </p>
      </div>
    </div>

    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-8">
      <h3 className="text-lg font-bold text-white mb-4">Why StrataPlayer?</h3>
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-zinc-400 text-sm">
          <CheckIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <span><strong>Audio Engine:</strong> Integrated Web Audio API context allows for software volume boosting (up to 300%) and real-time audio analysis.</span>
        </li>
        <li className="flex items-start gap-3 text-zinc-400 text-sm">
          <CheckIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <span><strong>Mobile Optimized:</strong> Built-in gesture controls, orientation locking, and touch-friendly interfaces ensure a native app-like experience.</span>
        </li>
        <li className="flex items-start gap-3 text-zinc-400 text-sm">
          <CheckIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <span><strong>Developer Experience:</strong> Full TypeScript support with strictly typed events and state. Comprehensive documentation and zero-config defaults.</span>
        </li>
        <li className="flex items-start gap-3 text-zinc-400 text-sm">
          <CheckIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <span><strong>Accessibility:</strong> Full keyboard navigation support, ARIA labels, and screen reader compatibility.</span>
        </li>
      </ul>
    </div>
  </div>
);

const InstallationPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">Installation</h1>

    <section>
      <h3 className="text-xl font-semibold mb-4 text-zinc-100">1. Install Core</h3>
      <p className="text-zinc-400 mb-4">Install the main package via NPM or Yarn.</p>
      <CodeBlock code="npm install strataplayer" language="bash" />
    </section>

    <section>
      <h3 className="text-xl font-semibold mb-4 text-zinc-100">2. Install Streaming Engines (Optional)</h3>
      <p className="text-zinc-400 mb-4">
        StrataPlayer uses a modular plugin system. Install only what you need to keep your bundle small.
      </p>
      <CodeBlock code={`# For HLS (.m3u8) support\nnpm install hls.js\n\n# For DASH (.mpd) support\nnpm install dashjs\n\n# For MPEG-TS / FLV\nnpm install mpegts.js\n\n# For P2P WebTorrent\nnpm install webtorrent`} language="bash" />
    </section>
  </div>
);

const UsageReactPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">Usage in React</h1>

    <section>
      <h3 className="text-xl font-semibold mb-4">Basic MP4 Playback</h3>
      <p className="text-zinc-400 mb-4">
        Import the component and CSS. Pass a source URL. No plugins required for standard files.
      </p>
      <LiveExample
        code={`import { StrataPlayer } from 'strataplayer';\nimport 'strataplayer/style.css';\n\nconst App = () => (\n  <StrataPlayer \n    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" \n    theme="default"\n  />\n);`}
      >
        <StrataPlayer src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" theme="default" />
      </LiveExample>
    </section>

    <section>
      <h3 className="text-xl font-semibold mb-4">Universal Playback</h3>
      <p className="text-zinc-400 mb-4">
        To support adaptive streaming (HLS, DASH), initialize plugins and pass them to the player. The player automatically selects the correct engine based on the extension or mime type.
      </p>
      <LiveExample
        code={`import { StrataPlayer } from 'strataplayer';\nimport { HlsPlugin } from 'strataplayer/hls';\nimport { DashPlugin } from 'strataplayer/dash';\nimport 'strataplayer/style.css';\n\n// Initialize outside component to avoid re-instantiation\nconst plugins = [\n  new HlsPlugin(),\n  new DashPlugin()\n];\n\nconst App = () => (\n  <StrataPlayer \n    src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" \n    plugins={plugins}\n    theme="default"\n  />\n);`}
      >
        <StrataPlayer
          src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          plugins={[new HlsPlugin(), new DashPlugin()]}
          theme="default"
        />
      </LiveExample>
    </section>
  </div>
);

const FrameworksPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">Other Frameworks & Vanilla JS</h1>
    <p className="text-zinc-400">
      StrataPlayer exports a <code>mountStrataPlayer</code> helper function that can render the player into any DOM element.
      This is perfect for usage in Vue, Svelte, Angular, or plain HTML projects.
    </p>

    <CodeBlock
      language="javascript"
      code={`import { mountStrataPlayer } from 'strataplayer';\nimport { HlsPlugin } from 'strataplayer/hls';\nimport 'strataplayer/style.css';\n\nconst container = document.getElementById('my-player');\n\n// Initialize and mount\nconst instance = mountStrataPlayer(container, {\n    src: 'https://example.com/video.m3u8',\n    plugins: [new HlsPlugin()],\n    theme: 'game',\n    autoPlay: false\n});\n\n// Update props dynamically after mount\ninstance.update({ theme: 'pixel' });\n\n// Cleanup when component/page is destroyed\n// instance.unmount();`}
    />
  </div>
);

const GeneralPropsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">General Configuration</h1>
    <p className="text-zinc-400 mb-8">
      These properties control the source, playback behavior, and core functionality of the player.
    </p>

    <PropDoc
      name="src"
      type="string"
      description="The primary media URL. Supports remote URLs, Blob URLs, or Magnet links."
      example={`<StrataPlayer\n  src="https://example.com/video.mp4"\n/>`}
    />

    <PropDoc
      name="id"
      type="string"
      description="Optional DOM ID attribute for the player container element."
      example={`<StrataPlayer\n  src="..."\n  id="my-player-1"\n/>`}
    />

    <PropDoc
      name="container"
      type="string"
      description="Optional CSS class name to append to the container element."
      example={`<StrataPlayer\n  src="..."\n  container="custom-wrapper-class"\n/>`}
    />

    <PropDoc
      name="type"
      type="string"
      description="Force a specific playback engine ('hls', 'dash', 'mp4', 'webtorrent'). Defaults to 'auto', which detects type by file extension."
      example={`<StrataPlayer\n  src="/stream"\n  type="hls" // Force HLS parsing\n/>`}
    />

    <PropDoc
      name="sources"
      type="PlayerSource[]"
      description="Array of sources for multi-quality or multi-format selection. These appear in the Settings > Source menu."
      example={`<StrataPlayer\n  sources={[\n    { url: 'video_1080p.mp4', name: '1080p' },\n    { url: 'video_720p.mp4', name: '720p' }\n  ]}\n/>`}
    />

    <PropDoc
      name="poster"
      type="string"
      description="URL of an image to display before playback begins."
      example={`<StrataPlayer\n  src="..."\n  poster="/images/cover.jpg"\n/>`}
    />

    <PropDoc
      name="thumbnails"
      type="string"
      description="URL to a VTT file containing storyboard sprites for timeline hovering."
      example={`<StrataPlayer\n  src="..."\n  thumbnails="/images/sprites.vtt"\n/>`}
    />

    <PropDoc
      name="autoPlay"
      type="boolean"
      defaultValue="false"
      description="Automatically start playback when ready. Note: Most browsers require the video to be muted for autoplay to succeed."
      example={`<StrataPlayer\n  src="..."\n  autoPlay={true}\n  muted={true} // Required for most browsers\n/>`}
    />

    <PropDoc
      name="loop"
      type="boolean"
      defaultValue="false"
      description="Automatically replay the video from the beginning when it ends."
      example={`<StrataPlayer\n  src="..."\n  loop={true}\n/>`}
    />

    <PropDoc
      name="muted"
      type="boolean"
      defaultValue="false"
      description="Initialize the video in a muted state."
      example={`<StrataPlayer\n  src="..."\n  muted={true}\n/>`}
    />

    <PropDoc
      name="volume"
      type="number"
      defaultValue="1.0"
      description="Initial volume level between 0.0 (silent) and 1.0 (max)."
      example={`<StrataPlayer\n  src="..."\n  volume={0.5} // 50% volume\n/>`}
    />

    <PropDoc
      name="audioGain"
      type="number"
      defaultValue="1.0"
      description="Software audio boost factor (e.g., 2.0 = 200% volume)."
      example={`<StrataPlayer\n  src="..."\n  audioGain={2.0} // Boost volume by 2x\n/>`}
    />

    <PropDoc
      name="playbackRate"
      type="number"
      defaultValue="1.0"
      description="Initial playback speed (e.g., 1.5 = 1.5x speed)."
      example={`<StrataPlayer\n  src="..."\n  playbackRate={1.5}\n/>`}
    />

    <PropDoc
      name="playsInline"
      type="boolean"
      defaultValue="true"
      description="Prevents iOS Safari from forcing the video into a native fullscreen player."
      example={`<StrataPlayer\n  src="..."\n  playsInline={true}\n/>`}
    />

    <PropDoc
      name="isLive"
      type="boolean"
      defaultValue="false"
      description="Optimizes the UI for live streams (hides progress bar, shows 'Live' badge)."
      example={`<StrataPlayer\n  src="..."\n  isLive={true}\n/>`}
    />

    <PropDoc
      name="fetchTimeout"
      type="number"
      defaultValue="30000"
      description="Timeout in milliseconds for network requests (video segments, subtitles, thumbnails)."
      example={`<StrataPlayer\n  src="..."\n  fetchTimeout={15000} // 15 seconds\n/>`}
    />

    <PropDoc
      name="disablePersistence"
      type="boolean"
      defaultValue="false"
      description="Disables saving user settings (volume, theme, etc.) to LocalStorage."
      example={`<StrataPlayer\n  src="..."\n  disablePersistence={true}\n/>`}
    />
  </div>
);

const UiPropsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Appearance & UI Options</h1>
    <p className="text-zinc-400 mb-8">
      Customize the look and feel of the player interface.
    </p>

    <PropDoc
      name="theme"
      type="'default' | 'pixel' | 'game' | 'hacker'"
      defaultValue="'default'"
      description="Sets the visual theme of the player interface."
      example={`<StrataPlayer\n  src="..."\n  theme="hacker"\n/>`}
    />
    <LiveExample code='<StrataPlayer theme="pixel" src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" />'>
      <StrataPlayer theme="pixel" src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" />
    </LiveExample>

    <PropDoc
      name="themeColor"
      type="string"
      defaultValue="#6366f1"
      description="Primary accent color used for sliders, buttons, and highlights. Accepts Hex, RGB, HSL."
      example={`<StrataPlayer\n  src="..."\n  themeColor="#10b981" // Emerald Green\n/>`}
    />

    <PropDoc
      name="iconSize"
      type="'small' | 'medium' | 'large'"
      defaultValue="'medium'"
      description="Scales the size of all UI icons and buttons."
      example={`<StrataPlayer\n  src="..."\n  iconSize="large" // Good for mobile\n/>`}
    />

    <PropDoc
      name="autoSize"
      type="boolean"
      defaultValue="false"
      description="If true, uses object-fit: cover to fill the container, removing black bars."
      example={`<StrataPlayer\n  src="..."\n  autoSize={true}\n/>`}
    />

    <PropDoc
      name="backdrop"
      type="boolean"
      defaultValue="true"
      description="Enables blur/frosted glass effects on menus and panels."
      example={`<StrataPlayer\n  src="..."\n  backdrop={false} // Solid background\n/>`}
    />

    <PropDoc
      name="highlight"
      type="Highlight[]"
      description="Array of markers to display on the timeline progress bar."
      example={`<StrataPlayer\n  src="..."\n  highlight={[\n    { time: 10, text: 'Intro' },\n    { time: 120, text: 'Climax' },\n    { time: 200, text: 'Credits' }\n  ]}\n/>`}
    />

    <h3 className="text-xl font-bold mt-12 mb-6 text-white border-b border-white/10 pb-2">Control Toggles</h3>
    <p className="text-zinc-400 mb-6">Boolean flags to enable/disable specific UI features.</p>

    <div className="space-y-6">
      <PropDoc
        name="hotKey"
        type="boolean"
        defaultValue="true"
        description="Enables keyboard shortcuts (Space, Arrows, F, M)."
        example={`<StrataPlayer hotKey={false} />`}
      />
      <PropDoc
        name="screenshot"
        type="boolean"
        defaultValue="false"
        description="Shows the camera button to take a screenshot."
        example={`<StrataPlayer screenshot={true} />`}
      />
      <PropDoc
        name="pip"
        type="boolean"
        defaultValue="true"
        description="Shows the Picture-in-Picture toggle button."
        example={`<StrataPlayer pip={false} />`}
      />
      <PropDoc
        name="setting"
        type="boolean"
        defaultValue="true"
        description="Shows the settings (gear icon) menu."
        example={`<StrataPlayer setting={false} />`}
      />
      <PropDoc
        name="fullscreen"
        type="boolean"
        defaultValue="true"
        description="Shows the Fullscreen toggle button."
        example={`<StrataPlayer fullscreen={false} />`}
      />
      <PropDoc
        name="fullscreenWeb"
        type="boolean"
        defaultValue="false"
        description="Shows the Web Fullscreen button (fills browser window)."
        example={`<StrataPlayer fullscreenWeb={true} />`}
      />
      <PropDoc
        name="lock"
        type="boolean"
        defaultValue="false"
        description="Shows the Lock button on mobile to disable touch interactions."
        example={`<StrataPlayer lock={true} />`}
      />
      <PropDoc
        name="flip"
        type="boolean"
        defaultValue="true"
        description="Shows the Flip (Mirror) controls in the settings menu."
        example={`<StrataPlayer flip={false} />`}
      />
      <PropDoc
        name="aspectRatio"
        type="boolean"
        defaultValue="true"
        description="Shows the Aspect Ratio controls in the settings menu."
        example={`<StrataPlayer aspectRatio={false} />`}
      />
      <PropDoc
        name="fastForward"
        type="boolean"
        defaultValue="true"
        description="Enables 2x speed when long-pressing the video."
        example={`<StrataPlayer fastForward={false} />`}
      />
      <PropDoc
        name="autoOrientation"
        type="boolean"
        defaultValue="true"
        description="Attempts to lock mobile screen to landscape when fullscreen."
        example={`<StrataPlayer autoOrientation={false} />`}
      />
      <PropDoc
        name="centerControls"
        type="boolean"
        defaultValue="true"
        description="Shows the large Play/Pause and Skip buttons in the center of the screen."
        example={`<StrataPlayer centerControls={false} />`}
      />
      <PropDoc
        name="gestureSeek"
        type="boolean"
        defaultValue="false"
        description="Enables drag-to-seek gestures anywhere on the video player (mobile optimized)."
        example={`<StrataPlayer gestureSeek={true} />`}
      />
    </div>
  </div>
);

// --- New Component Pages ---

const ControlsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Controls</h1>
    <p className="text-zinc-400 mb-8">
      StrataPlayer allows you to inject custom buttons into the control bar. You can position them <code>left</code>, <code>right</code>, or <code>center</code>.
      Use the <code>index</code> property to order them relative to built-in controls (Play button is index 10).
    </p>

    <PropDoc
      name="controls"
      type="ControlItem[]"
      description="Array of custom control definitions. Can include click actions or nested menus."
      example={`interface ControlItem {
  id?: string;
  position: 'left' | 'right' | 'center';
  index: number; // Order: 0-100
  html?: string | ReactNode;
  tooltip?: string;
  onClick?: (core: StrataCore) => void;
  children?: SettingItem[]; // For nested menus
  className?: string;
  style?: CSSProperties;
}`}
    />

    <h3 className="text-xl font-bold text-white mt-8 mb-4">Simple Action Button</h3>
    <LiveExample
      code={`<StrataPlayer
  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  controls={[
    {
      id: 'demo-btn',
      position: 'right',
      index: 1, // Place early in right stack
      html: <div className="flex items-center gap-1 text-[var(--accent)] font-bold text-xs"><InfoIcon className="w-3 h-3" /> Info</div>,
      tooltip: 'Demo Click',
      onClick: (player) => player.notify({ type: 'info', message: 'This is a custom control button!' })
    }
  ]}
/>`}
    >
      <StrataPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        controls={[
          {
            id: 'demo-btn',
            position: 'right',
            index: 1,
            html: <div className="flex items-center gap-1 text-[var(--accent)] font-bold text-xs"><InfoIcon className="w-3 h-3" /> Info</div>,
            tooltip: 'Demo Click',
            onClick: (player) => player.notify({ type: 'info', message: 'This is a custom control button!' })
          }
        ]}
        theme="default"
      />
    </LiveExample>

    <h3 className="text-xl font-bold text-white mt-8 mb-4">Nested Menu (2-Level Deep)</h3>
    <p className="text-zinc-400 mb-4">
      Controls can also open complex menus. Use the <code>children</code> property to define nested structure.
    </p>
    <LiveExample
      code={`<StrataPlayer
  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  controls={[
    {
      id: 'custom-menu',
      position: 'right',
      index: 2,
      html: <MenuIcon className="w-5 h-5" />,
      tooltip: 'Custom Menu',
      children: [
        { html: 'Quick Action', onClick: () => alert('Quick!') },
        { separator: true },
        {
          html: 'Nested Options',
          children: [
             { html: 'Level 2 - Item A', onClick: () => alert('A') },
             { html: 'Level 2 - Item B', onClick: () => alert('B') }
          ]
        }
      ]
    }
  ]}
/>`}
    >
      <StrataPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        controls={[
          {
            id: 'custom-menu',
            position: 'right',
            index: 2,
            html: <HamburgerIcon className="w-5 h-5" />, // Using HamburgerIcon visually aliased as MenuIcon in imports
            tooltip: 'Custom Menu',
            children: [
              { html: 'Quick Action', onClick: () => alert('Quick Action Triggered') },
              { separator: true },
              {
                html: 'Nested Options',
                children: [
                  { html: 'Level 2 - Item A', onClick: () => alert('Selected Item A') },
                  { html: 'Level 2 - Item B', onClick: () => alert('Selected Item B') }
                ]
              }
            ]
          }
        ]}
        theme="default"
      />
    </LiveExample>
  </div>
);

const SettingsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Settings Menu</h1>
    <p className="text-zinc-400 mb-8">
      Extend the main settings menu with custom items. You can add simple actions, toggle switches, or sliders.
    </p>

    <PropDoc
      name="settings"
      type="SettingItem[]"
      description="Array of custom setting definitions to append to the main menu."
      example={`interface SettingItem {
  id?: string;
  html?: string | ReactNode;
  icon?: string | ReactNode;
  tooltip?: string;
  separator?: boolean;
  
  // State
  active?: boolean; // Visual checkmark
  value?: any; // Value identifier

  // Toggle Switch
  switch?: boolean;
  onSwitch?: (item: SettingItem, checked: boolean) => void;
  
  // Range Slider
  range?: boolean;
  min?: number; max?: number; step?: number;
  onRange?: (value: number) => void;
  formatValue?: (value: number) => string;

  // Actions
  onClick?: (item: SettingItem) => void;
  
  // Nested Menu
  children?: SettingItem[];
}`}
    />

    <LiveExample
      code={`<StrataPlayer
  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  settings={[
    {
      html: 'Auto-Skip Intro',
      tooltip: 'Skip opening credits',
      switch: true,
      onSwitch: (item, checked) => {
         console.log('Toggled!', checked);
         // You should manage state externally to update the switch prop if needed
      }
    },
    { separator: true },
    {
      html: 'Advanced Config',
      icon: <LayersIcon className="w-4 h-4" />,
      children: [
        { html: 'Mode A', onClick: () => console.log('A') },
        { html: 'Mode B', onClick: () => console.log('B') }
      ]
    },
    {
      html: 'External Link',
      onClick: () => window.open('https://google.com', '_blank')
    }
  ]}
/>`}
    >
      <StrataPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        settings={[
          {
            html: 'Auto-Skip Intro',
            tooltip: 'Skip opening credits',
            switch: true,
            onSwitch: (item, checked) => {
              alert(`Toggled: ${checked}`);
            }
          },
          { separator: true },
          {
            html: 'Advanced Config',
            icon: <LayersIcon className="w-4 h-4" />,
            children: [
              { html: 'Mode A', onClick: () => alert('Mode A Selected') },
              { html: 'Mode B', onClick: () => alert('Mode B Selected') }
            ]
          },
          {
            html: 'Visit GitHub',
            onClick: () => window.open('https://github.com/dev-AshishRanjan/StrataPlayer', '_blank')
          }
        ]}
        theme="default"
      />
    </LiveExample>
  </div>
);

const ContextMenuPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Context Menu</h1>
    <p className="text-zinc-400 mb-8">
      Customize the right-click menu. You can add labels, separators, and clickable actions.
    </p>

    <PropDoc
      name="contextmenu"
      type="ContextMenuItem[]"
      description="Array of items to display in the right-click context menu."
      example={`interface ContextMenuItem {
  html?: string | ReactNode;
  disabled?: boolean;
  icon?: string | ReactNode;
  onClick?: (close: () => void) => void;
  checked?: boolean;
  separator?: boolean;
  isLabel?: boolean; // Renders as a non-clickable header
}`}
    />

    <LiveExample
      code={`<StrataPlayer
  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  contextmenu={[
    {
      html: 'Custom Actions',
      isLabel: true
    },
    {
      html: 'Copy Video URL',
      onClick: (close) => {
         navigator.clipboard.writeText(window.location.href);
         close();
      }
    },
    { separator: true },
    {
      html: 'Stats for Nerds',
      disabled: true
    }
  ]}
/>`}
    >
      <StrataPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        contextmenu={[
          {
            html: 'Custom Actions',
            isLabel: true
          },
          {
            html: 'Copy Video URL',
            onClick: (close) => {
              alert('Copied!');
              close();
            }
          },
          { separator: true },
          {
            html: 'Disabled Item',
            disabled: true
          }
        ]}
        theme="default"
      />
    </LiveExample>
  </div>
);

const LayersPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Layers</h1>
    <p className="text-zinc-400 mb-8">
      Add custom overlay layers on top of the video player. Useful for watermarks, ads, or custom info panels.
    </p>

    <PropDoc
      name="layers"
      type="LayerConfig[]"
      description="Array of custom HTML overlays."
      example={`interface LayerConfig {
  name?: string;
  html: string | ReactNode;
  style?: CSSProperties;
  className?: string;
  click?: () => void;
  mounted?: (element: HTMLElement) => void;
}`}
    />

    <LiveExample
      code={`<StrataPlayer
  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  layers={[
    {
      html: <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-bold text-white">REC</span></div>,
      style: {
         position: 'absolute',
         top: '20px',
         left: '20px',
         pointerEvents: 'none'
      }
    }
  ]}
/>`}
    >
      <StrataPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
        layers={[
          {
            html: <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-bold text-white">REC</span></div>,
            style: {
              position: 'absolute',
              top: '20px',
              left: '20px',
              pointerEvents: 'none'
            }
          }
        ]}
        theme="default"
      />
    </LiveExample>
  </div>
);


const HlsPluginPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">HLS Plugin</h1>
    <p className="text-zinc-400">Enables playback of HTTP Live Streaming (<code>.m3u8</code>).</p>
    <LiveExample
      code={`import { HlsPlugin } from 'strataplayer/hls';\n\n<StrataPlayer \n  src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"\n  plugins={[new HlsPlugin()]}\n  theme="default"\n/>`}
    >
      <StrataPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        plugins={[new HlsPlugin()]}
        theme="default"
        volume={0}
      />
    </LiveExample>

    <h3 className="text-xl font-bold mt-12 mb-4">Advanced: Creating a Custom HLS Plugin</h3>
    <p className="text-zinc-400 mb-6">
      If you need granular control over the Hls.js configuration (e.g. buffer size, timeout policies, error recovery),
      you can create a custom plugin that implements the <code>IPlugin</code> interface. This keeps the core lightweight
      while allowing full flexibility.
    </p>

    <CodeBlock
      language="typescript"
      title="CustomHlsPlugin.ts"
      code={`import { StrataCore, IPlugin } from 'strataplayer';
import Hls from 'hls.js';

export class CustomHlsPlugin implements IPlugin {
    name = 'CustomHlsPlugin';
    private hls: Hls | null = null;
    private core: StrataCore | null = null;
    private retryCount = 0;

    init(core: StrataCore) {
        this.core = core;
        // Listen for video load events
        core.on('load', (data) => {
            if (data.type === 'hls' || data.url.includes('.m3u8')) {
                this.load(data.url);
            } else {
                this.destroy();
            }
        });
    }

    load(url: string) {
        if (this.hls) this.destroy();

        if (!Hls.isSupported()) {
            // Fallback for Safari (native HLS)
            if (this.core.video.canPlayType('application/vnd.apple.mpegurl')) {
                this.core.video.src = url;
            }
            return;
        }

        // Custom High-Performance Configuration
        const config = {
            autoStartLoad: true,
            startFragPrefetch: true,
            maxBufferLength: 600, // Buffer 10 minutes
            maxMaxBufferLength: 1800,
            maxBufferSize: 500 * 1000 * 1000, // 500MB
            appendErrorMaxRetry: 20,
            fragLoadPolicy: {
                default: {
                    maxTimeToFirstByteMs: 5000,
                    maxLoadTimeMs: 120000,
                    timeoutRetry: { maxNumRetry: 10, retryDelayMs: 1000, maxRetryDelayMs: 5000 },
                    errorRetry: { maxNumRetry: 10, retryDelayMs: 1000, maxRetryDelayMs: 5000 }
                }
            }
        };

        this.hls = new Hls(config);
        this.hls.loadSource(url);
        this.hls.attachMedia(this.core.video);

        // Advanced Error Recovery
        this.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.warn('Fatal media error:', data.details);
                        if (data.details === 'fragParsingError' && this.retryCount > 2) {
                            this.core.triggerError('Invalid Chunk Data', true);
                        } else {
                            this.retryCount++;
                            this.hls.recoverMediaError();
                        }
                        break;
                    case Hls.ErrorTypes.NETWORK_ERROR:
                         console.warn('Fatal network error:', data.details);
                         this.hls.startLoad();
                         break;
                    default:
                        this.hls.destroy();
                        this.core.triggerError('Fatal HLS Error', true);
                        break;
                }
            } else {
                this.retryCount = 0;
            }
        });
        
        // Sync Quality Levels to UI
        this.hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
             const levels = data.levels.map((l, i) => ({ height: l.height, bitrate: l.bitrate, index: i }));
             this.core.store.setState({ qualityLevels: levels });
        });
    }

    destroy() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
}

// Usage:
// <StrataPlayer plugins={[new CustomHlsPlugin()]} ... />`}
    />
  </div>
);

const DashPluginPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">DASH Plugin</h1>
    <p className="text-zinc-400">Enables playback of MPEG-DASH (<code>.mpd</code>).</p>
    <LiveExample
      code={`import { DashPlugin } from 'strataplayer/dash';\n\n<StrataPlayer \n  src="https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"\n  plugins={[new DashPlugin()]}\n  theme="default"\n/>`}
    >
      <StrataPlayer
        src="https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"
        plugins={[new DashPlugin()]}
        theme="default"
        volume={0}
      />
    </LiveExample>
  </div>
);

const MpegtsPluginPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">MPEG-TS / FLV Plugin</h1>
    <p className="text-zinc-400">
      Enables playback of HTTP-FLV and MPEG-TS streams using <code>mpegts.js</code>.
      Ideal for low-latency live streaming.
    </p>

    <LiveExample
      code={`import { MpegtsPlugin } from 'strataplayer/mpegts';

<StrataPlayer
  src="https://example.com/live/stream.flv"
  type="flv"
  isLive={true}
  plugins={[new MpegtsPlugin()]}
  onGetInstance={(player) => {
      // Listen for specific mpegts errors
      player.on('error', (err) => console.log('Stream offline', err));
  }}
/>`}
    >
      {/* Using a visual placeholder since public FLV streams with CORS are rare/unreliable */}
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center border border-white/10 rounded-lg relative overflow-hidden group aspect-video">
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/10">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1"></div>
            </div>
            <p className="text-zinc-400 font-mono text-sm">Waiting for live stream...</p>
            <p className="text-zinc-600 text-xs mt-2">mpegts.js initialized</p>
          </div>
        </div>
      </div>
    </LiveExample>
  </div>
);

const WebTorrentPluginPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold">WebTorrent Plugin</h1>
    <p className="text-zinc-400">Enables P2P streaming via Magnet links.</p>

    <LiveExample
      code={`import { WebTorrentPlugin } from 'strataplayer/webtorrent';\n\n<StrataPlayer \n  src="magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10..."\n  plugins={[new WebTorrentPlugin()]}\n  theme="default"\n/>`}
    >
      {/* Using Sintel Torrent */}
      <StrataPlayer
        src="magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com"
        plugins={[new WebTorrentPlugin()]}
        theme="default"
        muted={true}
      />
    </LiveExample>
  </div>
);

const InstanceEventsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Events API</h1>
    <InstanceIntro />
    <p className="text-zinc-400 mb-8">
      Listen to events using <code>player.on('event', callback)</code>. All events return an unsubscribe function.
    </p>

    <h3 className="text-xl font-bold text-white mb-4">Lifecycle Events</h3>
    <ApiItem
      name="ready"
      signature="() => void"
      description="Fired when the player instance is attached to the DOM and initialized."
      example={`player.on('ready', () => {\n  console.log('Player is ready!');\n  player.play();\n});`}
    />
    <ApiItem
      name="load"
      signature="(data: {url: string, type: string}) => void"
      description="Fired when a new source is loaded."
      example={`player.on('load', (data) => {\n  console.log('New source loaded:', data.url);\n});`}
    />
    <ApiItem
      name="destroy"
      signature="() => void"
      description="Fired when the player instance is destroyed."
      example={`player.on('destroy', () => {\n  console.log('Player destroyed, cleanup done.');\n});`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">Playback Events</h3>
    <ApiItem
      name="play"
      signature="() => void"
      description="Fired when playback begins or resumes."
      example={`player.on('play', () => {\n  console.log('Playback started');\n});`}
    />
    <ApiItem
      name="pause"
      signature="() => void"
      description="Fired when playback is paused."
      example={`player.on('pause', () => {\n  console.log('Playback paused');\n});`}
    />
    <ApiItem
      name="ended"
      signature="() => void"
      description="Fired when playback completes."
      example={`player.on('ended', () => {\n  console.log('Video finished');\n});`}
    />
    <ApiItem
      name="seek"
      signature="() => void"
      description="Fired when a seek operation completes."
      example={`player.on('seek', () => {\n  console.log('Seeked to', player.currentTime);\n});`}
    />
    <ApiItem
      name="timeupdate"
      signature="() => void"
      description="Fired continuously as the playback time updates."
      example={`player.on('timeupdate', () => {\n  console.log('Current time:', player.currentTime);\n});`}
    />
    <ApiItem
      name="loading"
      signature="(isLoading: boolean) => void"
      description="Fired when the buffering state changes."
      example={`player.on('loading', (isLoading) => {\n  console.log(isLoading ? 'Buffering...' : 'Playing');\n});`}
    />
    <ApiItem
      name="error"
      signature="(msg: string) => void"
      description="Fired when a fatal error occurs."
      example={`player.on('error', (msg) => {\n  console.error('Fatal error:', msg);\n});`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">UI & Interaction Events</h3>
    <ApiItem
      name="volumechange"
      signature="() => void"
      description="Fired when volume or mute state changes."
      example={`player.on('volumechange', () => {\n  console.log('Volume:', player.volume, 'Muted:', player.muted);\n});`}
    />
    <ApiItem
      name="fullscreen"
      signature="(isActive: boolean) => void"
      description="Fired when entering fullscreen mode."
      example={`player.on('fullscreen', (active) => {\n  console.log('Fullscreen active:', active);\n});`}
    />
    <ApiItem
      name="fullscreen_exit"
      signature="() => void"
      description="Fired when exiting fullscreen mode."
      example={`player.on('fullscreen_exit', () => {\n  console.log('Exited fullscreen');\n});`}
    />
    <ApiItem
      name="pip"
      signature="(isActive: boolean) => void"
      description="Fired when Picture-in-Picture state changes."
      example={`player.on('pip', (active) => {\n  console.log('PiP mode:', active);\n});`}
    />
    <ApiItem
      name="resize"
      signature="(dims: {width: number, height: number}) => void"
      description="Fired when the player container is resized."
      example={`player.on('resize', ({ width, height }) => {\n  console.log('New dimensions:', width, height);\n});`}
    />
    <ApiItem
      name="control"
      signature="(isVisible: boolean) => void"
      description="Fired when controls show or hide."
      example={`player.on('control', (visible) => {\n  console.log('Controls visible:', visible);\n});`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">User Request Events</h3>
    <ApiItem
      name="quality-request"
      signature="(index: number) => void"
      description="Fired when user selects a video quality level."
      example={`player.on('quality-request', (index) => {\n  console.log('User requested quality index:', index);\n});`}
    />
    <ApiItem
      name="audio-track-request"
      signature="(index: number) => void"
      description="Fired when user selects an audio track."
      example={`player.on('audio-track-request', (index) => {\n  console.log('User requested audio track:', index);\n});`}
    />
  </div>
);

const InstancePropertiesPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Properties API</h1>
    <InstanceIntro />

    <h3 className="text-xl font-bold text-white mb-4">Direct Accessors</h3>
    <p className="text-zinc-400 mb-6">These properties can be accessed directly on the player instance.</p>

    <PropDoc
      name="player.playing"
      type="boolean"
      description="Read-only. True if the video is currently playing and not paused or ended."
      example={`player.on('ready', () => {\n  if (player.playing) {\n    console.log('Currently playing');\n  } else {\n    player.play();\n  }\n});`}
    />
    <PropDoc
      name="player.paused"
      type="boolean"
      description="Read-only. True if the video is currently paused."
      example={`if (player.paused) {\n  player.play();\n}`}
    />
    <PropDoc
      name="player.currentTime"
      type="number"
      description="Get or Set the current playback time in seconds."
      example={`// Jump to 30 seconds\nplayer.currentTime = 30;\n\n// Log current time\nconsole.log(player.currentTime);`}
    />
    <PropDoc
      name="player.duration"
      type="number"
      description="Read-only. The total duration of the media in seconds."
      example={`const duration = player.duration;\nconsole.log('Video length:', duration);`}
    />
    <PropDoc
      name="player.volume"
      type="number"
      description="Get or Set the volume (0.0 to 1.0)."
      example={`// Set to 50%\nplayer.volume = 0.5;`}
    />
    <PropDoc
      name="player.muted"
      type="boolean"
      description="Get or Set the mute state."
      example={`player.muted = true; // Mute\nplayer.muted = false; // Unmute`}
    />
    <PropDoc
      name="player.playbackRate"
      type="number"
      description="Get or Set the playback speed."
      example={`player.playbackRate = 2.0; // 2x Speed`}
    />
    <PropDoc
      name="player.loop"
      type="boolean"
      description="Get or Set the loop state."
      example={`player.loop = true; // Enable loop`}
    />

    <h3 className="text-xl font-bold text-white mt-12 mb-4">Reactive Store State</h3>
    <p className="text-zinc-400 mb-6">
      Detailed state is managed via a NanoStore. You can access it via <code>player.store.get()</code>.
      This ensures React components can subscribe to updates without polling.
    </p>
    <CodeBlock code={`// Access full state snapshot\nconst state = player.store.get();\n\nif (state.isBuffering) {\n  console.log('Player is buffering...');\n}`} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      <PropDoc name="isBuffering" type="boolean" description="True if the player is waiting for data." />
      <PropDoc name="isLive" type="boolean" description="True if the content is a live stream." />
      <PropDoc name="isLocked" type="boolean" description="True if the mobile interface is locked." />
      <PropDoc name="buffered" type="{start: number, end: number}[]" description="Array of buffered time ranges." />
      <PropDoc name="qualityLevels" type="{height: number, bitrate: number, index: number}[]" description="Available video qualities." />
      <PropDoc name="currentQuality" type="number" description="Index of current quality (-1 for Auto)." />
      <PropDoc name="audioTracks" type="{label: string, language: string, index: number}[]" description="Available audio tracks." />
      <PropDoc name="subtitleTracks" type="{label: string, language: string, index: number}[]" description="Available subtitle tracks." />
      <PropDoc name="currentSubtitle" type="number" description="Index of active subtitle track (-1 for Off)." />
      <PropDoc name="activeCues" type="string[]" description="Array of currently active subtitle text strings." />
      <PropDoc name="error" type="string | null" description="Current error message, if any." />
      <PropDoc name="isFullscreen" type="boolean" description="True if in fullscreen mode." />
      <PropDoc name="isPip" type="boolean" description="True if in Picture-in-Picture mode." />
      <PropDoc name="controlsVisible" type="boolean" description="True if controls are currently showing." />
    </div>
  </div>
);

const InstanceMethodsPage = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <h1 className="text-3xl font-bold mb-8">Methods API</h1>
    <InstanceIntro />

    <h3 className="text-xl font-bold text-white mb-4">Playback Control</h3>
    <ApiItem
      name="play()"
      signature="Promise<void>"
      description="Attempts to start playback."
      example={`player.play().catch(error => {\n  console.error('Autoplay prevented:', error);\n});`}
    />
    <ApiItem
      name="pause()"
      signature="void"
      description="Pauses playback."
      example={`player.pause();`}
    />
    <ApiItem
      name="togglePlay()"
      signature="void"
      description="Toggles between play and pause states."
      example={`// If playing, it pauses. If paused, it plays.\nplayer.togglePlay();`}
    />
    <ApiItem
      name="seek(time)"
      signature="(seconds: number) => void"
      description="Seeks to a specific time in seconds."
      example={`// Seek to 2 minutes\nplayer.seek(120);`}
    />
    <ApiItem
      name="forward(time?)"
      signature="(seconds: number = 10) => void"
      description="Skips forward by the specified amount."
      example={`// Skip 10 seconds (default)\nplayer.forward();\n\n// Skip 30 seconds\nplayer.forward(30);`}
    />
    <ApiItem
      name="backward(time?)"
      signature="(seconds: number = 10) => void"
      description="Skips backward by the specified amount."
      example={`// Rewind 10 seconds\nplayer.backward();`}
    />
    <ApiItem
      name="load(source, tracks?)"
      signature="(source: PlayerSource, tracks?: TextTrackConfig[]) => void"
      description="Loads a new media source."
      example={`player.load({\n  url: 'https://example.com/video2.mp4',\n  type: 'mp4'\n});`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">Audio & Quality</h3>
    <ApiItem
      name="setVolume(vol)"
      signature="(vol: number) => void"
      description="Sets volume (0.0 to 1.0)."
      example={`player.setVolume(0.8);`}
    />
    <ApiItem
      name="toggleMute()"
      signature="void"
      description="Toggles mute state."
      example={`player.toggleMute();`}
    />
    <ApiItem
      name="setAudioGain(gain)"
      signature="(gain: number) => void"
      description="Sets software audio boost (1.0 = 100%, 2.0 = 200%)."
      example={`player.setAudioGain(2.0);`}
    />
    <ApiItem
      name="setQuality(index)"
      signature="(index: number) => void"
      description="Sets video quality level (-1 for Auto)."
      example={`// Set to highest quality available\nconst levels = player.store.get().qualityLevels;\nplayer.setQuality(levels.length - 1);`}
    />
    <ApiItem
      name="setAudioTrack(index)"
      signature="(index: number) => void"
      description="Sets the active audio track."
      example={`// Switch to second audio track\nplayer.setAudioTrack(1);`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">Subtitles</h3>
    <ApiItem
      name="setSubtitle(index)"
      signature="(index: number) => void"
      description="Sets the active subtitle track index (-1 to disable)."
      example={`// Enable first subtitle track\nplayer.setSubtitle(0);\n\n// Disable subtitles\nplayer.setSubtitle(-1);`}
    />
    <ApiItem
      name="addTextTrack(file, label)"
      signature="(file: File, label: string) => void"
      description="Uploads a local VTT/SRT file."
      example={`// Assuming you have a File object from an input\nplayer.addTextTrack(fileObject, 'English');`}
    />
    <ApiItem
      name="loadSubtitle(url, label)"
      signature="(url: string, label: string) => void"
      description="Loads a remote VTT subtitle file."
      example={`player.loadSubtitle('https://example.com/subs.vtt', 'French');`}
    />
    <ApiItem
      name="setSubtitleOffset(seconds)"
      signature="(seconds: number) => void"
      description="Adjusts subtitle synchronization offset."
      example={`// Delay subtitles by 0.5s\nplayer.setSubtitleOffset(0.5);`}
    />
    <ApiItem
      name="resetSubtitleSettings()"
      signature="void"
      description="Resets subtitle customization to defaults."
      example={`player.resetSubtitleSettings();`}
    />

    <h3 className="text-xl font-bold text-white mb-4 mt-8">Interface & Tools</h3>
    <ApiItem
      name="toggleFullscreen()"
      signature="Promise<void>"
      description="Toggles fullscreen mode."
      example={`player.toggleFullscreen();`}
    />
    <ApiItem
      name="togglePip()"
      signature="void"
      description="Toggles Picture-in-Picture mode."
      example={`player.togglePip();`}
    />
    <ApiItem
      name="screenshot()"
      signature="void"
      description="Captures current frame and triggers download."
      example={`player.screenshot();`}
    />
    <ApiItem
      name="toggleLock()"
      signature="void"
      description="Toggles the mobile UI lock."
      example={`player.toggleLock();`}
    />
    <ApiItem
      name="setFlip(direction)"
      signature="('horizontal' | 'vertical') => void"
      description="Flips the video output."
      example={`player.setFlip('horizontal');`}
    />
    <ApiItem
      name="setAspectRatio(ratio)"
      signature="(ratio: string) => void"
      description="Sets aspect ratio ('default', '16:9', '4:3')."
      example={`player.setAspectRatio('16:9');`}
    />
    <ApiItem
      name="setAppearance(opts)"
      signature="(opts: {theme?, themeColor?, iconSize?}) => void"
      description="Updates visual appearance at runtime."
      example={`player.setAppearance({\n  theme: 'pixel',\n  themeColor: '#ef4444'\n});`}
    />
    <ApiItem
      name="notify(opts)"
      signature="(opts: Notification) => string"
      description="Displays a toast notification."
      example={`player.notify({\n  type: 'info',\n  message: 'Hello World',\n  duration: 3000\n});`}
    />
    <ApiItem
      name="requestCast()"
      signature="void"
      description="Triggers Google Cast session."
      example={`player.requestCast();`}
    />
    <ApiItem
      name="destroy()"
      signature="void"
      description="Destroys player instance and cleans up resources."
      example={`player.destroy();`}
    />
  </div>
);

// --- Router Mapping ---

const NAVIGATION = [
  {
    category: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction", component: IntroPage },
      { id: "installation", label: "Installation", component: InstallationPage },
      { id: "usage-react", label: "Usage (React)", component: UsageReactPage },
      { id: "frameworks", label: "Other Frameworks", component: FrameworksPage },
    ]
  },
  {
    category: "Configuration",
    items: [
      { id: "options-general", label: "General Options", component: GeneralPropsPage },
      { id: "options-ui", label: "UI & Appearance", component: UiPropsPage },
    ]
  },
  {
    category: "Components",
    items: [
      { id: "component-controls", label: "Controls", component: ControlsPage },
      { id: "component-settings", label: "Settings", component: SettingsPage },
      { id: "component-contextmenu", label: "Context Menu", component: ContextMenuPage },
      { id: "component-layers", label: "Layers", component: LayersPage },
    ]
  },
  {
    category: "Plugins",
    items: [
      { id: "plugin-hls", label: "HLS Plugin", component: HlsPluginPage },
      { id: "plugin-dash", label: "DASH Plugin", component: DashPluginPage },
      { id: "plugin-mpegts", label: "MPEG-TS Plugin", component: MpegtsPluginPage },
      { id: "plugin-webtorrent", label: "WebTorrent Plugin", component: WebTorrentPluginPage },
    ]
  },
  {
    category: "API Reference",
    items: [
      { id: "api-methods", label: "Methods", component: InstanceMethodsPage },
      { id: "api-properties", label: "Properties", component: InstancePropertiesPage },
      { id: "api-events", label: "Events", component: InstanceEventsPage },
    ]
  }
];

export const Documentation = () => {
  const [match, params] = useRoute<{ section: string }>('/docs/:section');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Default to introduction if no section
  const activeId = params?.section || 'introduction';

  const ActiveComponent = useMemo(() => {
    for (const cat of NAVIGATION) {
      const found = cat.items.find(i => i.id === activeId);
      if (found) return found.component;
    }
    return IntroPage;
  }, [activeId]);

  const handleNav = (id: string) => {
    setLocation(`/docs/${id}`);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] max-w-7xl mx-auto relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-white/10 bg-zinc-950 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto hide-scrollbar z-30">
        <div className="p-6 space-y-8">
          {NAVIGATION.map((cat) => (
            <div key={cat.category}>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{cat.category}</h4>
              <ul className="space-y-1">
                {cat.items.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNav(item.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${activeId === item.id ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <div className={`fixed inset-0 z-[60] bg-zinc-950 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
          <span className="font-bold">Documentation</span>
          <button onClick={() => setMobileMenuOpen(false)}><ArrowLeftIcon className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-8 hide-scrollbar">
          {NAVIGATION.map((cat) => (
            <div key={cat.category}>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{cat.category}</h4>
              <ul className="space-y-1">
                {cat.items.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNav(item.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${activeId === item.id ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-xl hover:bg-indigo-500 transition-colors"
        onClick={() => setMobileMenuOpen(true)}
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 md:p-12 pb-32">
        <ActiveComponent />
      </main>
    </div>
  );
};
