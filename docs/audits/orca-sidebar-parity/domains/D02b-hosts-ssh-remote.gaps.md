# GAPS — D02b-hosts-ssh-remote (fase 2: veredito Hydra)

Fonte Orca congelada: `domains/D02b-hosts-ssh-remote.orca.json` (stablyai/orca @ e49b3aa0bd + working tree).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (Tauri v2 + React 19).

- Linhas do `.orca.json`: **30**; ids com veredito exatamente uma vez: **30/30**.
- Vereditos: `parity 0 | partial 0 | missing 30 | not-applicable 0 | out-of-scope 0`.
- Nenhuma linha `parity`/`partial` (não há símbolo Hydra alcançável a partir do mount do sidebar que produza o efeito).
- Arquivos: `domains/D02b-hosts-ssh-remote.diff.json` (veredictos) + este `.gaps.md`.

## 1. Estado do subsistema SSH/remote no Hydra — a ausência é de implementação, não de plataforma

O Hydra contém um **buffer de port do Orca não ligado ao runtime**; arquivo existir não é funcionalidade:

| Papel | Evidência Hydra | O que mostra |
|---|---|---|
| Store real | `src/store/index.ts:432` (`sshConnectionStates: null`), `:435` (`sshTargetLabels: null`), `:193` (`sshConnectionStates: any`) | O `AppState` real declara os campos SSH como `any`/`null`; não há hidratação. |
| Store real (runtime env) | `src/store/index.ts:428` (`runtimeEnvironments: null`), `:463` (`setRuntimeEnvironments: () => {}`) | Setter no-op; nenhum host remoto existe em runtime. |
| Slice portado | `src/store/slices/ssh.ts:1` (`// @ts-nocheck — Orca port buffer; typecheck when this subsystem is wired.`) | O slice SSH é buffer de port; `createSshSlice` só é usado em `src/store/slices/store-test-helpers.ts:86`, nunca no store de produção. |
| Registro de hosts | `src/shared/execution-host-registry.ts:1` (`// @ts-nocheck — Orca port buffer`) | Modelo `ssh:`/`runtime:` existe como tipo portado, sem wiring. |
| Backend Rust | `src-tauri/src/catalog.rs:71` (`/// Campos remotos/SSH ficam ausentes (None) até terem função.`) | Não há comando Tauri de SSH/remote; `grep -i ssh src-tauri/src/lib.rs` = 0. |
| Nota do próprio app | `src/App.tsx:3911` (`barra de status do Orca ... (uso/atualização/SSH sem função)`) | O autor marca o SSH da status bar como sem função. |
| Status bar | `src/components/status-bar/StatusBarSurface.tsx:45` importa `SshStatusSegment.tsx:7`, que é um botão estático com tooltip "Remote Hosts" e **sem handler** | Mesmo o único ponto montado é um stub visual. |
| Componentes órfãos | `src/components/settings/SshTargetCard.tsx:96` e `src/components/status-bar/SshTargetStatusRow.tsx:4` (`return null`) | Sem importers; card real de gestão de SSH está morto. |
| Sidebar (host-header) | `src/components/sidebar/host-section-rows.ts:166` (`addHostSectionRows`) chamado **somente** por `src/components/sidebar/rendered-sidebar-worktree-order.ts:93` | O host-header só é construído no replay de atalhos Cmd+1–9 (quando há filtro de host); `WorktreeList.tsx:5` pinta projetos/worktrees direto e não importa `host-section-rows`. |
| Sidebar (host-options) | `src/components/sidebar/sidebar-host-options.ts:20` — `buildSidebarHostOptions` só é chamada em `rendered-sidebar-worktree-order.ts:96`; `shouldShowHostScopeControls`/`buildSidebarHostScopeOptions`/`getSidebarHostVisibilityLabel` têm **0 call-sites** | Não há UI de escopo/filtro de hosts nem menu por host. |
| Sidebar (mount) | `src/components/sidebar/WorktreeSidebar.tsx:16` importa `WorktreeList`; nenhum arquivo `src/components/sidebar/**` referencia ssh/host remoto funcional (`grep -i ssh` só retorna `isShellProcess` e comentários) | O sidebar montado é Fleet & Worktree Manager local. |

Consequência: o mount do sidebar do Hydra não alcança nenhum símbolo que produza os efeitos das 30 linhas. Veredito de todas: **`missing`**.

## 2. Por que `not-applicable` foi avaliado e **rejeitado**

O protocolo admite `not-applicable` para `SSH remote host`. Esse veredito foi considerado para as linhas de transporte SSH/Orca Server
(`D02b-001`…`D02b-010`, `D02b-021`…) e rejeitado com base em evidência positiva de portabilidade/intenção:

1. `src/store/slices/ssh.ts:1` e `src/shared/execution-host-registry.ts:1` dizem literalmente *"Orca port buffer; typecheck when this subsystem is wired"* — o subsistema está **planejado** para ser ligado, não descartado por arquitetura.
2. `src/shared/execution-host.ts` (sem `@ts-nocheck`) modela `ssh:<targetId>` e `runtime:<environmentId>` como execution hosts de primeira classe, e `src/components/sidebar/folder-workspace-host-id.ts:20` já os produz — não há impedimento de plataforma (Tauri v2 + Rust pode falar SSH/RPC).
3. `src-tauri/src/catalog.rs:71` declara os campos remotos/SSH ausentes "até terem função" — é **falta de implementação**, não decisão de produto.
4. O pareamento existente (`get_pairing_qr`, `PairingModal.tsx:67`) é Mobile Companion (supervisão), não substitui host de execução remota.

