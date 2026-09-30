/**
 * Which chrome is on screen.
 * "orca" is the live face. "hydra" restores the sidebar colors, uppercase
 * Projects label, tinted repo icons, emerald drop line, and HYDRA wordmark
 * that were on screen before that swap. The window icon stays Hydra either way.
 */
export type ShellFace = "hydra" | "orca";

export const ACTIVE_SHELL_FACE: ShellFace = "orca";

export function applyShellFace(face: ShellFace = ACTIVE_SHELL_FACE): void {
  document.documentElement.dataset.shellFace = face;
}
