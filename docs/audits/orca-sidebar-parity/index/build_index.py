#!/usr/bin/env python3
"""Reconstrói TODOS os índices mecânicos e as fatias de domínio da fase 1 (lado Orca).

Uso: python3 build_index.py
Escreve em docs/audits/orca-sidebar-parity/{index,domains}/.
Depois rode index/verify_coverage.py e index/partition_check.py.
"""
import collections
import json
import pathlib
import re

BASE = pathlib.Path(__file__).resolve().parent.parent   # .../orca-sidebar-parity
IDX = BASE / 'index'
DOMS = BASE / 'domains'
IDX.mkdir(exist_ok=True)
DOMS.mkdir(exist_ok=True)

R = pathlib.Path('/home/renan/src/orca/src/renderer/src')
SCOPE_DIR = R / 'components/sidebar'
MOUNTS = [R / 'components/Sidebar.tsx']


def rel(p: pathlib.Path) -> str:
    return str(p.relative_to(R))


ALL_TS = [p for p in R.rglob('*.ts*') if p.is_file() and '.test.' not in p.name]
ALL_TS_WITH_TESTS = [p for p in R.rglob('*.ts*') if p.is_file()]
SCOPE = sorted([p for p in ALL_TS_WITH_TESTS if SCOPE_DIR in p.parents] + [m for m in MOUNTS if m.is_file()])

IMP_RE = re.compile(r"""(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]""")
# exports nomeados (inclui `export default function X`)
EXP_RE = re.compile(
    r'^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_$]+)',
    re.M,
)
# testes: multi-linha e .each(...)('nome')
TEST_RE = re.compile(
    r"""(?:^|\n)[ \t]*(?:describe|it|test)(?:\.\w+)?[ \t]*\([ \t\r\n]*(?:['"`]([^'"`\n]{3,200})['"`])""",
)
TEST_EACH_RE = re.compile(
    r"""(?:^|\n)[ \t]*(?:describe|it|test)\.each\s*(?:\([^)]*\)|<[^>]*>)\s*\(\s*['"`]([^'"`\n]{3,200})['"`]""",
)


def imports_of(p: pathlib.Path):
    return IMP_RE.findall(p.read_text(errors='ignore'))


def resolve(spec: str, src: pathlib.Path):
    if spec.startswith('@/'):
        base = R / spec[2:]
    elif spec.startswith('.'):
        base = (src.parent / spec).resolve()
    else:
        return None
    for cand in (base, base.with_suffix('.ts'), base.with_suffix('.tsx'), base / 'index.ts', base / 'index.tsx'):
        if cand.is_file():
            return cand.resolve()
    return None


def loc(p: pathlib.Path) -> int:
    return len(p.read_text(errors='ignore').splitlines())


universe = set(ALL_TS_WITH_TESTS)
depth = {p: 0 for p in SCOPE}
frontier, d = list(SCOPE), 0
while frontier and d < 6:
    nxt = []
    for p in frontier:
        for spec in imports_of(p):
            t = resolve(spec, p)
            if t in universe and t not in depth:
                depth[t] = d + 1
                nxt.append(t)
    frontier, d = nxt, d + 1

files_meta = [
    dict(path=rel(p), kind='test' if '.test.' in p.name else 'prod', loc=loc(p),
         reachable_from_mounts=depth.get(p, 99) <= 6)
    for p in SCOPE
]
(IDX / 'files_scope.json').write_text(json.dumps(files_meta, indent=1))
ring2 = sorted(p for p, dd in depth.items() if dd == 1 and p not in SCOPE)
ring3 = sorted(p for p, dd in depth.items() if dd >= 2 and p not in SCOPE)
(IDX / 'ring2_deps.json').write_text(json.dumps([dict(path=rel(p), loc=loc(p)) for p in ring2], indent=1))
(IDX / 'ring3_deps.json').write_text(json.dumps([dict(path=rel(p), loc=loc(p)) for p in ring3], indent=1))

exports = collections.defaultdict(list)
for p in SCOPE + ring2:
    syms = EXP_RE.findall(p.read_text(errors='ignore'))
    if re.search(r'^export\s+default\b', p.read_text(errors='ignore'), re.M):
        syms = list(dict.fromkeys(syms + ['default']))
    if syms:
        exports[rel(p)] = syms
(IDX / 'exports.json').write_text(json.dumps(exports, indent=1))