Marcar como `not-applicable` esconderia lacunas reais de paridade. Se o produto Hydra decidir formalmente ser local-only, estas linhas podem
migrar para `not-applicable`/`out-of-scope` por decisão explícita, o que **não** é o caso hoje no repositório.

## 3. Veredito por linha

| id | capability (resumo) | status | evidência Hydra (âncora de ausência/port buffer) |
|---|---|---|---|
| D02b-001 | Controle de abertura, retenção de modo e ciclo de vida do dialog de adição de host remoto | `missing` | `src/i18n/locales/en.json:6158`; `src/store/index.ts:432`; `src/store/slices/ssh.ts:1`; `src/App.tsx:3911` |
| D02b-002 | Renderização do formulário e campos de configuração de host SSH manual | `missing` | `src/i18n/locales/en.json:6158`; `src/shared/ssh-types.ts:12`; `src/store/slices/ssh.ts:1` |
| D02b-003 | Validação e salvamento de novo host SSH manual | `missing` | `src/i18n/locales/en.json:6158`; `src/store/slices/ssh.ts:139`; `src/App.tsx:3911` |
| D02b-004 | Picker de hosts SSH de ~/.ssh/config com busca com debounce, paginação e tratamento de erros | `missing` | `src/i18n/locales/en.json:6158`; `src/store/slices/ssh.ts:1` |
| D02b-005 | Resolução individual e preenchimento automático do formulário a partir de host do ~/.ssh/config | `missing` | `src/i18n/locales/en.json:6158`; `src/store/slices/ssh.ts:1` |
| D02b-006 | Diferenciação visual e tratamento de hosts já existentes e tombstoned no picker SSH | `missing` | `src/i18n/locales/en.json:6158`; `src/store/slices/ssh.ts:53`; `src/store/slices/ssh.ts:1` |
| D02b-007 | Importação em massa de novos hosts do ~/.ssh/config sem re-adotar aliases deletados | `missing` | `src/i18n/locales/en.json:6158`; `src/store/slices/ssh.ts:139` |
| D02b-008 | Renderização do painel e formulário de pareamento de servidor remoto Orca Server | `missing` | `src/i18n/locales/en.json:6158`; `src/components/PairingModal.tsx:67`; `src/App.tsx:3911` |
| D02b-009 | Validação de link de acesso de servidor remoto e proteção contra endereços loopback | `missing` | `src/i18n/locales/en.json:6158`; `src/components/PairingModal.tsx:67` |
| D02b-010 | Verificação, pareamento e salvamento de servidor remoto Orca Server | `missing` | `src/i18n/locales/en.json:6158`; `src/store/index.ts:428`; `src/store/index.ts:463`; `src/App.tsx:3911` |
| D02b-011 | Menu de ações de cabeçalho de seção de host — Trigger, acessibilidade e alerta de incompatib… | `missing` | `src/components/sidebar/host-section-rows.ts:166`; `src/components/sidebar/host-section-rows.ts:290`; `src/components/sidebar/rendered-sidebar-worktree-order.ts:93`; `src/components/sidebar/WorktreeList.tsx:5`; `src/i18n/locales/en.json:6036` |
| D02b-012 | Menu de ações de cabeçalho de seção de host — Ações de conexão SSH e checagem de runtime | `missing` | `src/components/sidebar/host-section-rows.ts:166`; `src/App.tsx:3911`; `src/i18n/locales/en.json:6036` |
| D02b-013 | Navegação para gerenciamento de host em configurações a partir do menu de cabeçalho | `missing` | `src/components/sidebar/host-section-rows.ts:166`; `src/components/sidebar/rendered-sidebar-worktree-order.ts:93`; `src/components/sidebar/sidebar-host-options.ts:20`; `src/i18n/locales/en.json:6036` |
| D02b-014 | Dialog de renomeação local de host | `missing` | `src/i18n/locales/en.json:6028`; `src/components/sidebar/WorktreeTitleInlineRename.tsx:1` |
| D02b-015 | Resolução de remoção de host e comportamento diferenciado por tipo de host | `missing` | `src/i18n/locales/en.json:6009`; `src/i18n/locales/en.json:6227`; `src/components/sidebar/host-section-rows.ts:166` |
| D02b-016 | Dialog de remoção de host SSH — Contagem de workspaces e descrições contextuais | `missing` | `src/i18n/locales/en.json:6009`; `src/components/sidebar/host-section-rows.ts:166` |
| D02b-017 | Dialog de remoção de host SSH — Opção avançada de deleção de workspaces associados | `missing` | `src/i18n/locales/en.json:6009`; `src/components/status-bar/SshTargetStatusRow.tsx:4` |
| D02b-018 | Execução da remoção de host SSH, limpeza de workspaces em cascata e purga de preferências | `missing` | `src/i18n/locales/en.json:6009`; `src/store/slices/ssh.ts:158`; `src/App.tsx:3911` |
| D02b-019 | Classificação de resolução de exclusão e esquecimento de workspaces em hosts SSH | `missing` | `src/i18n/locales/en.json:6227`; `src/store/slices/ssh.ts:1` |
| D02b-020 | Dialog de esquecimento de workspace em host SSH desconectado ou fantasma | `missing` | `src/i18n/locales/en.json:6227`; `src/i18n/locales/en.json:6009` |
| D02b-021 | Linha de seleção de target SSH com indicador de status e conexão inline no wizard | `missing` | `src/i18n/locales/en.json:5515`; `src/components/sidebar/AddRepoDialog.tsx:21`; `src/components/sidebar/AddRepoDialog.tsx:3` |
| D02b-022 | Carregamento, cache e resolução de home no navegador de arquivos remoto | `missing` | `src/i18n/locales/en.json:5276`; `src/components/sidebar/AddRepoDialog.tsx:3` |
| D02b-023 | Barra de breadcrumbs com navegação por segmentos de diretório remoto e suporte a drives | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-024 | Listagem de entradas remotas com ícones tipados, clique simples, duplo clique e hint de arquivo | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-025 | Estados vazios, indicadores de carregamento, erros e confirmação de seleção de diretório no… | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-026 | Alternância automática entre filtragem local e modo de digitação de caminho remoto (Path Mode) | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-027 | Resolução passo a passo de segmentos de caminho remoto com suporte a correspondência exata,… | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-028 | Proteções de segurança, limites de tamanho de busca, rejeição de caracteres de controle e re… | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-029 | Navegação por teclado no input do file browser (Enter, Escape e Backspace) | `missing` | `src/i18n/locales/en.json:5276` |
| D02b-030 | Suporte a unidades de disco e caminhos do Windows (Win32 Drives) no remote file browser | `missing` | `src/i18n/locales/en.json:5276` |

