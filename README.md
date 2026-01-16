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

StrataPlayer represents a shift in how media playback is handled on the web. Instead of tightly coupling playback logic to a specific framework, StrataPlayer operates as a **framework-agnostic engine**.

While the UI layer is powered by the high-performance concurrent rendering of React 19, the player itself can be mounted into **any** application—be it Vanilla JS, Vue, Svelte, or Angular. It decouples the "playback state" (time, buffer, quality) from the "view layer," ensuring that high-frequency updates (like progress bars) never cause performance bottlenecks in your host application.

## Core Philosophy

1.  **Universal Compatibility:** Write once, run anywhere. Whether you are building a static HTML site or a complex Next.js application, the implementation remains consistent.
2.  **State Isolation:** The playback engine runs on a detached state store (`NanoStore`). This allows the player to handle micro-updates (video time, download progress) internally without triggering re-renders in your parent application.
3.  **Opt-in Complexity:** The core is lightweight. Advanced capabilities like HLS/DASH adaptive streaming, analytics, or casting are treated as plugins, keeping your bundle size strictly minimal unless needed.

## ✨ Features

### Engine & Performance

- **Framework Agnostic:** First-class support for React, with a mounting API for Vue, Svelte, and Vanilla JS.
- **Resilient Network Handling:** Automatic exponential backoff and retry logic for unstable connections.
- **Adaptive Streaming:** Native support for HLS (`.m3u8`) and DASH via plugin architecture.
- **Audio Boost Engine:** Integrated Web Audio API nodes allowing volume boosting up to 300%.

### Visuals & Interface

- **Themeable System:** 4 built-in distinct themes (Default, Pixel, Game, Hacker) with CSS variable support.
- **Advanced Subtitles:** DOM-based rendering supporting custom positioning, shadows, and runtime sync adjustment.
- **Mobile Optimized:** Touch gestures for seeking (double-tap), scrubbing, and volume control.
- **Google Cast:** Native Chromecast integration.

## 🚀 Installation

```bash
npm install strataplayer
```

## 💻 Usage

### React

```tsx
import { StrataPlayer } from "strataplayer";
import "strataplayer/style.css";

const App = () => {
  return (
    <div className="player-wrapper">
      <StrataPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        theme="default"
        themeColor="#6366f1"
      />
    </div>
  );
};
```

### Vanilla JS / Vue / Svelte / Angular

For non-React frameworks, use the `mountStrataPlayer` helper. This mounts the player into a specific DOM node and returns an instance for cleanup and updates.

**index.html**

```html
<div id="player-container" style="width: 100%; aspect-ratio: 16/9;"></div>
```

**main.js**

```javascript
import { mountStrataPlayer } from "strataplayer";
import "strataplayer/style.css";

const container = document.getElementById("player-container");

const instance = mountStrataPlayer(container, {
  src: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  autoPlay: false,
  theme: "hacker",
  themeColor: "#22c55e",
  sources: [
    { name: "HLS Stream", url: "...", type: "hls" },
    { name: "MP4 Fallback", url: "...", type: "mp4" },
  ],
});

// To update props later (e.g., change video):
// instance.update({ src: 'new-video.mp4' });

// To destroy/cleanup (e.g., in Vue onUnmounted):
// instance.unmount();
```

## ⚙️ Advanced Configuration

### Sources & Tracks

StrataPlayer supports complex source arrays and subtitle tracks.

```javascript
const props = {
  sources: [
    { name: "1080p HLS", url: "master.m3u8", type: "hls" },
    { name: "720p MP4", url: "fallback.mp4", type: "mp4" },
  ],
  poster: "https://example.com/poster.jpg",
  thumbnails: "https://example.com/storyboard.vtt", // For seek preview
  textTracks: [
    {
      kind: "subtitles",
      label: "English",
      src: "/subs/en.vtt",
      srcLang: "en",
      default: true,
    },
  ],
};
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

## 🎨 Themes

StrataPlayer separates layout from aesthetics. Themes can be switched instantly at runtime via props:

- **Default:** Professional, clean lines using Inter font.
- **Pixel:** Retro-gaming aesthetic with sharp edges and 8-bit fonts.
- **Game:** Cinematic RPG style with serif typography and gold accents.
- **Hacker:** Terminal-inspired aesthetic with scanlines and monospaced fonts.

## 🤝 Contributing

We welcome contributions that align with our philosophy of performance and modularity.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/dev-AshishRanjan">Ashish Ranjan</a>
</div>
