# StrataPlayer

<div align="center">
  <img src="https://dev-ashishranjan.github.io/StrataPlayer/logo.png" alt="StrataPlayer Logo" width="128" />
  
  <p align="center">
    <strong>The Universal Media Engine for the Modern Web.</strong>
  </p>
  
  <p align="center">
    <a href="https://github.com/dev-AshishRanjan/StrataPlayer/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    </a>
    <a href="https://www.npmjs.com/package/strataplayer">
      <img src="https://img.shields.io/npm/v/strataplayer" alt="NPM Version" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/typescript-5.0-blue" alt="TypeScript" />
    </a>
  </p>
</div>

## Introduction

StrataPlayer is a production-grade, framework-agnostic media engine designed for the modern web. It decouples playback logic from the UI, ensuring high-performance rendering even during rapid state updates.

Built on **React 19** and **TypeScript**, it features a modular plugin architecture that allows you to support only the formats you need—keeping your bundle size minimal while offering support for everything from HLS to BitTorrent streaming.

## ✨ Key Features

- **Universal Playback:** Support for **HLS**, **DASH**, **MPEG-TS/FLV**, and **WebTorrent** (P2P).
- **Framework Agnostic:** First-class React support, with easy mounting for Vue, Svelte, Angular, and Vanilla JS.
- **Robust Network Handling:** Automatic exponential backoff and retry logic for unstable connections.
- **Advanced Audio Engine:** Integrated Web Audio API nodes for volume boosting (up to 300%) and gain control.
- **Professional UI:**
  - **Themes:** 4 built-in distinct themes (Default, Pixel, Game, Hacker).
  - **Subtitles:** Comprehensive VTT/SRT support with user-customizable styling (size, color, sync, shadows).
  - **Picture-in-Picture** & **Google Cast** integration.
- **State Management:** Powered by `NanoStore` for isolated, high-performance state updates.

## 🚀 Installation

Install the core player:

```bash
npm install strataplayer
```

Install the specific engines you need as peer dependencies:

```bash
# For HLS (.m3u8)
npm install hls.js

# For DASH (.mpd)
npm install dashjs

# For MPEG-TS / FLV
npm install mpegts.js

# For WebTorrent (Magnet links)
npm install webtorrent
```

## 💻 Usage

### 1. Basic Usage (React)

For standard MP4/WebM files, no plugins are required.

```tsx
import { StrataPlayer } from "strataplayer";
import "strataplayer/style.css";

const App = () => {
  return (
    <StrataPlayer
      src="https://example.com/video.mp4"
      theme="default"
      themeColor="#6366f1"
    />
  );
};
```

### 2. Universal Player (All Formats)

To support all formats, import the plugins and pass them to the player.

```tsx
import { StrataPlayer } from "strataplayer";
import { HlsPlugin } from "strataplayer/hls";
import { DashPlugin } from "strataplayer/dash";
import { MpegtsPlugin } from "strataplayer/mpegts";
import { WebTorrentPlugin } from "strataplayer/webtorrent";
import "strataplayer/style.css";

// Initialize plugins once
const plugins = [
  new HlsPlugin(),
  new DashPlugin(),
  new MpegtsPlugin(),
  new WebTorrentPlugin(),
];

const App = () => {
  return (
    <StrataPlayer
      // Can be a magnet link, m3u8, mpd, or mp4
      src="magnet:?xt=urn:btih:..."
      plugins={plugins}
      theme="hacker"
      autoPlay={false}
    />
  );
};
```

### 3. Vanilla JS / Vue / Svelte

Use the `mountStrataPlayer` helper to render the player into any DOM node.

```javascript
import { mountStrataPlayer } from "strataplayer";
import { HlsPlugin } from "strataplayer/hls";
import "strataplayer/style.css";

const container = document.getElementById("player-root");

const player = mountStrataPlayer(container, {
  src: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  plugins: [new HlsPlugin()],
  theme: "game",
  themeColor: "#eab308",
});

// Update props later
// player.update({ theme: 'pixel' });

// Cleanup
// player.unmount();
```

## 📋 Component Props

The `<StrataPlayer />` component accepts the following props:

