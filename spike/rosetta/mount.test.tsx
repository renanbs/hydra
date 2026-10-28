// Spike: mount Orca's real sidebar against the generated window.api shim and
// report what it asks the boundary for before it paints.
import { describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import SidebarRoot from '@/components/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmationDialogProvider } from '@/components/confirmation-dialog'
import { LinkRoutingPreferenceDialogProvider } from '@/components/link-routing-preference-dialog'

type Call = { path: string; args: unknown[]; at: number }

function calls(): Call[] {
  return ((window as unknown as { __rosettaLog?: Call[] }).__rosettaLog ?? []) as Call[]
}

describe('rosetta spike: Orca SidebarRoot on the Hydra boundary', () => {
  it('mounts and records the API surface it needs', async () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    root.render(
      <TooltipProvider delayDuration={400}>
        <ConfirmationDialogProvider>
          <LinkRoutingPreferenceDialogProvider>
            <SidebarRoot />
          </LinkRoutingPreferenceDialogProvider>
        </ConfirmationDialogProvider>
      </TooltipProvider>
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    spy.mockRestore()

    const log = calls()
    const distinct = [...new Set(log.map((call) => call.path))].sort()
    console.log('rosetta: mounted nodes =', container.querySelectorAll('*').length)
    console.log('rosetta: distinct api calls =', distinct.length)
    console.log('rosetta: calls =', JSON.stringify(distinct))
    console.log('rosetta: console errors =', errors.length)
    if (errors.length > 0) {
      console.log('rosetta: first errors =', JSON.stringify(errors.slice(0, 3)).slice(0, 1200))
    }
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })
})
