// Spike entry: load Orca's real sidebar entry with a generated `window.api`
// shim, so the bundler tells us which of its 2.3k-module closure we can resolve.
import SidebarRoot from '@/components/sidebar'
import { createRosettaApi } from './generated/window-api.generated'

;(window as unknown as { api: unknown }).api = createRosettaApi()

export default SidebarRoot
