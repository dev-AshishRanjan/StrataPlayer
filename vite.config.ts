
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Shared alias config to fix webtorrent/bittorrent-dht build issues
  const resolveConfig = {
    alias: {
      // We still need to shim bittorrent-dht to prevent build errors
      'bittorrent-dht': resolve(__dirname, 'utils/dht-shim.js'),
    }
  };

  const commonPlugins = [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true, // Allow import 'node:events', 'node:stream' etc.
    })
  ];

  // 1. Library Build (NPM Package)
  // Runs when `vite build --mode lib` is called
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
      resolve: resolveConfig,
      base: '/StrataPlayer/',
      define: {
        global: 'globalThis', // Fixes "global is not defined" in many node libs
      },
      build: {
        outDir: 'dist-site',
        emptyOutDir: true,
        commonjsOptions: {
          transformMixedEsModules: true, // Important for WebTorrent dependencies
        }
      }
    };
  }

  // 3. Local Development
  return {
    plugins: commonPlugins,
    resolve: resolveConfig,
    base: '/',
    define: {
      global: 'globalThis',
    }
  };
});
