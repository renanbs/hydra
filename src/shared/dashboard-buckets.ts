// Shared Agent Dashboard vocabulary for the sidebar entry, the in-window drawer and
// the pop-out window. Kept free of React so both surfaces and the IPC payload agree
// on the same four buckets.

export const DASHBOARD_BUCKET_ORDER = ['attention', 'working', 'done', 'idle'] as const

export type DashboardBucket = (typeof DASHBOARD_BUCKET_ORDER)[number]

export type DashboardBucketCounts = Record<DashboardBucket, number>

export const EMPTY_DASHBOARD_BUCKET_COUNTS: DashboardBucketCounts = Object.freeze({
  attention: 0,
  working: 0,
  done: 0,
  idle: 0,
})

export function dashboardBucketCountsEqual(
  a: DashboardBucketCounts,
  b: DashboardBucketCounts
): boolean {
  return (
    a.attention === b.attention &&
    a.working === b.working &&
    a.done === b.done &&
    a.idle === b.idle
  )
}
