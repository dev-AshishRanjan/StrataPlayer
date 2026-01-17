# StrataPlayer

<div align="center">
  <img src="https://dev-ashishranjan.github.io/StrataPlayer/logo.png" alt="StrataPlayer Logo" width="128" />
  
  <p align="center">
    <strong>A Universal Media Engine for the Web.</strong>
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

StrataPlayer is a framework-agnostic media engine designed for web applications. It decouples playback logic from the UI, ensuring consistent performance during state updates.

Built on **React 19** and **TypeScript**, it features a modular plugin architecture to support various streaming formats while keeping the core bundle size minimal.

## Key Features

- **Universal Playback:** Support for **HLS**, **DASH**, **MPEG-TS/FLV**, and **WebTorrent** (P2P).
- **Framework Agnostic:** First-class React support with mounting helpers for Vue, Svelte, Angular, and Vanilla JS.
- **Network Handling:** Automatic exponential backoff and retry logic.
- **Audio Engine:** Integrated Web Audio API nodes for gain control and volume boosting.
- **UI System:**
  - 4 built-in themes (Default, Pixel, Game, Hacker).
  - VTT/SRT subtitle support with user customization.
  - Picture-in-Picture & Google Cast integration.
- **State Management:** Powered by `NanoStore` for isolated state updates.

## Installation

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

## Usage

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

## Component Props & Options

The `<StrataPlayer />` component accepts the following configuration options.

### Source & Playback

| Prop             | Type                | Default | Description                                                   |
| :--------------- | :------------------ | :------ | :------------------------------------------------------------ |
| **src**          | `string`            | -       | The primary media URL.                                        |
| **sources**      | `PlayerSource[]`    | `[]`    | Array of sources for quality fallback or alternative formats. |
| **poster**       | `string`            | -       | URL for the poster image.                                     |
| **thumbnails**   | `string`            | -       | URL to a VTT file for hover previews.                         |
| **textTracks**   | `TextTrackConfig[]` | `[]`    | Array of subtitle/caption tracks.                             |
| **plugins**      | `IPlugin[]`         | `[]`    | Array of initialized plugin instances.                        |
| **autoPlay**     | `boolean`           | `false` | Start playback automatically.                                 |
| **loop**         | `boolean`           | `false` | Loop playback.                                                |
| **volume**       | `number`            | `1`     | Initial volume (0.0 to 1.0).                                  |
| **muted**        | `boolean`           | `false` | Initial mute state.                                           |
| **audioGain**    | `number`            | `1`     | Audio boost level (e.g., `1.5` for 150%).                     |
| **playbackRate** | `number`            | `1`     | Initial playback speed.                                       |
| **isLive**       | `boolean`           | `false` | Enable live stream UI mode.                                   |

### UI & Appearance

| Prop           | Type          | Default     | Description                                      |
| :------------- | :------------ | :---------- | :----------------------------------------------- |
| **theme**      | `string`      | `'default'` | `'default'`, `'pixel'`, `'game'`, or `'hacker'`. |
| **themeColor** | `string`      | `'#6366f1'` | Primary accent color (Hex, RGB).                 |
| **iconSize**   | `string`      | `'medium'`  | `'small'`, `'medium'`, or `'large'`.             |
| **backdrop**   | `boolean`     | `true`      | Enable background blur effects in menus.         |
| **autoSize**   | `boolean`     | `false`     | Toggles `object-fit: cover`.                     |
| **highlight**  | `Highlight[]` | `[]`        | Markers to display on the timeline.              |

### Functionality & Controls

| Prop                   | Type      | Default | Description                               |
| :--------------------- | :-------- | :------ | :---------------------------------------- |
| **hotKey**             | `boolean` | `true`  | Enable keyboard shortcuts.                |
| **screenshot**         | `boolean` | `false` | Show screenshot button.                   |
| **pip**                | `boolean` | `true`  | Show Picture-in-Picture button.           |
| **setting**            | `boolean` | `true`  | Show Settings menu.                       |
| **fullscreen**         | `boolean` | `true`  | Show Fullscreen button.                   |
| **fullscreenWeb**      | `boolean` | `false` | Show Web Fullscreen button.               |
| **flip**               | `boolean` | `true`  | Enable image flip controls in settings.   |
| **aspectRatio**        | `boolean` | `true`  | Enable aspect ratio controls in settings. |
| **lock**               | `boolean` | `false` | Show mobile lock button.                  |
| **fastForward**        | `boolean` | `true`  | Enable long-press to 2x speed.            |
| **autoOrientation**    | `boolean` | `false` | Lock landscape on mobile fullscreen.      |
| **disablePersistence** | `boolean` | `false` | Prevent saving settings to LocalStorage.  |

### Advanced Customization

> Detailed documentation for configuring layers, controls, context menus, and custom settings is available in the full documentation.

| Prop            | Type                | Description                            |
| :-------------- | :------------------ | :------------------------------------- |
| **controls**    | `ControlItem[]`     | Custom control bar items.              |
| **layers**      | `LayerConfig[]`     | Custom UI layers overlaying the video. |
| **contextmenu** | `ContextMenuItem[]` | Custom right-click menu items.         |
| **settings**    | `SettingItem[]`     | Custom menu entries.                   |

## Plugin System

StrataPlayer uses a modular system. You only pay the bundle size cost for the formats you use.

| Plugin               | Import Path               | Dependency   | Description                          |
| :------------------- | :------------------------ | :----------- | :----------------------------------- |
| **HlsPlugin**        | `strataplayer/hls`        | `hls.js`     | Adaptive HTTP Live Streaming (.m3u8) |
| **DashPlugin**       | `strataplayer/dash`       | `dashjs`     | MPEG-DASH Streaming (.mpd)           |
| **MpegtsPlugin**     | `strataplayer/mpegts`     | `mpegts.js`  | MPEG-TS and FLV live streams         |
| **WebTorrentPlugin** | `strataplayer/webtorrent` | `webtorrent` | P2P streaming via WebRTC             |

## Keyboard Shortcuts

| Key           | Action            |
| ------------- | ----------------- |
| `Space` / `K` | Play / Pause      |
| `F`           | Toggle Fullscreen |
| `M`           | Toggle Mute       |
| `Arrow Right` | Seek Forward 5s   |
| `Arrow Left`  | Seek Backward 5s  |
| `Arrow Up`    | Increase Volume   |
| `Arrow Down`  | Decrease Volume   |

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/dev-AshishRanjan">Ashish Ranjan</a>
</div>
