// Local-origin host for the rosetta page. The Orca renderer runs in an iframe on
// its own Vite origin (one React instance, '@' → Orca), while every `window.api`
// call is proxied here, where Tauri IPC is allowed. Bindings live only in this
// frame; anything unbound is logged as ORPHAN and resolves undefined.
import { createHydraBindings } from './bindings'

type RpcRequest = { kind: 'rpc'; id: number; path: string; args: unknown[] }

const bindings = createHydraBindings()

function reportLine(line: string): void {
  void fetch('http://localhost:1421/__rosetta-report', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'content-type': 'text/plain' },
    body: line
  }).catch(() => {})
}

reportLine('HOST start')
const iframe = document.createElement('iframe')
iframe.src = 'http://localhost:1421/spike/rosetta-webview/'
iframe.onload = () => reportLine('HOST iframe load')
iframe.onerror = () => reportLine('HOST iframe error')
document.body.appendChild(iframe)
if (window.__TAURI_INTERNALS__) reportLine('HOST tauri-internals present')
else reportLine('HOST tauri-internals MISSING')

const orphans = new Map<string, number>()

function report(): void {
  const entries = [...orphans.entries()].map(([path, count]) => `ORPHAN ${path} x${count}`)
  if (entries.length === 0) return
  orphans.clear()
  for (const entry of entries) console.log(`[rosetta-host] ${entry}`)
  // Ship the report to the child server's sink (no-cors: fire-and-forget POST).
  void fetch('http://localhost:1421/__rosetta-report', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'content-type': 'text/plain' },
    body: entries.map((entry) => `HOST ${entry}`).join('\n')
  }).catch(() => {})
}

window.setInterval(report, 800)

window.addEventListener('message', (event: MessageEvent<RpcRequest>) => {
  const data = event.data
  if (!data || data.kind !== 'rpc') return
  const binding = bindings[data.path]
  const reply = (payload: unknown, error?: string): void => {
    iframe.contentWindow?.postMessage({ kind: 'rpc-result', id: data.id, payload, error }, '*')
  }
  if (!binding) {
    orphans.set(data.path, (orphans.get(data.path) ?? 0) + 1)
    reply(undefined)
    return
  }
  try {
    Promise.resolve(binding(...data.args))
      .then((payload) => reply(payload))
      .catch((error) => reply(undefined, String(error)))
  } catch (error) {
    reply(undefined, String(error))
  }
})