## 4. Obrigações de cobertura (entrada → id do veredito)

Cada entrada do `coverage` do `.orca.json` é mapeada ao id do veredito correspondente no `.diff.json`.
Contagens: **files 26/26**, **symbols 73/73**, **tests 128/128**, **labels 48/48**, **hotkeys 4/4**, **prefs 0/0**, **timers 10/10**, **subscriptions 3/3**, **preload 11/11**.

### files — 26/26

| entrada | id / justificativa |
|---|---|
| `AddRemoteHostDialog.tsx` | `D02b-001, D02b-003, D02b-004, D02b-005, D02b-007, D02b-009, D02b-010` |
| `AddRemoteHostFields.tsx` | `D02b-002, D02b-008, D02b-009` |
| `AddRemoteHostServerFormPanel.tsx` | `D02b-008` |
| `AddRemoteHostSshConfigPicker.tsx` | `D02b-004, D02b-005, D02b-006, D02b-007` |
| `AddRemoteHostSshFormPanel.tsx` | `D02b-002` |
| `ForgetSshWorkspaceDialog.tsx` | `D02b-020` |
| `HostRemoveDialog.tsx` | `D02b-015, D02b-016, D02b-017, D02b-018` |
| `HostRenameDialog.tsx` | `D02b-014` |
| `HostSectionHeaderMenu.tsx` | `D02b-011, D02b-012, D02b-013` |
| `RemoteFileBrowser.tsx` | `D02b-022, D02b-024, D02b-025, D02b-026, D02b-028, D02b-030` |
| `RemoteFileBrowserBreadcrumbs.tsx` | `D02b-023` |
| `RemoteFileBrowserEntryList.tsx` | `D02b-024, D02b-025` |
| `SshTargetRow.tsx` | `D02b-021` |
| `add-remote-host-ssh-actions.ts` | `D02b-003, D02b-004, D02b-005, D02b-007` |
| `host-header-menu-items.ts` | `D02b-011, D02b-012, D02b-013, D02b-015` |
| `host-rename-remove.ts` | `D02b-014, D02b-015` |
| `remote-file-browser-drive-paths.ts` | `D02b-023, D02b-030` |
| `remote-file-browser-helpers.ts` | `D02b-026, D02b-027, D02b-028, D02b-029, D02b-030` |
| `remote-file-browser-path-preview-resolver.ts` | `D02b-027` |
| `ssh-host-remove-resolution.ts` | `D02b-016` |
| `ssh-host-remove-workspaces.ts` | `D02b-018` |
| `ssh-target-duplicate.ts` | `D02b-003` |
| `ssh-workspace-forget-resolution.ts` | `D02b-019` |
| `use-remote-file-browser-filter-key-commands.ts` | `D02b-029` |
| `use-remote-file-browser-listing.ts` | `D02b-022` |
| `use-remote-file-browser-path-preview.ts` | `D02b-026, D02b-027, D02b-028` |

### symbols — 73/73

