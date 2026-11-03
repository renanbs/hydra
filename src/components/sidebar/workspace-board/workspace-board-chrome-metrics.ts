/**
 * The chrome the board's sheet reserves, in the same units Orca uses.
 *
 * Why constants at all when Hydra measures the sidebar: the measured geometry is
 * only available after the first layout effect, and a sheet that paints one frame
 * at `top: 0` overlaps the window titlebar. These are the initial values, and the
 * live measurement replaces them as soon as the sidebar reports its box.
 *
 * `WORKSPACE_TOP_CHROME_HEIGHT` is the titlebar (`h-9`, 36px) and
 * `STATUS_BAR_RESERVE_HEIGHT` is the status bar (`h-6` with a 24px minimum).
 */
export const WORKSPACE_TOP_CHROME_HEIGHT = 36
export const STATUS_BAR_RESERVE_HEIGHT = 24
