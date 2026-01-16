# StrataPlayer

<div align="center">
  <img src="https://dev-ashishranjan.github.io/StrataPlayer/logo.png" alt="StrataPlayer Logo" width="128" />
  
  <p align="center">
    <strong>A robust, secure, and production-grade video player built for the modern web.</strong>
  </p>
  
  <p align="center">
    <a href="https://github.com/dev-AshishRanjan/StrataPlayer/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    </a>
    <a href="https://react.dev">
      <img src="https://img.shields.io/badge/react-19.0-blue" alt="React" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/typescript-5.0-blue" alt="TypeScript" />
    </a>
  </p>
</div>

## Overview

StrataPlayer is a highly customizable, high-performance HTML5 video player designed for React applications. It features a lightweight core with a plugin architecture, advanced subtitle management, robust error handling, and a sleek, themeable UI powered by Tailwind CSS.

It supports HLS (HTTP Live Streaming) out of the box via `hls.js`, along with standard MP4/WebM formats, making it suitable for VOD, live streaming, and complex media applications.

## ✨ Features

### Core Playback

- **Multi-Format Support:** Seamlessly plays HLS (`.m3u8`), MP4, WebM, and DASH (via plugin extension).
- **Robust Error Handling:** Exponential backoff retry logic for network failures and stream interruptions.
- **Adaptive Bitrate:** Automatic quality switching with manual override controls.
- **Audio Engine:** Built-in Web Audio API integration for **Audio Boost** (up to 300% volume).

### User Interface & Experience

- **Fully Themeable:** Includes 4 built-in themes (Default, Pixel, Game, Hacker) and custom accent color support.
- **Responsive Controls:** Mobile-friendly touch controls and gesture support (double tap to seek).
- **Keyboard Shortcuts:** Full accessibility support with standard hotkeys (`Space`, `F`, `M`, Arrows).
- **Picture-in-Picture:** Native PiP support for multitasking.
- **Chromecast Support:** Built-in Google Cast integration.

### Advanced Subtitles

- **Custom Rendering:** High-performance canvas/DOM-based subtitle rendering.
- **Full Customization:** Users can adjust font size, color, background opacity, blur, and offsets.
- **Synchronization:** Manual subtitle offset adjustment to fix out-of-sync captions.
- **Local Upload:** Support for drag-and-drop `.vtt` and `.srt` files.

### Developer Experience

- **React 19 Ready:** Built with the latest React patterns (Hooks, `useSyncExternalStore`).
- **State Management:** Lightweight, external store (`NanoStore`) for high-performance updates without re-renders.
- **Plugin System:** Easily extend functionality without bloating the core.
- **TypeScript:** 100% type-safe.

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/dev-AshishRanjan/StrataPlayer.git

# Navigate to project directory
cd StrataPlayer

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Basic Usage

```tsx
import { StrataPlayer } from "./ui/StrataPlayer";

const App = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <StrataPlayer
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        autoPlay={false}
        theme="default"
        themeColor="#6366f1"
      />
    </div>
  );
};
```

### Advanced Usage (Sources & Tracks)

```tsx
<StrataPlayer
  sources={[
    { name: "HLS Master", url: "https://example.com/master.m3u8", type: "hls" },
    { name: "MP4 Fallback", url: "https://example.com/video.mp4", type: "mp4" },
  ]}
  poster="https://example.com/poster.jpg"
  thumbnails="https://example.com/thumbnails.vtt"
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

StrataPlayer comes with preset themes that can be applied via props or changed at runtime by the user:

- **Default:** Modern, clean, and professional (Inter font).
- **Pixel:** Retro gaming aesthetic (Press Start 2P font).
- **Game:** Cinematic RPG style (Cinzel font).
- **Hacker:** Terminal/Cyberpunk aesthetic (JetBrains Mono font).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

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
