import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ORCA_RENDERER = '/home/renan/src/orca/src/renderer/src'

export default defineConfig({
  configFile: false,
  root: process.cwd(),
  resolve: {
    alias: {
      '@': ORCA_RENDERER,
      '@renderer': ORCA_RENDERER,
      '@xterm/headless': '/home/renan/src/orca/node_modules/@xterm/headless/lib-headless/xterm-headless.js',
      '@xterm/addon-serialize': '/home/renan/src/orca/node_modules/@xterm/addon-serialize/lib/addon-serialize.js'
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    __ORCA_BUILD_IDENTITY__: '"rosetta-spike"'
  },
  server: { fs: { allow: ['.', '/home/renan/src/orca'] } },
  plugins: [react()],
  build: {
    outDir: 'spike/rosetta/dist',
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    rollupOptions: { input: path.resolve('spike/rosetta/sidebar-probe.tsx') }
  }
})
