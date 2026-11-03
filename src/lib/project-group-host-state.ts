// Host-qualified project-group state (D03a-021 / D03a-082 / D03a-087).
//
// The App owns the sidebar's project groups inside the single `ui.sidebar`
// sidebar_prefs blob. Groups belong to the execution host that owns their rows,
// so the state is bucketed by `ExecutionHostId`: a mutation addressed at one host
// can never touch another host's bucket, even when both buckets hold the same
// group id (the ids are minted per host, so collisions are synthetic but the
// isolation still has to hold).
//
// Persistence is backward compatible: blobs written before this module carried
// flat `projectGroups` / `projectGroupMap` fields, which load as the local host's
// bucket. New blobs carry `projectGroupsByHost` / `projectGroupMapByHost`; the
// flat fields are only read when the bucketed local collection is absent.
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  normalizeExecutionHostId,
  type ExecutionHostId
} from '../shared/execution-host'
import type { Repo } from '../shared/repo-types'

type RepoExecutionHostOwner = Pick<Repo, 'connectionId' | 'executionHostId'>

/** One persisted group record: the App-side projection of the sidebar group. */
export type ProjectGroupPrefEntry = {
  id: string
  name: string
  tabOrder?: number
}

export type ProjectGroupsByHost = Record<string, ProjectGroupPrefEntry[]>
export type ProjectGroupMapByHost = Record<string, Record<string, string>>

export type ProjectGroupHostState = {
  groupsByHost: ProjectGroupsByHost
  membershipsByHost: ProjectGroupMapByHost
}

export const EMPTY_PROJECT_GROUP_HOST_STATE: ProjectGroupHostState = Object.freeze({
  groupsByHost: {},
  membershipsByHost: {}
}) as ProjectGroupHostState

export type ProjectGroupHostFailure =
  | 'invalid-host'
  | 'unknown-host'
  | 'unknown-group'
  | 'invalid-payload'

export type ProjectGroupHostResolution =
  | { ok: true; hostId: ExecutionHostId }
  | { ok: false; reason: 'invalid-host' | 'unknown-host' }

export type ProjectGroupWriteResult =
  | { ok: true; state: ProjectGroupHostState }
  | { ok: false; reason: ProjectGroupHostFailure }

export type ProjectGroupCreateResult =
  | { ok: true; state: ProjectGroupHostState; group: ProjectGroupPrefEntry }
  | { ok: false; reason: ProjectGroupHostFailure }

export type ProjectGroupDeleteResult =
  | { ok: true; state: ProjectGroupHostState; deleted: boolean }
  | { ok: false; reason: ProjectGroupHostFailure }

export type ProjectGroupHostSource = {
  /** Legacy flat group collection (pre-host-bucket blobs); treated as local. */
  projectGroups?: unknown
  /** Legacy flat project → group map; treated as local. */
  projectGroupMap?: unknown
  projectGroupsByHost?: unknown
  projectGroupMapByHost?: unknown
}

export type FlatProjectGroupEntry = ProjectGroupPrefEntry & { hostId: ExecutionHostId }

export type ProjectGroupCatalogEntry = {
  id: string
  name: string
  tabOrder?: number
  /** Owner host stamp; unqualified rows belong to the local host. */
  hostId?: string | null
}

export type ProjectGroupCatalog = {
  groups: readonly ProjectGroupCatalogEntry[]
  memberships?: Readonly<Record<string, string>>
  defaultHostId?: string | null
}

function normalizeEntry(value: unknown): ProjectGroupPrefEntry | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  // Persisted boundary: each field is checked before it enters the named type.
  const candidate = value as { id?: unknown; name?: unknown; tabOrder?: unknown }
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
  const name = typeof candidate.name === 'string' ? candidate.name : ''
  if (!id || !name.trim()) {
    return null
  }
  const tabOrder =
    typeof candidate.tabOrder === 'number' && Number.isFinite(candidate.tabOrder)
      ? candidate.tabOrder
      : undefined
  return tabOrder === undefined ? { id, name } : { id, name, tabOrder }
}

