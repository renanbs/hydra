export const MIN_TERMINAL_CONTRAST_RATIO = 1
export const MAX_TERMINAL_CONTRAST_RATIO = 21

export function normalizeTerminalMinimumContrastRatio(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return Math.min(MAX_TERMINAL_CONTRAST_RATIO, Math.max(MIN_TERMINAL_CONTRAST_RATIO, value))
}