| entrada | id / justificativa |
|---|---|
| `AddRemoteHostMode` | `D02b-001` |
| `AddRemoteHostDialog` | `D02b-001, D02b-003, D02b-004, D02b-005, D02b-007, D02b-009, D02b-010` |
| `SshHostFields` | `D02b-002` |
| `RemoteServerFields` | `D02b-008, D02b-009` |
| `AddRemoteHostServerFormPanel` | `D02b-008` |
| `AddRemoteHostSshConfigPicker` | `D02b-004, D02b-005, D02b-006, D02b-007` |
| `AddRemoteHostSshFormPanel` | `D02b-002` |
| `ForgetSshWorkspaceDialog` | `D02b-020` |
| `HostRemoveDialog` | `D02b-015, D02b-016, D02b-017, D02b-018` |
| `HostRenameDialog` | `D02b-014` |
| `HostSectionHeaderMenu` | `D02b-011, D02b-012, D02b-013` |
| `RemoteFileBrowser` | `D02b-022, D02b-024, D02b-025, D02b-026, D02b-028, D02b-030` |
| `RemoteFileBrowserBreadcrumbs` | `D02b-023` |
| `RemoteFileBrowserEntryList` | `D02b-024, D02b-025` |
| `SshTargetRow` | `D02b-021` |
| `saveNewSshHostFromForm` | `D02b-003` |
| `prefillFormFromSshConfigHost` | `D02b-005` |
| `addAllSshConfigHostsToOrca` | `D02b-007` |
| `loadSshConfigHostsForPicker` | `D02b-004` |
| `HostHeaderMenuAction` | `D02b-011, D02b-012, D02b-013, D02b-015` |
| `HostHeaderMenuModel` | `D02b-011` |
| `HostHeaderMenuInput` | `D02b-011` |
| `buildHostHeaderMenuModel` | `D02b-011, D02b-012, D02b-013, D02b-015` |
| `getHostDisplayLabelOverride` | `D02b-014` |
| `applyHostRename` | `D02b-014` |
| `clearHostRename` | `D02b-014, D02b-018` |
| `HostRemovalTarget` | `D02b-015` |
| `resolveHostRemoval` | `D02b-015` |
| `BrowsePathParts` | `D02b-023, D02b-030` |
| `isDrivePath` | `D02b-030` |
| `isDriveRoot` | `D02b-030` |
| `driveRootOf` | `D02b-030` |
| `splitBrowsePath` | `D02b-023, D02b-030` |
| `joinDrivePath` | `D02b-030` |
| `parentOfDrivePath` | `D02b-030` |
| `driveBreadcrumbPath` | `D02b-023` |
| `DirEntry` | `D02b-022, D02b-024` |
| `REMOTE_FILE_BROWSER_FILTER_QUERY_MAX_BYTES` | `D02b-028` |
| `isRemoteFileBrowserFilterQueryTooLarge` | `D02b-028` |
| `filterEntries` | `D02b-026` |
| `EnterAction` | `D02b-029` |
| `decideEnterAction` | `D02b-029` |
| `EscAction` | `D02b-029` |
| `decideEscAction` | `D02b-029` |
| `joinPath` | `D02b-030` |
| `parentPath` | `D02b-030` |
| `ParsedInput` | `D02b-026` |
| `isPathMode` | `D02b-026` |
| `isRemoteFileBrowserPathResolveTextTooLarge` | `D02b-028` |
| `shouldDeferRemoteFileBrowserPasteResolve` | `D02b-028` |
| `parsePathInput` | `D02b-026` |
| `SegmentOutcome` | `D02b-027` |
| `resolveSegmentStep` | `D02b-027` |
| `PreviewState` | `D02b-027` |
| `ResolvePathInputArgs` | `D02b-027` |
| `resolvePathInput` | `D02b-027` |
| `committedPrefix` | `D02b-026` |
| `SshHostRemoveResolution` | `D02b-016` |
| `resolveSshHostRemoval` | `D02b-016` |
| `ClearSshHostWorkspacesResult` | `D02b-018` |
| `clearSshHostWorkspaces` | `D02b-018` |
| `isDuplicateSshTargetAlias` | `D02b-003` |
| `SshWorkspaceForgetResolution` | `D02b-019` |
| `resolveSshWorkspaceForget` | `D02b-019` |
| `RemoteFileBrowserFilterKeyCommandsArgs` | `D02b-029` |
| `useRemoteFileBrowserFilterKeyCommands` | `D02b-029` |
| `BrowseResult` | `D02b-022` |
| `FetchListing` | `D02b-022` |
| `RemoteFileBrowserListing` | `D02b-022` |
| `useRemoteFileBrowserListing` | `D02b-022` |
| `RemoteFileBrowserPathPreviewArgs` | `D02b-026` |
| `RemoteFileBrowserPathPreview` | `D02b-026` |
| `useRemoteFileBrowserPathPreview` | `D02b-026` |

### tests — 128/128