function normalizeEntries(value: unknown): ProjectGroupPrefEntry[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const entries: ProjectGroupPrefEntry[] = []
  const seen = new Set<string>()
  for (const candidate of value) {
    const entry = normalizeEntry(candidate)
    if (!entry || seen.has(entry.id)) {
      continue
    }
    seen.add(entry.id)
    entries.push(entry)
  }
  return entries
}

/** Sanitizes the legacy flat group collection; `undefined` when it is not an array. */
export function sanitizeLegacyProjectGroups(value: unknown): ProjectGroupPrefEntry[] | undefined {
  return normalizeEntries(value) ?? undefined
}

/** Sanitizes the legacy flat project → group map; `undefined` when not an object. */
export function sanitizeLegacyProjectGroupMap(
  value: unknown
): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  const out: Record<string, string> = {}
  for (const [projectId, groupId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof groupId === 'string' && projectId) {
      out[projectId] = groupId
    }
  }
  return out
}

/**
 * Sanitizes a host → groups record. Unknown host keys are dropped: they cannot
 * be addressed by a renderer mutation and must never fold into the local bucket.
 */
export function sanitizeProjectGroupsByHost(value: unknown): ProjectGroupsByHost | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  const out: ProjectGroupsByHost = {}
  for (const [rawHostId, rawEntries] of Object.entries(value as Record<string, unknown>)) {
    const hostId = normalizeExecutionHostId(rawHostId)
    if (!hostId) {
      continue
    }
    const entries = normalizeEntries(rawEntries)
    if (entries) {
      out[hostId] = entries
    }
  }
  return out
}

/** Sanitizes a host → (project → group) record; unknown host keys are dropped. */
export function sanitizeProjectGroupMapByHost(
  value: unknown
): ProjectGroupMapByHost | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  const out: ProjectGroupMapByHost = {}
  for (const [rawHostId, rawMap] of Object.entries(value as Record<string, unknown>)) {
    const hostId = normalizeExecutionHostId(rawHostId)
    if (!hostId) {
      continue
    }
    const memberships = sanitizeLegacyProjectGroupMap(rawMap)
    if (memberships) {
      out[hostId] = memberships
    }
  }
  return out
}

function sortGroupEntries(entries: readonly ProjectGroupPrefEntry[]): ProjectGroupPrefEntry[] {
  // Stable sort: equal tab orders keep their persisted insertion order.
  return [...entries].sort((left, right) => (left.tabOrder ?? 0) - (right.tabOrder ?? 0))
}

function sortGroupsByHost(source: ProjectGroupsByHost): ProjectGroupsByHost {
  const out: ProjectGroupsByHost = {}
  for (const hostId of Object.keys(source)) {
    const entries = source[hostId] ?? []
    if (entries.length > 0) {
      out[hostId] = sortGroupEntries(entries)
    }
  }
  return out
}

/**
 * Drops memberships that point at a group the same host bucket does not hold.
 * An orphan would otherwise paint a header-less group assignment, and keeping it
 * in the bucket is the only place it could survive as a cross-host leak.
 */
function pruneMemberships(
  groupsByHost: ProjectGroupsByHost,
  membershipsByHost: ProjectGroupMapByHost
): ProjectGroupMapByHost {
  const out: ProjectGroupMapByHost = {}
  for (const hostId of Object.keys(membershipsByHost)) {
    const groupIds = new Set((groupsByHost[hostId] ?? []).map((group) => group.id))
    const memberships = membershipsByHost[hostId] ?? {}
    const kept: Record<string, string> = {}
    for (const [projectId, groupId] of Object.entries(memberships)) {
      if (groupIds.has(groupId)) {
        kept[projectId] = groupId
      }
    }
    if (Object.keys(kept).length > 0) {
      out[hostId] = kept
    }
  }
  return out
}

