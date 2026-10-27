import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const ORCA_RENDERER = '/home/renan/src/orca/src/renderer/src'

export default defineConfig({
  resolve: {
    alias: {
      '@': ORCA_RENDERER,
      '@renderer': ORCA_RENDERER,
      '@xterm/headless': '/home/renan/src/orca/node_modules/@xterm/headless/lib-headless/xterm-headless.js',
      '@xterm/addon-serialize': '/home/renan/src/orca/node_modules/@xterm/addon-serialize/lib/addon-serialize.js',
      react: '/home/renan/src/orca/node_modules/react',
      'react-dom': '/home/renan/src/orca/node_modules/react-dom',
      'react-dom/client': '/home/renan/src/orca/node_modules/react-dom/client.js',
      'react/jsx-runtime': '/home/renan/src/orca/node_modules/react/jsx-runtime.js',
      'react/jsx-dev-runtime': '/home/renan/src/orca/node_modules/react/jsx-dev-runtime.js'
    },
    dedupe: ['react', 'react-dom']
  },
  plugins: [react()],
  server: { fs: { allow: ['.', '/home/renan/src/orca'] } },
  test: {
    environment: 'jsdom',
    include: ['spike/rosetta/*.test.tsx'],
    setupFiles: ['spike/rosetta/setup.ts'],
    testTimeout: 20000
  }
})
