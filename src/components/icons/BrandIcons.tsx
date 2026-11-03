// Brand marks are no longer part of lucide-react; these two tiny monochrome
// glyphs keep the provider row visually consistent with the other icons.
export function GithubIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.18c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.68.42.36.79 1.08.79 2.18v3.23c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function GitlabIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="m23.6 9.59-.03-.09-3.27-8.53a.85.85 0 0 0-.34-.4.88.88 0 0 0-1 .05.88.88 0 0 0-.3.45l-2.2 6.75H8.54L6.34 1.07a.86.86 0 0 0-.3-.45.88.88 0 0 0-1-.05.87.87 0 0 0-.33.4L1.44 9.5l-.03.09a6.08 6.08 0 0 0 2.02 7.03l.01.01.03.02 4.99 3.74 2.47 1.87 1.5 1.14a1.02 1.02 0 0 0 1.23 0l1.5-1.14 2.47-1.87 5.03-3.76.01-.01a6.08 6.08 0 0 0 2.02-7.03Z" />
    </svg>
  )
}
