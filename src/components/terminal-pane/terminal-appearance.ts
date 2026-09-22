import type { ITheme } from '@xterm/xterm'
import type { HydraSettings } from '../../shared/settings-types'
import { HEX_COLOR_RE } from '../../shared/color-validation'

export function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.replace('#', '')
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

export function composeActiveTerminalTheme(
  baseTheme: ITheme | null,
  settings: Pick<HydraSettings, 'terminal_color_overrides' | 'terminal_background_opacity' | 'terminal_cursor_opacity'>
): ITheme | null {
  if (!baseTheme) return null
  let theme: ITheme = {
    overviewRulerBorder: 'transparent',
    scrollbarSliderBackground: 'rgba(180, 180, 185, 0.4)',
    scrollbarSliderHoverBackground: 'rgba(180, 180, 185, 0.6)',
    scrollbarSliderActiveBackground: 'rgba(180, 180, 185, 0.8)',
    ...baseTheme
  }
  if (settings.terminal_color_overrides) {
    theme = { ...theme, ...settings.terminal_color_overrides }
  }
  if (settings.terminal_background_opacity !== undefined && theme.background) {
    theme = { ...theme, background: hexToRgba(theme.background, settings.terminal_background_opacity) }
  }
  if (settings.terminal_cursor_opacity !== undefined && theme.cursor && isHexColor(theme.cursor)) {
    theme = { ...theme, cursor: hexToRgba(theme.cursor, settings.terminal_cursor_opacity) }
  }
  return theme
}
