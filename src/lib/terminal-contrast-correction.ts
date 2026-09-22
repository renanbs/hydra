import { isTerminalBackgroundLight } from "./terminal-title-contrast"
import { normalizeTerminalMinimumContrastRatio } from "../shared/terminal-minimum-contrast-settings"

export {
  MAX_TERMINAL_CONTRAST_RATIO,
  MIN_TERMINAL_CONTRAST_RATIO,
  normalizeTerminalMinimumContrastRatio
} from "../shared/terminal-minimum-contrast-settings"

export const LIGHT_BG_MIN_CONTRAST = 4.5
export const DARK_BG_MIN_CONTRAST = 3

export function resolveTerminalMinimumContrastRatio(
  background: string | undefined,
  appSurface: 'dark' | 'light',
  override?: number
): number {
  const configured = normalizeTerminalMinimumContrastRatio(override)
  if (configured !== undefined) return configured
  return isTerminalBackgroundLight(background, { appSurface }) ? LIGHT_BG_MIN_CONTRAST : DARK_BG_MIN_CONTRAST
}
