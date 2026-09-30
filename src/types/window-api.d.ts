// Hydra window.api ambient declaration: Orca's preload bridge has no Hydra
// equivalent — the Tauri `invoke()` layer owns command dispatch. Declared
// optional/never so Orca-ported modules typecheck; runtime paths that probe
// window.api always resolve to "not a function" and degrade gracefully.
import type { RuntimeTarget } from '../runtime-placeholder'

declare global {
  interface Window {
    // Required in the type so ported Orca call sites typecheck. At runtime
    // under Tauri this bridge is absent; callers still have to tolerate that.
    api: {
      runtime: {
        call: (...args: any[]) => Promise<any>
        [key: string]: any
      }
      pty: {
        listSessions: (...args: any[]) => Promise<any>
        management?: any
        kill?: (...args: any[]) => Promise<any>
        [key: string]: any
      }
      ui: Record<string, any>
      [key: string]: any
    }
    /* Orca Electron namespace: referenced by ported modules; never present at
       runtime under Tauri — probes degrade to "not a function". */
    electron: any
  }
}

export {}