def grep_ctx(paths, pattern, maxper=None):
    rx = re.compile(pattern)
    hits = []
    for p in paths:
        n = 0
        for i, ln in enumerate(p.read_text(errors='ignore').splitlines(), 1):
            if rx.search(ln):
                hits.append(dict(file=rel(p), line=i, text=ln.strip()[:240]))
                n += 1
                if maxper and n >= maxper:
                    break
    return hits


preload = grep_ctx(SCOPE + ring2, r'window\.(orca|electron|api|desktop)\b[A-Za-z0-9_.$\[\]]*')
(IDX / 'preload_symbols.json').write_text(json.dumps(preload, indent=1))
syms = sorted({m for h in preload for m in re.findall(r'window\.(?:orca|electron|api|desktop)[A-Za-z0-9_.]*', h['text'])})
(IDX / 'preload_symbols_unique.txt').write_text('\n'.join(syms))
(IDX / 'menu_labels.json').write_text(json.dumps(grep_ctx(SCOPE, r"(label:|title=|<aria-label|placeholder=|<MenuItem|DropdownMenuItem|ContextMenuItem|tooltip)"), indent=1))
(IDX / 'shortcuts.json').write_text(json.dumps(grep_ctx(SCOPE, r"(hotkey|Hotkey|accelerator|shortcut|Shortcut|KeyboardEvent|event\.key|useKey|KeyCombo|mod\+|meta\+|ctrl\+)"), indent=1))
(IDX / 'prefs_keys.json').write_text(json.dumps(grep_ctx(SCOPE + ring2, r"(localStorage\.(get|set)Item|sessionStorage\.(get|set)Item|persist\(|STORAGE_KEY|storageKey|preferenceKey)"), indent=1))
(IDX / 'timers.json').write_text(json.dumps(grep_ctx(SCOPE, r"(setInterval|setTimeout|requestAnimationFrame|requestIdleCallback|setImmediate)"), indent=1))
(IDX / 'subscriptions.json').write_text(json.dumps(grep_ctx(SCOPE, r"(\.subscribe\(|addEventListener\(|useEffect\(|window\.addEventListener|\.on\(')"), indent=1))

tests = []
for p in SCOPE:
    if '.test.' not in p.name:
        continue
    text = p.read_text(errors='ignore')
    found = {}
    for rx, kind in ((TEST_EACH_RE, 'each'), (TEST_RE, 'plain')):
        for m in rx.finditer(text):
            idx = text[:m.start(1)].count('\n') + 1
            found[(idx, m.group(1))] = kind
    for (idx, name), kind in sorted(found.items()):
        tests.append(dict(file=rel(p), line=idx, kind=kind, name=name))
(IDX / 'tests.json').write_text(json.dumps(tests, indent=1))

