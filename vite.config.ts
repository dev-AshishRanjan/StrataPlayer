import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
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
      plugins: [
        react(),
        nodePolyfills({
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        })
      ],
      base: '/StrataPlayer/',
      build: {
        outDir: 'dist-site',
        emptyOutDir: true,
      }
    };
  }

  // 3. Local Development
  return {
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      })
    ],
    base: '/',
    define: {
      // Sometimes required for older libraries that check strict global
      global: 'globalThis',
    }
  };
});