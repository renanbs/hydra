# D02a-repo-add-wizard → Hydra — Gaps (Fase 2)

Veredito: **parity 1 · partial 12 · missing 22 · not-applicable 6 · out-of-scope 1** (42/42 ids).
Diff: `domains/D02a-repo-add-wizard.diff.json`. Inventário: `domains/D02a-repo-add-wizard.orca.json`.

## Superfície Hydra realmente wired (baseline)

- `src/components/sidebar/AddRepoDialog.tsx` (297 ln) montado em `src/App.tsx:4026`; aberto por
  `onOpenAddRepoDialog` a partir de `SidebarHeader.tsx:106`, `WorktreeList.tsx:579` e `Landing`
  (`App.tsx:3821`). Passos: `start` (Browse folder / Clone from URL / Create new project),
  `clone` (URL + destino) e `create` (nome + localização). **Apenas local.**
- `src/components/NewWorkspaceComposer.tsx` montado em `App.tsx:4055` — composer de **worktree**
  (`create_worktree`), não de workspace de pasta; botão "Add project..." só reabre o AddRepoDialog.
- Backend Tauri rastreado pelo caminho acima: `catalog_add_folder` (`src-tauri/src/lib.rs:277`),
  `clone_project` (`:445`), `create_project` (`:428`), `catalog_get` (`:270`), `path_exists` (`:199`).
- Não wired: o "port buffer" de Orca (`src/store/repos/repo-add-actions.ts`, `src/hooks/composer-state/**`,
  `runtime-rpc-client`) — `addRepoPath`/`addRepo`/`addNonGitFolder`/`createFolderWorkspace` não são
  chamados por nenhum componente; `window.api` é bridge **ausente em runtime** (`src/types/window-api.d.ts:5-7`).
  Regra de ouro aplicada: arquivo existir ≠ funcionalidade.

## Top gaps (≤10)

1. **Seleção de host (Local/SSH/Runtime) ausente no wizard** — `D02a-003`, `D02a-004` missing;
   `AddRepoHostSelector`/`useAddRepoHostSelection` existem só como chaves i18n (`src/i18n/locales/en.json:5067`).
2. **Fluxo de adição SSH remota inteiro inaplicável** — `D02a-005/019/020/021` not-applicable
   (SSH remote host; 0 comandos ssh em `src-tauri/src/lib.rs`, bridge Electron ausente).
3. **Etapa de server-path de runtime + RemoteFileBrowser** — `D02a-010/011` not-applicable (runtime server remoto).
4. **Escaneamento de repositórios aninhados + revisão/import em grupo** — `D02a-022/023/024/025` missing;
   `NestedRepoChecklist`/`useAddRepoNestedImportFlow` só como strings i18n.
5. **Add em lote de múltiplas pastas locais** — `D02a-009` missing (picker usa `multiple:false`, `AddRepoDialog.tsx:53`).
6. **Handoff de checkout padrão completo (main worktree, reveal, telemetria)** — `D02a-028` partial: o Hydra só
   seleciona o 1º projeto e abre terminal com `cwd=project.path` (`App.tsx:4029-4052`, `:1584`).
7. **Composer de workspace de pasta (submit, agente, path-status gate)** — `D02a-034/035/037` missing (sem UI;
   `createFolderWorkspace` nunca é chamado).
8. **Diálogos de compatibilidade de import** — `D02a-026` (confirm-from-folder) e `D02a-027` (project-added) missing.
9. **Defaults derivados (clone/create) e links/SSH** — `D02a-013/017` missing: caminhos literais
   `/home/renan/src` (`AddRepoDialog.tsx:26-27`), sem sonda de Git.
10. **Telemetria de adição de projeto** — `D02a-031` out-of-scope (sem sink; `src/lib/telemetry.ts:26` chama bridge ausente).

## Notable parity / partial (≤5)

- **parity** `D02a-039` — `getFolderWorkspaceHostId` (`folder-workspace-host-id.ts:14`) é a fonte única do
  header counting/usando bucketing de hosts do sidebar (`host-section-rows.ts:67`, `host-labels.ts:215`).
- **partial** `D02a-001` — ciclo de vida do modal (isOpen/onClose/reset/Escape/backdrop) wired; faltam
  `activeModal`, `droppedLocalPath`, `cloneAbort`, geração monotônica, hosted/onCloseAutoFocus.
- **partial** `D02a-006` — 3 ações da etapa inicial existem (`AddRepoDialog.tsx:151-201`); faltam roving de
  teclado, chip ⏎, ordenação por `isSshLikely` e copy de estado vazio.
- **partial** `D02a-008` — picker nativo → `catalog_add_folder` → re-leitura do catálogo wired e com backend
  rastreado; faltam scan aninhado, progresso e drop.
- **partial** `D02a-018`/`D02a-014` — criação e clone locais via Tauri (`create_project`, `clone_project`);
  faltam dedup/worktrees/progresso/erros IPC e roteamento SSH/runtime.
- **partial** `D02a-036` — validade de caminho de pasta verificada em runtime de exibição (`path_exists`,
  `App.tsx:2066-2085`); sem cache TTL nem bloqueio de criação (não há compositor).

## Cobertura

Todos os 42 ids do `.orca.json` aparecem exatamente uma vez no `.diff.json` (`jq '.rows|length'` = 42;
ids sequenciais D02a-001…042). Cada linha tem `status` do vocabulário fechado; `not-applicable`/
`out-of-scope` carregam `reason` explícito; `partial`/`missing` carregam `missing_behaviors`; linhas
`missing` carregam `notes` com a busca em 5 passos.

## Cross-walk PAR

PAR itens de sidebar mapeados para este domínio (embutidos no campo `par` de cada linha do diff;
`_par-crosswalk.json` é artefato compartilhado e não foi tocado para evitar clobber concorrente):
`PAR-13` (drop de pasta do SO → `D02a-008`, `D02a-001`), `PAR-41` (NonGitFolderDialog, alvo
`AddRepoDialog.tsx` → `D02a-026`, `D02a-020`), `PAR-44` (auto-revelação de projeto filtrado →
`D02a-030`).