# ---- fatias de domínio (mesma taxonomia usada na auditoria) ----
D = [
 ('D01-shell-chrome', ['components/Sidebar.tsx','^SidebarHeader','^SidebarToolbar','^SidebarNav','^SidebarFooter','^SidebarSettingsHelpMenu','^ScrollToCurrentWorkspaceToolbarButton','^SidebarHostScopeMenuSection','^SidebarTaskNavButton','^ProjectHeaderActions','^repo-header-action-button-class','^sidebar-host-options','^host-section-(order|rows)','^SetupGuideSidebarEntry','^AgentDashboardSidebar','^CacheTimer','^SidebarFeedback','^SectionHeader','^sidebar-count-badge','^sidebar-empty-state-gate','^sidebar-header-actions','^sidebar-nav-controls','^mobile-sidebar-onboarding-badge','^Sidebar\\.test','^StatusIndicator']),
 ('D02a-repo-add-wizard', ['^AddRepo','^add-repo','^use-add-repo','^useAddRepo','^AddProjectFromFolder','^ProjectAdded','^project-added','^useCreateRepo','^useCreateProject','^CreateProjectLocationField','^folder-workspace','^clone-defaults','^create-project-defaults','^use-complete-git-repo-add']),
 ('D02b-hosts-ssh-remote', ['^AddRemoteHost','^add-remote-host','^RemoteFileBrowser','^remote-file-browser','^use-remote-file-browser','^SshTargetRow','^ssh-','^ForgetSshWorkspaceDialog','^HostRemoveDialog','^HostRenameDialog','^HostSectionHeaderMenu','^host-rename-remove','^host-header-menu-items']),
 ('D02c-project-groups-scripts', ['^ProjectGroup','^RemoveFolderDialog','^NonGitFolderDialog','^OrcaYamlTrustDialog','^SetupScript','^setup-script','^useSetupScript','^PreservedBranch','^preserved-branch','^HiddenWorktreeRecoveryList','^SuppressExternalWorktreeInboxDialog','^LinearAgentSkill','^linear-agent-skill','^empty-project-placeholder','^complete-nested-folder-open','^track-nested-folder-open','^open-setup-script-settings']),
 ('D03a-worktree-list-module', ['^worktree-list/']),
 ('D03b-sidebar-list-orchestration', ['^WorktreeList','^buildSidebarRows','^row-types','^rendered-sidebar-worktree-order','^worktree-list-','^worktree-header-section-boundaries','^worktree-sort-label-ordering','^worktree-sidebar-drop-preview','^worktree-snapshot-prune-batch','^worktree-list-card-markup-queries','^index\\.tsx$','^PendingWorktreeRow','^WorktreeSidebarDropIndicator','^sidebar-project-drop','^project-header-','^project-group-header-','^header-drag','^host-header-drag','^useSidebarProjectDrop']),
 ('D04a-worktree-card-surface', ['^WorktreeCard','^worktree-card-(presentation|surface|meta|header|compact|parent|secondary|status|display|agent-summary|agents-expansion|title-display|pr-display|jira|details|dom-events|model)','^pr-display','^WorktreeTitleInlineRename','^WorktreeStatusIndicator','^WorktreeContextMenu','^WorktreeHostContextBadge','^WorktreeOpenInMenu','^WorktreeMetaDialog','^WorktreeIssueLinkField','^WorktreeReviewLinkField','^WorktreeReviewBadge','^WorktreeDeveloperMenu','^WorktreeDisplayNameField','^WorktreeStatusMenuItems','^worktree-review-helpers','^worktree-issue-displacement','^worktree-status','^WorktreeCardMeta']),
 ('D04b-worktree-card-controllers', ['^use-worktree-card','^use-worktree-issue-link','^worktree-card-','^worktree-name-suggestions','^local-base-ref-suggestion-toast','^focused-agent-row-highlight','^truncated-sidebar-label','^active-worktree-focus-after-delete','^worktree-meta-updates','^use-confirmed-worktree-delete-targets','^use-delete-worktree-status-hydration','^run-worktree-delete-with-toast','^use-worktree-activity-status']),
 ('D05-agents-rows', ['^SidebarAgentsList','^CompactAgentRow','^compact-agent-row-labels','^worktree-agent','^agent-row','^agent-status-types','^agent-finished-timestamp','^worktree-subagent-child-rows','^worktree-title-derived-agent-rows','^useWorktreeAgentRows','^stale-agent-row-unverifiable']),
 ('D06-drag-order-keyboard', ['^worktree-sidebar-drag','^worktree-drag','^worktree-manual-order','^worktree-sidebar-row-preference','^worktree-sidebar-reveal','^worktree-keyboard-cycle','^worktree-multi-selection','^hard-scroll-up','^workspace-status-drag-data','^worktree-sidebar-pointer-drag-dom','^worktree-unnest','^worktree-parent','^ParentPickerModal','^WorktreeParentPicker','^worktree-visibility-source-provenance']),
 ('D07-menus-actions', ['context-menu','^WorkspaceOptionsMenu','^SidebarWorkspaceOptionsMenu','^workspace-options-menu-items','^sidebar-workspace-option-items','^WorkspaceSleepMenuItems','^WorkspaceStatusAppearancePopover','^workspace-status','^workspace-lineage-menu-actions','^workspace-delete','^worktree-delete','^delete-worktree','^sleep-worktree-flow','^hovered-workspace-delete','^DeleteWorktree(DirtyChangeHint|LineageNotice|SkipConfirmOption|WarningPanels)']),
 ('D08-kanban-board', ['^WorkspaceKanban','^workspace-kanban','^useWorkspaceBoardPanel','^use-workspace-board','^use-workspace-kanban','^workspace-board-task-status-sync']),
 ('D09-filters-sort', ['^SidebarFilter','^sidebar-filter','^SidebarProjectFilterPanel','^SidebarRepositoryFilterSection','^SidebarWorkspaceFilterSection','^SidebarGroupByToggle','^worktree-filter-visibility','^smart-sort','^smart-attention','^project-filter-reveal','^FilterToggleRow']),
 ('D10-visibility-inbox-notices', ['^WorktreeVisibility','^worktree-visibility','^NewExternalWorktreesInboxLine','^new-external-worktrees-inbox','^imported-worktrees-card','^ImportedWorktreesVisibilityLine','^NoticeHostGlyph','^DeleteWorktreeDialog','^DeleteWorktreeTargetPreview','^AutoRenameFailedDialog','^worktree-delete-state','^worktree-delete-host-qualification','^worktree-delete-position-scaling','^default-branch-visible-under-hide-sleeping','^prompt-cache','^stale-workspace-list-toast','^use-sidebar-feedback','^use-feedback-image-drop']),
 ('D11-lineage-grouping-model', ['^worktree-lineage','^worktree-list-groups','^visible-worktree','^group-keys','^pinned-section-worktrees','^default-branch-workspace','^folder-workspace-host-id','^natural-worktree-ids','^worktree-unambiguous-id-index','^indentation','^workspace-creator-visibility','^workspace-delete-lineage','^repo-header-create-state','^use-repo-owner-visibility-defaults']),
 ('D12-markdown-inline-render', ['^CommentMarkdown','^comment-markdown','^CommentMermaidBlock','^MarkdownImageLightbox']),
]


