import { createRosettaApi } from './generated/window-api.generated'

// The shim logs every call; the probe test reads it after mounting.
;(window as unknown as { api: unknown }).api = createRosettaApi()
;(window as unknown as { __rosettaLog: unknown[] }).__rosettaLog = []

if (!('ResizeObserver' in window)) {
  class StubResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = StubResizeObserver
}
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false
    }) as unknown as MediaQueryList
}