| Prop                   | Type                                         | Default     | Description                                                                                |
| :--------------------- | :------------------------------------------- | :---------- | :----------------------------------------------------------------------------------------- |
| **src**                | `string`                                     | `undefined` | The primary media URL.                                                                     |
| **sources**            | `PlayerSource[]`                             | `[]`        | Array of sources for quality fallback or alternative formats. Overrides `src` if provided. |
| **poster**             | `string`                                     | `undefined` | URL for the poster image shown before playback.                                            |
| **autoPlay**           | `boolean`                                    | `false`     | Whether to start playback automatically. Note: Browsers may block unmuted autoplay.        |
| **volume**             | `number`                                     | `1`         | Initial volume (0.0 to 1.0).                                                               |
| **muted**              | `boolean`                                    | `false`     | Initial mute state.                                                                        |
| **theme**              | `'default' \| 'pixel' \| 'game' \| 'hacker'` | `'default'` | The visual theme of the player.                                                            |
| **themeColor**         | `string`                                     | `'#6366f1'` | Primary accent color (Hex, RGB).                                                           |
| **iconSize**           | `'small' \| 'medium' \| 'large'`             | `'medium'`  | Size of the control icons.                                                                 |
| **thumbnails**         | `string`                                     | `undefined` | URL to a VTT file containing storyboard thumbnails for hover preview.                      |
| **textTracks**         | `TextTrackConfig[]`                          | `[]`        | Array of subtitle/caption tracks.                                                          |
| **plugins**            | `IPlugin[]`                                  | `[]`        | Array of initialized plugin instances (e.g., `new HlsPlugin()`).                           |
| **disablePersistence** | `boolean`                                    | `false`     | If `true`, prevents saving settings to LocalStorage.                                       |
| **audioGain**          | `number`                                     | `1`         | Initial audio boost level (e.g., `1.5` for 150%).                                          |
| **playbackRate**       | `number`                                     | `1`         | Initial playback speed.                                                                    |

### Data Structures

#### `PlayerSource`

```ts
{
  url: string;
  // Optional: 'hls' | 'dash' | 'mp4' | 'webm' | 'mpegts' | 'webtorrent'
  // If omitted, the player attempts to detect it from the extension.
  type?: string;
  name?: string; // Label for source selector
}
```

#### `TextTrackConfig`

```ts
{
  kind: 'subtitles' | 'captions';
  label: string;  // e.g. "English"
  src: string;    // URL to .vtt file
  srcLang: string; // e.g. "en"
  default?: boolean;
}
```

## 🧩 Plugin System

StrataPlayer uses a modular system. You only pay the bundle size cost for the formats you use.

| Plugin               | Import Path               | Dependency   | Description                          |
| :------------------- | :------------------------ | :----------- | :----------------------------------- |
| **HlsPlugin**        | `strataplayer/hls`        | `hls.js`     | Adaptive HTTP Live Streaming (.m3u8) |
| **DashPlugin**       | `strataplayer/dash`       | `dashjs`     | MPEG-DASH Streaming (.mpd)           |
| **MpegtsPlugin**     | `strataplayer/mpegts`     | `mpegts.js`  | MPEG-TS and FLV live streams         |
| **WebTorrentPlugin** | `strataplayer/webtorrent` | `webtorrent` | P2P streaming via WebRTC             |

## ⚙️ Configuration

### Sources & Tracks

Support multiple sources for quality fallback and detailed subtitle configuration.

```tsx
<StrataPlayer
  sources={[
    { name: "HLS Master", url: "master.m3u8", type: "hls" },
    { name: "Fallback MP4", url: "fallback.mp4", type: "mp4" },
  ]}
  poster="https://example.com/poster.jpg"
  thumbnails="https://example.com/storyboard.vtt" // for hover previews
  textTracks={[
    {
      kind: "subtitles",
      label: "English",
      src: "/subs/en.vtt",
      srcLang: "en",
      default: true,
    },
  ]}
/>
```

### UI & Themes

The player includes 4 professionally designed themes.

| Theme     | Description                                                   |
| :-------- | :------------------------------------------------------------ |
| `default` | Clean, modern aesthetic using Inter font.                     |
| `pixel`   | Retro 8-bit style with sharp edges and "Press Start 2P" font. |
| `game`    | Cinematic RPG style with serif typography and gold accents.   |
| `hacker`  | Terminal-inspired look with scanlines and monospaced fonts.   |

Customize further with:

```tsx
<StrataPlayer
  theme="game"
  themeColor="#10b981" // Custom accent color
  iconSize="medium" // 'small' | 'medium' | 'large'
/>
```

## ⌨️ Keyboard Shortcuts

| Key           | Action            |
| ------------- | ----------------- |
| `Space` / `K` | Play / Pause      |
| `F`           | Toggle Fullscreen |
| `M`           | Toggle Mute       |
| `Arrow Right` | Seek Forward 5s   |
| `Arrow Left`  | Seek Backward 5s  |
| `Arrow Up`    | Increase Volume   |
| `Arrow Down`  | Decrease Volume   |

## 🛠️ Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/dev-AshishRanjan">Ashish Ranjan</a>
</div>
