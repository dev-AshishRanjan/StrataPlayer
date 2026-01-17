
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Shared alias config
  const resolveConfig = {
    alias: {
      // CRITICAL: Webtorrent/streamx requires 'readable-stream' to function in browser.
      // We apply this globally so it works in Dev, Lib, and Demo modes.
      stream: 'readable-stream',
      'readable-stream': 'readable-stream',
      // Shim bittorrent-dht to prevent server-side node-only deps from breaking build
      'bittorrent-dht': resolve(__dirname, 'utils/dht-shim.js'),
    }
  };

  const commonPlugins = [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    })
  ];

  const commonOptimizeDeps = {
    include: [
      'webtorrent',
      'simple-peer',
      'readable-stream',
      'util',
      'events'
    ],
    exclude: ['streamx']
  };

  // 1. Library Build (NPM Package)
  if (mode === 'lib') {
    return {
      plugins: [
        react(),
        dts({
          insertTypesEntry: true,
          include: ['lib.ts', 'core', 'plugins', 'ui', 'utils'],
          rollupTypes: true
        })
      ],
      resolve: resolveConfig,
      publicDir: false,
      build: {
        outDir: 'dist',
        lib: {
          entry: {
            index: resolve(__dirname, 'lib.ts'),
            hls: resolve(__dirname, 'plugins/HlsPlugin.ts'),
            dash: resolve(__dirname, 'plugins/DashPlugin.ts'),
            mpegts: resolve(__dirname, 'plugins/MpegtsPlugin.ts'),
            webtorrent: resolve(__dirname, 'plugins/WebTorrentPlugin.ts')
          },
          formats: ['es', 'cjs'],
          fileName: (format, entryName) => {
            if (entryName === 'index') return `strataplayer.${format}.js`;
            return `${entryName}.${format}.js`;
          },
        },
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'hls.js',
            'dashjs',
            'mpegts.js',
            'webtorrent'
          ],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'hls.js': 'Hls',
              'dashjs': 'dashjs',
              'mpegts.js': 'mpegts',
              'webtorrent': 'WebTorrent'
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'style.css') return 'style.css';
              return assetInfo.name as string;
            },
          },
        },
        sourcemap: true,
        emptyOutDir: true,
      },
    };
  }

  // 2. Demo Site Build (GitHub Pages)
  if (mode === 'demo') {
    return {
      plugins: commonPlugins,
      resolve: {
        alias: {
          // Merge shared aliases with demo-specific overrides
          ...resolveConfig.alias,
          util: 'util',
          events: 'events',
          process: 'process/browser',
          buffer: 'buffer',
        },
        dedupe: ['stream', 'readable-stream', 'streamx'],
      },
      base: '/StrataPlayer/',
      define: {
        // Vital for some node modules that check global
        global: 'globalThis',
      },
      build: {
        outDir: 'dist-site',
        emptyOutDir: true,
        commonjsOptions: {
          // Ensure these CommonJS modules are transformed correctly
          include: [/webtorrent/, /streamx/, /readable-stream/, /simple-peer/, /node_modules/],
          transformMixedEsModules: true,
        },
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'hls.js', 'dashjs', 'mpegts.js']
            }
          }
        }
      },
      optimizeDeps: commonOptimizeDeps
    };
  }

  // 3. Local Development
  return {
    plugins: commonPlugins,
    resolve: resolveConfig,
    base: '/',
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: [
        'webtorrent',
        'simple-peer',
        'readable-stream',
        'util',
        'streamx',
        'events'
      ],
    },
  };
});
