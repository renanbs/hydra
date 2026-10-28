import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

// Probe sink: the page reports its API ledger here, so the measurement does not
// depend on Tauri IPC (or on the window being visible).
function rosettaReportPlugin(): Plugin {
  return {
    name: 'rosetta-report',
    configureServer(server) {
      server.middlewares.use('/__rosetta-report', (req, res) => {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          for (const line of body.split('\n').filter(Boolean)) {
            console.log(`[rosetta-page] ${line}`)
          }
          res.statusCode = 204
          res.end()
        })
      })
    }
  }
}

const ORCA_RENDERER = '/home/renan/src/orca/src/renderer/src'
const ORCA_MODULES = '/home/renan/src/orca/node_modules'

// Standalone server for the rosetta page: the Orca renderer owns '@', and one
// React instance (Orca's, which its store already resolves) drives the tree.
export default defineConfig({
  configFile: false,
  root: path.resolve('.'),
  resolve: {
    alias: {
      '@': ORCA_RENDERER,
      '@renderer': ORCA_RENDERER,
      react: `${ORCA_MODULES}/react`,
      'react-dom': `${ORCA_MODULES}/react-dom`,
      'react-dom/client': `${ORCA_MODULES}/react-dom/client.js`,
      'react/jsx-runtime': `${ORCA_MODULES}/react/jsx-runtime.js`,
      'react/jsx-dev-runtime': `${ORCA_MODULES}/react/jsx-dev-runtime.js`,
      // CSS-only packages the Orca stylesheet imports; they live in Orca's tree.
      'tw-animate-css': `${ORCA_MODULES}/tw-animate-css`,
      katex: `${ORCA_MODULES}/katex`,
      // Orca pins lucide 0.577 (still ships brand icons); Hydra is on 1.x where
      // `Github` etc. were removed, so the Orca tree must keep its own copy.
      'lucide-react': `${ORCA_MODULES}/lucide-react`,
      '@xterm/headless': `${ORCA_MODULES}/@xterm/headless/lib-headless/xterm-headless.js`,
      '@xterm/addon-serialize': `${ORCA_MODULES}/@xterm/addon-serialize/lib/addon-serialize.js`
    },
    dedupe: ['react', 'react-dom']
  },
  // Separate optimizer cache: two Vite servers sharing node_modules/.vite
  // clobber each other's dep hashes (zustand_shallow 404).
  cacheDir: 'node_modules/.vite-rosetta',
  server: { port: 1421, strictPort: true, fs: { allow: ['.', '/home/renan/src/orca'] } },
  plugins: [react(), tailwindcss(), rosettaReportPlugin()]
})