/** Loads the blob's group collections into per-host buckets (legacy data → local). */
export function readProjectGroupHostState(source: ProjectGroupHostSource): ProjectGroupHostState {
  const bucketedGroups = sanitizeProjectGroupsByHost(source.projectGroupsByHost) ?? {}
  const bucketedMemberships = sanitizeProjectGroupMapByHost(source.projectGroupMapByHost) ?? {}
  const groupsByHost: ProjectGroupsByHost = { ...bucketedGroups }
  const membershipsByHost: ProjectGroupMapByHost = { ...bucketedMemberships }

  // Why the local-host guard: a partial migration may already have written the
  // bucketed local collection; the flat legacy copy is then stale and must not
  // overwrite it. Remote buckets never absorb flat data.
  if (groupsByHost[LOCAL_EXECUTION_HOST_ID] === undefined) {
    const legacyGroups = sanitizeLegacyProjectGroups(source.projectGroups)
    if (legacyGroups) {
      groupsByHost[LOCAL_EXECUTION_HOST_ID] = legacyGroups
    }
  }
  if (membershipsByHost[LOCAL_EXECUTION_HOST_ID] === undefined) {
    const legacyMemberships = sanitizeLegacyProjectGroupMap(source.projectGroupMap)
    if (legacyMemberships) {
      membershipsByHost[LOCAL_EXECUTION_HOST_ID] = legacyMemberships
    }
  }

  const sortedGroups = sortGroupsByHost(groupsByHost)
  return {
    groupsByHost: sortedGroups,
    membershipsByHost: pruneMemberships(sortedGroups, membershipsByHost)
  }
}

export function hasProjectGroupHostData(state: ProjectGroupHostState): boolean {
  return (
    Object.values(state.groupsByHost).some((entries) => entries.length > 0) ||
    Object.values(state.membershipsByHost).some((map) => Object.keys(map).length > 0)
  )
}

/** Snapshot fields persisted in the `ui.sidebar` blob (empty buckets omitted). */
export function serializeProjectGroupHostState(state: ProjectGroupHostState): {
  projectGroupsByHost: ProjectGroupsByHost
  projectGroupMapByHost: ProjectGroupMapByHost
} {
  const projectGroupsByHost: ProjectGroupsByHost = {}
  for (const [hostId, entries] of Object.entries(state.groupsByHost)) {
    if (entries.length > 0) {
      projectGroupsByHost[hostId] = entries.map((entry) => ({ ...entry }))
    }
  }
  const projectGroupMapByHost: ProjectGroupMapByHost = {}
  for (const [hostId, memberships] of Object.entries(state.membershipsByHost)) {
    if (Object.keys(memberships).length > 0) {
      projectGroupMapByHost[hostId] = { ...memberships }
    }
  }
  return { projectGroupsByHost, projectGroupMapByHost }
}

function orderedHostIds(groupsByHost: ProjectGroupsByHost): ExecutionHostId[] {
  const hostIds = Object.keys(groupsByHost).flatMap((hostId) => {
    const normalized = normalizeExecutionHostId(hostId)
    return normalized ? [normalized] : []
  })
  // Local first so the local bucket is the primary authority when a project id
  // happens to exist in more than one bucket.
  return hostIds.sort((left, right) => {
    if (left === right) return 0
    if (left === LOCAL_EXECUTION_HOST_ID) return -1
    if (right === LOCAL_EXECUTION_HOST_ID) return 1
    return left.localeCompare(right)
  })
}

/**
 * Flat view for the sidebar: every bucket's groups in tab order, each stamped
 * with its owner host. Memberships keep the same-host rule and first-wins on a
 * project id collision (local is visited first).
 */
export function flattenProjectGroupHostState(state: ProjectGroupHostState): {
  projectGroups: FlatProjectGroupEntry[]
  projectGroupMap: Record<string, string>
} {
  const hostIds = orderedHostIds(state.groupsByHost)
  const projectGroups: FlatProjectGroupEntry[] = []
  const projectGroupMap: Record<string, string> = {}
  for (const hostId of hostIds) {
    const entries = state.groupsByHost[hostId] ?? []
    const groupIds = new Set(entries.map((entry) => entry.id))
    for (const entry of entries) {
      projectGroups.push({ ...entry, hostId })
    }
    for (const [projectId, groupId] of Object.entries(state.membershipsByHost[hostId] ?? {})) {
      if (!groupIds.has(groupId) || projectId in projectGroupMap) {
        continue
      }
      projectGroupMap[projectId] = groupId
    }
  }
  return { projectGroups, projectGroupMap }
}

