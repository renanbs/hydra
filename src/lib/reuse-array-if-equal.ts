// Orca `reuseArrayIfEqual`: derived lists are rebuilt on every keystroke, but a
// structurally identical list must keep its identity so memoized children and
// store subscriptions do not invalidate for free.
export function reuseArrayIfEqual<T>(
  previous: readonly T[] | null | undefined,
  next: readonly T[]
): T[] {
  if (!previous || previous.length !== next.length) {
    return [...next];
  }
  for (let index = 0; index < next.length; index += 1) {
    if (previous[index] !== next[index]) {
      return [...next];
    }
  }
  return previous as T[];
}