| entrada | id / justificativa |
|---|---|
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:99 :: SSH config picker host selection` | `INFRA: describe suite header for SSH config picker host selection` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:100 :: drops a resolve that lands after the user backs out of the picker` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:114 :: keeps the host the user settled on when an earlier resolve lands late` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:140 :: freezes the other rows while a pick is resolving` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:157 :: SSH config picker tombstoned hosts` | `INFRA: describe suite header for SSH config picker tombstoned hosts` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:158 :: keeps a previously removed host pickable while an adopted one stays disabled` | `D02b-006` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:178 :: never claims the config is empty when every host is only tombstoned` | `D02b-004` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:191 :: still shows the empty state when the config really has no hosts` | `D02b-004` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:201 :: SSH config picker bulk add` | `INFRA: describe suite header for SSH config picker bulk add` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:202 :: adds only new hosts and never re-adopts deleted aliases` | `D02b-007` |
| `components/sidebar/AddRemoteHostFields.test.tsx:17 :: RemoteServerFields` | `INFRA: describe suite header for RemoteServerFields` |
| `components/sidebar/AddRemoteHostFields.test.tsx:18 :: associates blocked loopback guidance with the access-link input` | `D02b-009` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:69 :: RemoteFileBrowser paste-sized input` | `INFRA: describe suite header for RemoteFileBrowser paste-sized input` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:95 :: still debounces and resolves ordinary path-mode input` | `D02b-028` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:111 :: navigates a typed Windows drive root and renders its breadcrumb` | `D02b-030` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:133 :: keeps a drive-shaped POSIX directory as an ordinary filtered row` | `D02b-030` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:149 :: does not parse or remotely resolve oversized slash-containing paste text` | `D02b-028` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:22 :: individual SSH config host selection` | `INFRA: describe suite header for individual SSH config host selection` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:27 :: saves effective values while leaving all config identities authoritative` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:89 :: manual SSH host label fallback` | `INFRA: describe suite header for manual SSH host label fallback` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:94 :: labels a bare host with its hostname instead of an empty string` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:120 :: bulk add of ~/.ssh/config hosts` | `INFRA: describe suite header for bulk add of ~/.ssh/config hosts` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:127 :: imports without re-adopting deleted aliases` | `D02b-007` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:152 :: reports already-synced without clearing tombstones` | `D02b-007` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:172 :: SSH config picker response admission` | `INFRA: describe suite header for SSH config picker response admission` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:173 :: accepts the legacy preload array without exposing an unbounded row list` | `D02b-004` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:197 :: explains when a live renderer still has the older preload API` | `D02b-005` |
| `components/sidebar/host-header-menu-items.test.ts:4 :: buildHostHeaderMenuModel` | `INFRA: describe suite header for buildHostHeaderMenuModel` |
| `components/sidebar/host-header-menu-items.test.ts:5 :: offers Focus + Rename + Manage for the local host (no Remove)` | `D02b-013` |
| `components/sidebar/host-header-menu-items.test.ts:12 :: offers Reconnect + Remove for a disconnected SSH host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:21 :: offers Disconnect + Remove for a connected SSH host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:30 :: offers Check connection + Remove for a runtime host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:35 :: offers Rename for every host kind` | `D02b-014` |
| `components/sidebar/host-header-menu-items.test.ts:41 :: offers Remove only for ssh and runtime hosts` | `D02b-015` |
| `components/sidebar/host-header-menu-items.test.ts:53 :: surfaces a server-too-old block for a blocked runtime host` | `D02b-011` |
| `components/sidebar/host-header-menu-items.test.ts:69 :: surfaces a client-too-old block per verdict reason` | `D02b-011` |
| `components/sidebar/host-header-menu-items.test.ts:84 :: does not surface a block when health is not blocked` | `D02b-011` |
| `components/sidebar/host-rename-remove.test.ts:9 :: host rename helpers` | `INFRA: describe suite header for host rename helpers` |
| `components/sidebar/host-rename-remove.test.ts:10 :: reads the current display-label override` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:16 :: applies a rename` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:22 :: clears the override when renamed to blank` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:27 :: resets a rename to the derived label` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:39 :: resolveHostRemoval` | `INFRA: describe suite header for resolveHostRemoval` |
| `components/sidebar/host-rename-remove.test.ts:40 :: resolves an ssh host to its target id` | `D02b-015` |
| `components/sidebar/host-rename-remove.test.ts:44 :: resolves a runtime host to its environment id` | `D02b-015` |
| `components/sidebar/host-rename-remove.test.ts:51 :: returns null for the local host` | `D02b-015` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:12 :: isDrivePath` | `INFRA: describe suite header for isDrivePath` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:13 :: accepts drive anchors with either separator, bare colon, and any case` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:20 :: rejects POSIX paths and ordinary filter text` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:28 :: driveRootOf / isDriveRoot` | `INFRA: describe suite header for driveRootOf / isDriveRoot` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:29 :: normalizes any drive anchor to an uppercase backslash root` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:34 :: treats M:, M:\\ and M:/ as roots but not deeper paths` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:42 :: splitBrowsePath` | `INFRA: describe suite header for splitBrowsePath` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:43 :: splits drive paths on either separator` | `D02b-023` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:56 :: keeps POSIX paths in the POSIX shape` | `D02b-023` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:66 :: joinDrivePath / parentOfDrivePath` | `INFRA: describe suite header for joinDrivePath / parentOfDrivePath` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:67 :: joins with a backslash without doubling the root separator` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:72 :: walks up to the drive root and then to the host root` | `D02b-030` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:79 :: driveBreadcrumbPath` | `INFRA: describe suite header for driveBreadcrumbPath` |
| `components/sidebar/remote-file-browser-drive-paths.test.ts:80 :: rebuilds absolute paths for breadcrumb clicks` | `D02b-023` |
| `components/sidebar/remote-file-browser-helpers.test.ts:26 :: filterEntries` | `INFRA: describe suite header for filterEntries` |
| `components/sidebar/remote-file-browser-helpers.test.ts:27 :: substring-matches case-insensitively across files and folders` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:32 :: returns the full list when filter is empty or whitespace` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:37 :: rejects oversized pasted filters before reading remote entry names` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:52 :: rejects oversized whitespace before trimming remote entry filters` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:59 :: decideEnterAction` | `INFRA: describe suite header for decideEnterAction` |
| `components/sidebar/remote-file-browser-helpers.test.ts:60 :: navigates when filter matches exactly one folder (files alongside do not block)` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:65 :: is a no-op when multiple folders match` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:70 :: shows the file hint when only files match` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:75 :: is a no-op on empty filtered list` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:80 :: decideEscAction` | `INFRA: describe suite header for decideEscAction` |
| `components/sidebar/remote-file-browser-helpers.test.ts:81 :: clears a non-empty filter` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:85 :: cancels when filter is empty` | `D02b-029` |
| `components/sidebar/remote-file-browser-helpers.test.ts:90 :: parentPath` | `INFRA: describe suite header for parentPath` |
| `components/sidebar/remote-file-browser-helpers.test.ts:91 :: strips last segment` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:94 :: stays at root` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:97 :: returns root for single-segment absolute` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:102 :: isPathMode` | `INFRA: describe suite header for isPathMode` |
| `components/sidebar/remote-file-browser-helpers.test.ts:103 :: treats plain names as filter mode` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:109 :: treats any ` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:115 :: treats bare base markers as path mode` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:122 :: shouldDeferRemoteFileBrowserPasteResolve` | `INFRA: describe suite header for shouldDeferRemoteFileBrowserPasteResolve` |
| `components/sidebar/remote-file-browser-helpers.test.ts:123 :: keeps small path and filter pastes on the immediate resolver path` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:128 :: defers large text-control pastes to the chunked paste owner` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:132 :: defers multibyte paste text using bounded byte measurement` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:136 :: treats oversized slash-containing paste as too large for path resolving` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:143 :: parsePathInput` | `INFRA: describe suite header for parsePathInput` |
| `components/sidebar/remote-file-browser-helpers.test.ts:144 :: no slash stays in filter mode` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:220 :: reports repeated separators as invalid` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:228 :: preserves spaces inside segments` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:237 :: preserves leading/trailing spaces in the full input` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:250 :: resolveSegmentStep` | `INFRA: describe suite header for resolveSegmentStep` |
| `components/sidebar/remote-file-browser-helpers.test.ts:258 :: exact directory match descends` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:265 :: unique prefix descends` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:272 :: ambiguous prefix errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:280 :: missing segment errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:285 :: exact file match reports not-a-directory instead of prefix-descending` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:303 :: case-insensitive exact match descends when no case-sensitive match exists` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:310 :: case-insensitive unique prefix descends` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:317 :: case-sensitive exact match wins over a case-insensitive peer` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:332 :: case-insensitive ambiguous prefix errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:341 :: Windows drive paths` | `INFRA: describe suite header for Windows drive paths` |
| `components/sidebar/remote-file-browser-helpers.test.ts:342 :: isPathMode triggers on drive-anchored input` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:351 :: keeps drive-shaped POSIX names in filter and child-path semantics` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:358 :: parsePathInput anchors drive input at the normalized drive root` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:382 :: parsePathInput rejects repeated separators in drive input, either kind` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:392 :: joinPath treats drive rows in the host-root listing as absolute` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:397 :: joinPath appends with a backslash inside a drive` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:402 :: parentPath climbs drive paths and exits to the host root` | `D02b-030` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:9 :: resolveSshHostRemoval` | `INFRA: describe suite header for resolveSshHostRemoval` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:22 :: collects non-main worktrees and root repos on the target` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:38 :: ignores repos and worktrees on other hosts` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:49 :: reports connected when the target relay is connected` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:59 :: reports zero workspaces for a target nothing points at` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:70 :: dedupes duplicate repo and worktree rows so the count is not inflated` | `D02b-016` |
| `components/sidebar/ssh-target-duplicate.test.ts:4 :: isDuplicateSshTargetAlias` | `INFRA: describe suite header for isDuplicateSshTargetAlias` |
| `components/sidebar/ssh-target-duplicate.test.ts:5 :: matches by configHost alias` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:16 :: matches by label when configHost is empty` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:27 :: matches case-only alias variants like the config picker does` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:40 :: matches an existing label even when that target has a different configHost` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:51 :: returns false for a new alias` | `D02b-003` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:16 :: resolveSshWorkspaceForget` | `INFRA: describe suite header for resolveSshWorkspaceForget` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:17 :: returns not-ssh for a repo with no connectionId` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:26 :: returns not-ssh for a runtime-owned target` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:35 :: returns ghost when the target is no longer configured` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:44 :: returns connected when the configured target is connected` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:53 :: returns disconnected when configured but not connected` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:62 :: defaults to disconnected status when configured target has no live state` | `D02b-019` |