/** Every host the renderer can address: the local host plus hosts owning a repo. */
export function collectKnownProjectGroupHostIds(
  repos: readonly RepoExecutionHostOwner[]
): Set<string> {
  const hostIds = new Set<string>([LOCAL_EXECUTION_HOST_ID])
  for (const repo of repos) {
    hostIds.add(getRepoExecutionHostId(repo))
  }
  return hostIds
}

/**
 * Resolves an event's `hostId`. An omitted id keeps the pre-bucket contract and
 * means the local host; a malformed id is invalid and a parseable id that no
 * repo owns is unknown — both must fail loudly instead of landing in local state.
 */
export function resolveProjectGroupHost(
  hostId: unknown,
  knownHostIds?: ReadonlySet<string>
): ProjectGroupHostResolution {
  if (hostId === undefined || hostId === null) {
    return { ok: true, hostId: LOCAL_EXECUTION_HOST_ID }
  }
  if (typeof hostId !== 'string') {
    return { ok: false, reason: 'invalid-host' }
  }
  const trimmed = hostId.trim()
  if (!trimmed) {
    return { ok: true, hostId: LOCAL_EXECUTION_HOST_ID }
  }
  const normalized = normalizeExecutionHostId(trimmed)
  if (!normalized) {
    return { ok: false, reason: 'invalid-host' }
  }
  if (normalized !== LOCAL_EXECUTION_HOST_ID && knownHostIds && !knownHostIds.has(normalized)) {
    return { ok: false, reason: 'unknown-host' }
  }
  return { ok: true, hostId: normalized }
}

function assertExecutionHost(hostId: unknown): ExecutionHostId | null {
  if (typeof hostId !== 'string') {
    return null
  }
  return normalizeExecutionHostId(hostId)
}

function withUpdatedHostBucket(
  state: ProjectGroupHostState,
  hostId: ExecutionHostId,
  groups: ProjectGroupPrefEntry[],
  memberships: Record<string, string>
): ProjectGroupHostState {
  const groupsByHost: ProjectGroupsByHost = { ...state.groupsByHost }
  const membershipsByHost: ProjectGroupMapByHost = { ...state.membershipsByHost }
  if (groups.length > 0) {
    groupsByHost[hostId] = groups
  } else {
    delete groupsByHost[hostId]
  }
  if (Object.keys(memberships).length > 0) {
    membershipsByHost[hostId] = memberships
  } else {
    delete membershipsByHost[hostId]
  }
  return { groupsByHost, membershipsByHost }
}

function createGroupId(now: number, existing: readonly ProjectGroupPrefEntry[]): string {
  const base = `grp_${now}`
  const ids = new Set(existing.map((entry) => entry.id))
  if (!ids.has(base)) {
    return base
  }
  let suffix = 1
  while (ids.has(`${base}_${suffix}`)) {
    suffix += 1
  }
  return `${base}_${suffix}`
}

export function createProjectGroupInHost(
  state: ProjectGroupHostState,
  args: {
    hostId: ExecutionHostId
    name: string
    projectId?: string | null
    id?: string
    tabOrder?: number
    now?: number
  }
): ProjectGroupCreateResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  const name = typeof args.name === 'string' ? args.name.trim() : ''
  if (!name) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const entries = state.groupsByHost[hostId] ?? []
  const now = args.now ?? Date.now()
  const id = args.id?.trim() || createGroupId(now, entries)
  if (entries.some((entry) => entry.id === id)) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const tabOrder =
    typeof args.tabOrder === 'number' && Number.isFinite(args.tabOrder) ? args.tabOrder : now
  const group: ProjectGroupPrefEntry = { id, name, tabOrder }
  const memberships = { ...(state.membershipsByHost[hostId] ?? {}) }
  if (typeof args.projectId === 'string' && args.projectId) {
    memberships[args.projectId] = id
  }
  return {
    ok: true,
    group,
    state: withUpdatedHostBucket(state, hostId, [...entries, group], memberships)
  }
}