def assign(name: str) -> str:
    for dom, pats in D:
        for pat in pats:
            if re.search(pat, name):
                return dom
    return 'D15-misc'


buckets = collections.defaultdict(list)
for f in files_meta:
    name = f['path'].split('components/sidebar/')[-1]
    buckets[assign(name)].append(dict(name=name, kind=f['kind'], loc=f['loc']))
misc = sorted(buckets.pop('D15-misc'), key=lambda x: x['name'])
half = len(misc) // 2
buckets['D15-misc-a'] = misc[:half]
buckets['D15-misc-b'] = misc[half:]

src_idx = {k: json.loads((IDX / f'{k}.json').read_text()) for k in
           ('exports', 'menu_labels', 'shortcuts', 'prefs_keys', 'timers', 'subscriptions', 'preload_symbols')}
summary = {}
for dom, items in sorted(buckets.items()):
    prod = [i for i in items if i['kind'] == 'prod']
    tst = [i for i in items if i['kind'] == 'test']
    fileset = {i['name'] for i in items}
    base = {n.split('/')[-1] for n in fileset}

    def filt(obj):
        if isinstance(obj, dict):
            return {k: v for k, v in obj.items() if k in fileset or k.split('/')[-1] in base}
        return [h for h in obj if h['file'] in fileset or h['file'].split('/')[-1] in base]

    slice_ = dict(
        exports=filt(src_idx['exports']), menu_labels=filt(src_idx['menu_labels']),
        shortcuts=filt(src_idx['shortcuts']), prefs=filt(src_idx['prefs_keys']),
        timers=filt(src_idx['timers']), subscriptions=filt(src_idx['subscriptions']),
        preload=filt(src_idx['preload_symbols']),
        tests=[t for t in tests if t['file'] in fileset or t['file'].split('/')[-1] in base],
    )
    (DOMS / f'{dom}.manifest.json').write_text(json.dumps(dict(domain=dom, prod=prod, test=tst), indent=1))
    (DOMS / f'{dom}.index.json').write_text(json.dumps(slice_, indent=1))
    summary[dom] = dict(prod_files=len(prod), prod_loc=sum(i['loc'] for i in prod), test_files=len(tst),
                        exports=sum(len(v) for v in slice_['exports'].values()), labels=len(slice_['menu_labels']),
                        shortcuts=len(slice_['shortcuts']), preload=len(slice_['preload']), timers=len(slice_['timers']),
                        subs=len(slice_['subscriptions']), tests=len(slice_['tests']))
(DOMS / '_summary.json').write_text(json.dumps(summary, indent=1))

print(f'escopo={len(files_meta)} (prod={sum(1 for f in files_meta if f["kind"] == "prod")}) '
      f'closure={len(depth)} ring2={len(ring2)} ring3={len(ring3)}')
print(f'exports(escopo+ring2)={sum(len(v) for v in exports.values())} tests={len(tests)} '
      f'labels={len(src_idx["menu_labels"])} hotkeys={len(src_idx["shortcuts"])} '
      f'prefs={len(src_idx["prefs_keys"])} timers={len(src_idx["timers"])} subs={len(src_idx["subscriptions"])} '
      f'preload={len(src_idx["preload_symbols"])}')
print('domínios:', len(summary), '| prod total:', sum(s['prod_files'] for s in summary.values()))
