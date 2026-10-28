// Bootstrapper: reports module-level failures from the real page entry.
void import('./app').catch((error) => {
  void fetch('/__rosetta-report', {
    method: 'POST',
    body: `CHILD import failed ${String(error)}`
  }).catch(() => {})
})