export function renameProjectGroupInHost(
  state: ProjectGroupHostState,
  args: { hostId: ExecutionHostId; id: string; name: string }
): ProjectGroupWriteResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  const name = typeof args.name === 'string' ? args.name.trim() : ''
  if (!name) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const entries = state.groupsByHost[hostId] ?? []
  if (!entries.some((entry) => entry.id === args.id)) {
    return { ok: false, reason: 'unknown-group' }
  }
  const nextEntries = entries.map((entry) =>
    entry.id === args.id ? { ...entry, name } : entry
  )
  return {
    ok: true,
    state: withUpdatedHostBucket(
      state,
      hostId,
      nextEntries,
      state.membershipsByHost[hostId] ?? {}
    )
  }
}

export function updateProjectGroupOrderInHost(
  state: ProjectGroupHostState,
  args: { hostId: ExecutionHostId; id: string; tabOrder: number }
): ProjectGroupWriteResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  if (typeof args.tabOrder !== 'number' || !Number.isFinite(args.tabOrder)) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const entries = state.groupsByHost[hostId] ?? []
  if (!entries.some((entry) => entry.id === args.id)) {
    return { ok: false, reason: 'unknown-group' }
  }
  // Why only this bucket: the same group id may exist on another host, and its
  // position is that host's layout, not this one's.
  const nextEntries = sortGroupEntries(
    entries.map((entry) =>
      entry.id === args.id ? { ...entry, tabOrder: args.tabOrder } : entry
    )
  )
  return {
    ok: true,
    state: withUpdatedHostBucket(
      state,
      hostId,
      nextEntries,
      state.membershipsByHost[hostId] ?? {}
    )
  }
}

export function moveProjectToGroupInHost(
  state: ProjectGroupHostState,
  args: { hostId: ExecutionHostId; projectId: string; groupId: string }
): ProjectGroupWriteResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  if (!args.projectId || !args.groupId) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const entries = state.groupsByHost[hostId] ?? []
  if (!entries.some((entry) => entry.id === args.groupId)) {
    return { ok: false, reason: 'unknown-group' }
  }
  const memberships = {
    ...(state.membershipsByHost[hostId] ?? {}),
    [args.projectId]: args.groupId
  }
  return { ok: true, state: withUpdatedHostBucket(state, hostId, entries, memberships) }
}

export function removeProjectFromGroupInHost(
  state: ProjectGroupHostState,
  args: { hostId: ExecutionHostId; projectId: string }
): ProjectGroupWriteResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  if (!args.projectId) {
    return { ok: false, reason: 'invalid-payload' }
  }
  const memberships = { ...(state.membershipsByHost[hostId] ?? {}) }
  delete memberships[args.projectId]
  return {
    ok: true,
    state: withUpdatedHostBucket(
      state,
      hostId,
      state.groupsByHost[hostId] ?? [],
      memberships
    )
  }
}

export function deleteProjectGroupInHost(
  state: ProjectGroupHostState,
  args: { hostId: ExecutionHostId; id: string }
): ProjectGroupDeleteResult {
  const hostId = assertExecutionHost(args.hostId)
  if (!hostId) {
    return { ok: false, reason: 'invalid-host' }
  }
  const entries = state.groupsByHost[hostId] ?? []
  // Why no unknown-group failure: a missing group is the desired end state, and
  // the delete still has to strip any stale memberships on this host.
  const nextEntries = entries.filter((entry) => entry.id !== args.id)
  const memberships = Object.fromEntries(
    Object.entries(state.membershipsByHost[hostId] ?? {}).filter(
      ([, groupId]) => groupId !== args.id
    )
  )
  return {
    ok: true,
    deleted: nextEntries.length !== entries.length,
    state: withUpdatedHostBucket(state, hostId, nextEntries, memberships)
  }
}

function resolveCatalogHost(
  hostId: string | null | undefined,
  defaultHostId: string | null | undefined
): ExecutionHostId {
  return (
    normalizeExecutionHostId(hostId) ??
    normalizeExecutionHostId(defaultHostId) ??
    LOCAL_EXECUTION_HOST_ID
  )
}

