# D10 — Visibility / Inbox / Notices — Gaps

Domínio: `D10-visibility-inbox-notices` (91 linhas).
Resultado: **22 parity · 40 partial · 29 missing · 0 not-applicable · 0 out-of-scope**.

Gaps ordenados por severidade (impacto × esforço). "Contrato Tauri" só é citado quando falta
backend; todos os comandos atuais do sidebar são `async fn` em `src-tauri/src/lib.rs`.

---

## P0 — Correção / integridade de dados

### G1. Atribuição de host nas linhas de notice (glyph + qualificação de rótulos)
- **Linhas:** D10-027, D10-032 (missing); D10-035, D10-036, D10-037 (missing).
- **Orca:** `components/sidebar/NoticeHostGlyph.tsx` (ícone monitor/server, tooltip
  "Project on …", estado `disconnected`, `keyboardFocusable`) e as linhas
  `ImportedWorktreesVisibilityLine.tsx:156` / `NewExternalWorktreesInboxLine.tsx:42,49,135`
  qualificam rótulos com `<repo> on <host>` quando o projeto tem >1 checkout.
- **Hydra:** não existe `NoticeHostGlyph`; só `src/components/sidebar/WorktreeHostContextBadge.tsx:5`
  (badge de texto sem ícone/tooltip/estado). O componente alcançável recebe apenas
  `repoDisplayName` (`ImportedWorktreesVisibilityLine.tsx:196`, `NewExternalWorktreesInboxLine.tsx:59`).
  `getNoticeHostContextLabels` (`worktree-list/grouping/host-labels.ts:89`) produz
  `NoticeHostContext`, mas o `grouping/` está no pipeline `buildSidebarRows`, listado em
  `hydra_unreachable.json` — logo não conta.
- **Impacto:** alto em setups multi-host: duas linhas idênticas de projetos diferentes ficam
  indistinguíveis. **Esforço:** médio (novo componente + plumbar `hostContextLabel/hostId` por
  `WorktreeList.tsx`→linhas).
- **Contrato Tauri:** nenhum (estado de runtime já existe no store).

### G2. Escopo de host + fence de mutação no WorktreeVisibilityDialog
- **Linhas:** D10-039, D10-083, D10-084, D10-085, D10-086 (missing); D10-040, D10-042, D10-043
  (partial).
- **Orca:** `resolveWorktreeVisibilityHostTarget` / `useWorktreeVisibilityHostActions` injetam
  `executionHostId`; `worktree-visibility-mutation-fence.ts` é um singleton por scope
  (`'<host>\0<repoId>'`) que sobrevive ao unmount e trava reabertura/reações concorrentes.
- **Hydra:** tudo usa `project.path` (`WorktreeVisibilityDialog.tsx:204,317`); `busyPath` é
  estado local que morre no unmount; `setScanState('checking')` não trava as linhas
  (`WorktreeVisibilityDialog.tsx:107-130`).
- **Impacto:** alto — writes no host errado / corrida entre remount e write. **Esforço:** alto
  (helper de scope + fence + aceitação).

### G3. Validação de instância no delete + toast de lista obsoleta
- **Linhas:** D10-013, D10-014, D10-017 (partial); D10-077 (missing); D10-005 (partial).
- **Orca:** `resolveConfirmedTargets` revalida `instanceId/hostId`; ao falhar emite
  `showWorkspaceListChangedToast` ("Workspace list changed…") e fecha sem deletar;
  `stale-workspace-list-toast.ts` tem também `showNoDeletableWorkspacesToast`.