### labels — 48/48

| entrada | id / justificativa |
|---|---|
| `components/sidebar/AddRemoteHostFields.tsx:49 :: onChange={(event) => onFormChange((draft) => ({ ...draft, label: event.target.value }))}` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:50 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:67 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:84 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:102 :: placeholder="22"` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:116 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:189 :: placeholder={translate(` | `D02b-008` |
| `components/sidebar/AddRemoteHostFields.tsx:206 :: placeholder={translate(` | `D02b-008` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:90 :: placeholder={translate(` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:96 :: aria-label={translate(` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:156 :: aria-label={translate(` | `D02b-004` |
| `components/sidebar/HostRemoveDialog.tsx:30 :: label: string` | `D02b-016` |
| `components/sidebar/HostRenameDialog.tsx:78 :: placeholder={derivedLabel}` | `D02b-014` |
| `components/sidebar/HostSectionHeaderMenu.tsx:18 :: DropdownMenuItem,` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:23 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:186 :: aria-label={translate(` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:213 :: <DropdownMenuItem` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:219 :: </DropdownMenuItem>` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:232 :: <DropdownMenuItem onSelect={() => setRenameOpen(true)}>` | `D02b-014` |
| `components/sidebar/HostSectionHeaderMenu.tsx:235 :: </DropdownMenuItem>` | `D02b-014` |
| `components/sidebar/HostSectionHeaderMenu.tsx:238 :: <DropdownMenuItem onSelect={() => void runSshAction('connect')}>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:241 :: </DropdownMenuItem>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:244 :: <DropdownMenuItem onSelect={() => void runSshAction('disconnect')}>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:247 :: </DropdownMenuItem>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:250 :: <DropdownMenuItem onSelect={() => void handleCheckConnection()}>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:256 :: </DropdownMenuItem>` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:259 :: <DropdownMenuItem onSelect={handleManage}>` | `D02b-013` |
| `components/sidebar/HostSectionHeaderMenu.tsx:262 :: </DropdownMenuItem>` | `D02b-013` |
| `components/sidebar/HostSectionHeaderMenu.tsx:266 :: <DropdownMenuItem` | `D02b-015` |
| `components/sidebar/HostSectionHeaderMenu.tsx:275 :: </DropdownMenuItem>` | `D02b-015` |
| `components/sidebar/RemoteFileBrowser.tsx:256 :: placeholder={translate(` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:299 :: title={fileHint ? undefined : resolvedPath}` | `D02b-025` |
| `components/sidebar/RemoteFileBrowser.tsx:318 :: title={resolvedPath}` | `D02b-025` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:77 :: label: 'prod',` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:129 :: targets: [{ id: 'ssh-1', label: 'prod', host: 'prod', port: 22, username: '' }],` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.ts:87 :: label: form.label.trim() \|\| (username ? `${username}@${host}` : configHost \|\| host),` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.ts:106 :: label: target.label,` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:8 :: existingTargets: [{ configHost: 'staging', label: 'Staging', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:10 :: label: 'Staging box',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:19 :: existingTargets: [{ label: 'prod-box', host: 'prod-box' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:21 :: label: 'prod-box',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:30 :: existingTargets: [{ configHost: 'Staging', label: 'Staging', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:32 :: label: 'staging',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:43 :: existingTargets: [{ configHost: 'box1', label: 'prod', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:45 :: label: 'Prod',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:54 :: existingTargets: [{ configHost: 'staging', label: 'staging', host: 's.example' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:56 :: label: 'prod',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.ts:13 :: label: string` | `D02b-003` |

### hotkeys — 4/4

| entrada | id / justificativa |
|---|---|
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:121 :: input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` | `D02b-030` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:1 :: import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'` | `D02b-029` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:43 :: }: RemoteFileBrowserFilterKeyCommandsArgs): (e: KeyboardEvent<HTMLInputElement>) => void {` | `D02b-029` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:45 :: (e: KeyboardEvent<HTMLInputElement>) => {` | `D02b-029` |

### prefs — 0/0

`N/A: o index.json do domínio não possui entradas nesta categoria.`

### timers — 10/10

| entrada | id / justificativa |
|---|---|
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:46 :: const queryTimer = useRef<ReturnType<typeof setTimeout> \| null>(null)` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:88 :: queryTimer.current = setTimeout(() => onQueryChange(value), 200)` | `D02b-004` |
| `components/sidebar/RemoteFileBrowser.tsx:43 :: const fileHintTimerRef = useRef<ReturnType<typeof setTimeout> \| null>(null)` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:44 :: const clickTimerRef = useRef<ReturnType<typeof setTimeout> \| null>(null)` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:163 :: fileHintTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:186 :: clickTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:60 :: const debounceTimerRef = useRef<ReturnType<typeof setTimeout> \| null>(null)` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:62 :: const pasteResolveTimerRef = useRef<ReturnType<typeof setTimeout> \| null>(null)` | `D02b-028` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:165 :: debounceTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:185 :: pasteResolveTimerRef.current = setTimeout(() => {` | `D02b-028` |

### subscriptions — 3/3

| entrada | id / justificativa |
|---|---|
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:47 :: useEffect(` | `D02b-004` |
| `components/sidebar/HostRenameDialog.tsx:39 :: useEffect(() => {` | `D02b-014` |
| `components/sidebar/RemoteFileBrowser.tsx:138 :: useEffect(() => {` | `D02b-022` |

### preload — 11/11

| entrada | id / justificativa |
|---|---|
| `components/sidebar/AddRemoteHostDialog.tsx:114 :: ssh: window.api.ssh,` | `D02b-001` |
| `components/sidebar/AddRemoteHostDialog.tsx:134 :: const result = await loadSshConfigHostsForPicker(window.api.ssh, {` | `D02b-004` |
| `components/sidebar/AddRemoteHostDialog.tsx:172 :: resolved = await prefillFormFromSshConfigHost(host, window.api.ssh)` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.tsx:220 :: ssh: window.api.ssh,` | `D02b-001` |
| `components/sidebar/AddRemoteHostDialog.tsx:268 :: const result = await window.api.runtimeEnvironments.verifyAndAddFromPairingCode({` | `D02b-010` |
| `components/sidebar/AddRemoteHostDialog.tsx:284 :: const environments = await window.api.runtimeEnvironments.list()` | `D02b-010` |
| `components/sidebar/ForgetSshWorkspaceDialog.tsx:78 :: await window.api.ssh.connect({ targetId: resolution.targetId })` | `D02b-020` |
| `components/sidebar/HostRemoveDialog.tsx:81 :: await removeSshTargetWithBestEffortCleanup(window.api.ssh, targetId)` | `D02b-018` |
| `components/sidebar/HostSectionHeaderMenu.tsx:106 :: await window.api.ssh[action]({ targetId: parsed.targetId })` | `D02b-012` |
| `components/sidebar/HostSectionHeaderMenu.tsx:140 :: const response = await window.api.runtimeEnvironments.getStatus({` | `D02b-012` |
| `components/sidebar/use-remote-file-browser-listing.ts:35 :: ? await window.api.ssh.browseDir({ targetId, dirPath })` | `D02b-022` |

## 5. Justificativas `INFRA:`/`N/A:`/`DUP:`

- `tests`: 29 entradas `INFRA:` — cabeçalhos `describe` de suíte (não são casos de teste executáveis); todas as demais 99 mapeiam para um id.
- `prefs`: 0 entradas — `N/A: o index.json do domínio não registra preferências persistidas para este módulo.`
- Nenhuma entrada `N/A:`/`DUP:` nos demais blocos (a cobertura é 100% mapeada a ids de veredito).

## 6. Log de busca negativo (Hydra)

Buscas executadas (fonte `/home/renan/orca/workspaces/hydra/ondine`), com resultado:

```
grep -rl --include=*.ts --include=*.tsx 'AddRemoteHostDialog' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'AddRemoteHostFields' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'AddRemoteHostSshConfigPicker' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'AddRemoteHostServerFormPanel' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'HostSectionHeaderMenu' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'HostRemoveDialog' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'HostRenameDialog' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'ForgetSshWorkspaceDialog' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'RemoteFileBrowser' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'RemoteFileBrowserEntryList' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'RemoteFileBrowserBreadcrumbs' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'SshTargetRow' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'buildHostHeaderMenuModel' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'resolveHostRemoval' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'resolveSshHostRemoval' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'resolveSshWorkspaceForget' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'applyHostRename' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'clearSshHostWorkspaces' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'prefillFormFromSshConfigHost' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'saveNewSshHostFromForm' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'addAllSshConfigHostsToOrca' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'loadSshConfigHostsForPicker' src   => 0 fora de src/i18n/**
grep -rl --include=*.ts --include=*.tsx 'isDuplicateSshTargetAlias' src   => 0 fora de src/i18n/**
grep -rn -i 'ssh' src-tauri/src/lib.rs                       => 0 comandos
grep -rn -i 'ssh' src-tauri/src/{catalog,db}.rs               => catalog.rs:71 (comentário), db.rs:193 (status bar item)
grep -rn 'listConfigHosts' src src-tauri      => 0
grep -rn 'resolveConfigHost' src src-tauri     => 0
grep -rn 'verifyAndAddFromPairingCode' src src-tauri => 0
grep -rn 'browseDir' src src-tauri             => 0
grep -rn 'addTarget' src src-tauri             => 0
grep -rn 'removeTarget' src src-tauri          => 0
grep -rn 'listTargets' src src-tauri           => 0 em produção (só fixtures de teste src/hooks/**)
grep -rn 'importConfig' src src-tauri          => 1 comentário (src/store/repos/repo-catalog-actions.ts:50)
grep -rn 'HostSectionHeaderMenu|HostRemoveDialog|HostRenameDialog|ForgetSshWorkspaceDialog' src .tsx => 0 (só namespaces em src/i18n/locales/en.json)
grep -rn 'addHostSectionRows' src/components/sidebar          => host-section-rows.ts:166 + rendered-sidebar-worktree-order.ts:93
grep -rn 'ssh' src/components/sidebar/** (prod)               => nenhum símbolo SSH funcional
```

## 7. Cross-walk PAR

A spec `70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md` **não possui item `PAR-*` de hosts/SSH/remote file browser**
(busca por `ssh|remote|host|server|servidor` no arquivo = 0). Portanto `par: []` em todas as 30 linhas e nenhuma entrada de crosswalk para este domínio.