/**
 * Folds an authoritative catalog read into the persisted buckets. Catalog rows
 * win on name, but the user's manual `tabOrder` survives; persisted memberships
 * win over catalog ones so an in-session move is not reverted by the refresh.
 */
export function mergeProjectGroupCatalogIntoHostState(
  state: ProjectGroupHostState,
  catalog: ProjectGroupCatalog
): ProjectGroupHostState {
  const groupsByHost: ProjectGroupsByHost = {}
  for (const [hostId, entries] of Object.entries(state.groupsByHost)) {
    groupsByHost[hostId] = entries.map((entry) => ({ ...entry }))
  }
  const membershipsByHost: ProjectGroupMapByHost = {}
  for (const [hostId, memberships] of Object.entries(state.membershipsByHost)) {
    membershipsByHost[hostId] = { ...memberships }
  }

  for (const candidate of catalog.groups) {
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : ''
    if (!id || !name) {
      continue
    }
    const hostId = resolveCatalogHost(candidate.hostId, catalog.defaultHostId)
    const entries = groupsByHost[hostId] ?? []
    const existing = entries.find((entry) => entry.id === id)
    const catalogTabOrder =
      typeof candidate.tabOrder === 'number' && Number.isFinite(candidate.tabOrder)
        ? candidate.tabOrder
        : undefined
    const tabOrder = existing?.tabOrder ?? catalogTabOrder
    const nextEntry: ProjectGroupPrefEntry =
      tabOrder === undefined ? { id, name } : { id, name, tabOrder }
    groupsByHost[hostId] = existing
      ? entries.map((entry) => (entry.id === id ? nextEntry : entry))
      : [...entries, nextEntry]
  }

  for (const [projectId, groupId] of Object.entries(catalog.memberships ?? {})) {
    if (!projectId || !groupId) {
      continue
    }
    const ownerHostId = orderedHostIds(groupsByHost).find((hostId) =>
      (groupsByHost[hostId] ?? []).some((entry) => entry.id === groupId)
    )
    if (!ownerHostId) {
      continue
    }
    const memberships = membershipsByHost[ownerHostId] ?? {}
    if (projectId in memberships) {
      continue
    }
    membershipsByHost[ownerHostId] = { ...memberships, [projectId]: groupId }
  }

  const sortedGroups = sortGroupsByHost(groupsByHost)
  return {
    groupsByHost: sortedGroups,
    membershipsByHost: pruneMemberships(sortedGroups, membershipsByHost)
  }
}

export type ProjectGroupContainedRemovalResult = {
  /** True only when every requested project was removed. */
  ok: boolean
  removedProjectIds: string[]
  failedProjectIds: string[]
}

/**
 * `removeContainedProjects` fan-out (Orca `useProjectGroupDialogs`). Each project
 * reports on its own instead of one aggregate boolean; the group's non-local
 * host cannot run the local `remove_project` command, so every project fails
 * explicitly rather than being silently skipped.
 */
export async function removeContainedProjectsForGroup(args: {
  hostId: ExecutionHostId
  projects: readonly { id: string; path: string }[]
  removeProject: (project: { id: string; path: string }) => Promise<unknown>
}): Promise<ProjectGroupContainedRemovalResult> {
  const removedProjectIds: string[] = []
  const failedProjectIds: string[] = []
  const seen = new Set<string>()
  const hostId = normalizeExecutionHostId(args.hostId)
  for (const project of args.projects) {
    if (!project.id || seen.has(project.id)) {
      continue
    }
    seen.add(project.id)
    if (hostId !== LOCAL_EXECUTION_HOST_ID) {
      failedProjectIds.push(project.id)
      continue
    }
    try {
      await args.removeProject(project)
      removedProjectIds.push(project.id)
    } catch {
      failedProjectIds.push(project.id)
    }
  }
  return {
    ok: failedProjectIds.length === 0,
    removedProjectIds,
    failedProjectIds
  }
}