- **Hydra:** `DeleteWorktreeDialog.tsx:96-137` deleta direto pelo `wt.path`, sem checar
  instância; nenhum toast existe (buscas por "Workspace list changed" / "No deletable
  workspaces" vazias).
- **Impacto:** alto — deleta o irmão errado quando o repo muda entre abrir e confirmar.
  **Esforço:** médio.
- **Contrato Tauri:** precisa de identidade escopada (`id+hostId`) no payload de
  `delete_worktree` (hoje `repo_path, worktree_path`).

### G4. Delete de lineage (pai + descendentes)
- **Linhas:** D10-008, D10-015 (missing); D10-006, D10-011, D10-018, D10-019 (partial).
- **Orca:** `DeleteWorktreeLineageNotice`, `canDeleteAllLineage`, `runLineageDeleteAll` e as
  variantes de copy ("Delete {count} Workspaces", childTargetLabel).
- **Hydra:** `DeleteWorktreeDialog.tsx` não trata descendentes; labels só têm
  single/batch (`:60-68`).
- **Impacto:** alto — deletar pai órfã filhos ou exige N diálogos. **Esforço:** médio-alto.
- **Contrato Tauri:** nenhum novo (reusa `delete_worktree` em loop).

---

## P1 — Funcionalidade ausente com backend a criar

### G5. Output completo do auto-rename
- **Linha:** D10-001 (partial).
- **Orca:** ao abrir, `window.api.worktrees.getBranchRenameFailureOutput({worktreeId})` com
  fallback para o excerto persistido.
- **Hydra:** `AutoRenameFailedDialog.tsx:116` só renderiza a prop `error`; `worktreeId` é
  declarado e não usado (`:11`).
- **Contrato Tauri:** novo `#[tauri::command] async fn get_branch_rename_failure_output(worktree_id: String) -> Option<String>`
  (o erro persistido já existe via `set_worktree_rename_error`, `lib.rs:497`).

### G6. Relógio compartilhado e seleção de countdown de prompt-cache
- **Linhas:** D10-072 (partial); D10-073, D10-074, D10-075, D10-076 (missing).
- **Orca:** `prompt-cache-countdown-clock.ts` (um `setInterval(1000)` para todos, pausa em
  `visibilitychange`, hook `useSyncExternalStore`) e `prompt-cache-timer-selection.ts`
  (`getMostUrgentPromptCacheStartedAt`, `getPromptCacheCountdownForPane`).
- **Hydra:** `CacheTimer.tsx:12-23` cria um `setInterval` por instância, sem pausa nem hooks;
  `cacheStartedAt` está hardcoded `null` em `use-worktree-card-controller.ts:305` (o contador
  nunca é populado a partir de `cacheTimerByKey`).
- **Impacto:** médio-alto — performance (N intervalos) e contador morto. **Esforço:** médio.
- **Contrato Tauri:** nenhum (estado já está em `terminal-ephemeral-state.ts`).

### G7. Superfície de feedback do sidebar (hooks completos)
- **Linhas:** D10-078…D10-082 (missing).
- **Orca:** `use-feedback-image-drop.ts`, `use-sidebar-feedback-environment-prefill.ts`,
  `use-sidebar-feedback-images.ts` (drag aceito no `dragover`, claim de drop antes do preload,
  prefill de ambiente sem roubar caret, reserva de slots, release de object URLs).
- **Hydra:** não existe dialog/hooks de feedback do sidebar (buscas "feedback" só retornam
  comentários e `keyboard-cycle.ts`).
- **Impacto:** médio (feature inteira ausente). **Esforço:** alto.
- **Contrato Tauri:** nenhum; leitura de arquivos é client-side.

### G8. Card de "Imported worktrees" (candidatos + ação show com rollback)
- **Linhas:** D10-063, D10-066 (missing); D10-064, D10-067, D10-068, D10-069, D10-070 (partial).
- **Orca:** `buildImportedWorktreesCardCandidates`, `showImportedWorktreesCard` (update
  `externalWorktreeVisibility='show'` + refresh autoritativo + rollback), catálogo de erros de
  inbox.
- **Hydra:** sem candidate builder (os row-types existem só no pipeline órfão `buildSidebarRows`);
  `WorktreeSidebar.tsx:773` mantém hidden (baseline + prompt) mas só faz `console.error`; o
  suppress (`:792`) grava `suppressed_discovery` em SQLite (`project_manager.rs:205`) em vez de
  `externalWorktreeDiscoverySuppressedAt` + baseline no catálogo.
- **Contrato Tauri:** `suppress_worktree_inbox` deveria fundir baseline no catálogo
  (mesmo write de `catalog_set_worktree_visibility`, `lib.rs:304`).

### G9. Aceitação de writes de visibilidade por source
- **Linhas:** D10-043, D10-044, D10-046, D10-047, D10-087, D10-088, D10-089, D10-090 (partial).
- **Orca:** cada mutação carrega um predicado `isAccepted` contra o repo mais recente; host antigo
  que descarta prefs additivas vira erro ("This host doesn't support source-specific worktree
  visibility…").
- **Hydra:** `persistSources` (`WorktreeVisibilityDialog.tsx:200-226`) confia no sucesso do
  `invoke` e tem só a mensagem genérica (`:223`); `handleUseGlobal` (`:260`) remove prefs sem
  revalidar.
- **Impacto:** médio-alto (falso sucesso em host desatualizado). **Esforço:** médio.
- **Contrato Tauri:** `catalog_set_worktree_visibility_sources` já retorna o envelope — a
  revalidação pode ser client-side sobre o envelope retornado.

---

## P2 — Paridade de UX/validação menor

### G10. Help popover e aviso de override no dialog de visibilidade
- **Linhas:** D10-052, D10-061 (missing).
- **Orca:** `WorktreeVisibilityHelpPopover` ("Which worktrees are hidden by default?", hover/click/Escape/click-outside)
  e `getWorktreeVisibilityOverrideNotice` (role=status).
- **Hydra:** inexistentes. **Esforço:** baixo (componente pequeno + texto `role=status`).

### G11. Preview de alvo do delete com host/collision e erros por linha
- **Linhas:** D10-007, D10-021 (missing/partial); D10-020, D10-022, D10-023 (partial).
- **Orca:** `DeleteWorktreeTargetPreview` com `getCollisionIds`/`getTargetHostLabel`, role
  region/list, erro inline por linha, `max-h-48`.
- **Hydra:** `DeleteWorktreeDialog.tsx:150-171` lista paths sem host, erro é um painel global e
  sem semântica de lista. **Esforço:** médio.

### G12. Dialog de visibilidade: cópia/aria e form inline fiéis
- **Linhas:** D10-048, D10-049, D10-050, D10-054, D10-057, D10-058, D10-060 (partial).
- **Orca:** nomes acessíveis com path completo (`Show <nome> at <path>`, `Remove <rootPath>`,
  `Visibility for <rootPath>`), input `#custom-worktree-root` com `aria-invalid/aria-describedby`,
  `disabled` durante checking/busy/toggling, contagem ignorando checkouts selecionados e
  Orca-managed, link Global Settings com `sectionId`.
- **Hydra:** `WorktreeVisibilityDialog.tsx:413,433,525-529` usam basename; disabled só por
  `savingSource`; `App.tsx:3662` abre Settings em "general". **Esforço:** baixo-médio.

### G13. Fidelidade de contêiner do output do auto-rename
- **Linha:** D10-004 (partial).
- **Orca:** `[overflow-wrap:anywhere]` + `padding-right` reservado para o botão flutuante.
- **Hydra:** `AutoRenameFailedDialog.tsx:116` usa `break-words` e botão de cópia no header.
  **Esforço:** baixo.

### G14. Delete: copy/hidratação/limpeza de estado
- **Linhas:** D10-016 (partial), D10-006 (partial), D10-011, D10-019 (partial).
- **Orca:** hidratação de status por host dono com AbortController, copy de folder/lineage e
  variantes de label de lineage.
- **Hydra:** dirty counts vêm prontos do parent (`App.tsx:408`); sem host-context hydration.
  **Esforço:** médio.

### G15. Linha compacta de descoberta: placement/host
- **Linha:** D10-024 (partial).
- **Orca:** copy `pinned-fallback` ("Hiding N … in <repo>") e `repoScopeLabel`.
- **Hydra:** `ImportedWorktreesVisibilityLine.tsx:196` tem só a copy repo-group.
  **Esforço:** baixo (dependente de G1).

---

## Observações de infraestrutura
- `NoticeHostContext` (grouping/host-labels.ts) e todo o pipeline `buildSidebarRows`/`grouping`
  não são alcançáveis do mount (`hydra_unreachable.json`); D10-027/032/035-037/066/071 não podem
  contar como paridade enquanto isso.
- `scan.hidden` (`App.tsx:1068,1100`) é a fonte real das linhas de inbox no Hydra; D10-065 foi
  marcado `parity` por comportamento observável mesmo sem o helper homônimo.
- Nenhum item D10 é `not-applicable` ou `out-of-scope`.
