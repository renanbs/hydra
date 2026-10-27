# Parede de Evidência — Domínio D02b-hosts-ssh-remote (Hosts Remotos, SSH e Remote File Browser)

## Contagens de Cobertura
- **arquivos**: 26/26 (100%)
- **símbolos**: 73/73 (100%)
- **testes**: 128/128 (100%)
- **labels**: 48/48 (100%)
- **hotkeys**: 4/4 (100%)
- **prefs**: 0/0 (100%)
- **timers**: 10/10 (100%)
- **subs**: 3/3 (100%)
- **preload**: 11/11 (100%)

---

## Itens com Justificativa Especial (INFRA / N/A / DUP)

| Categoria | Entrada | Justificativa |
|---|---|---|
| tests | `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:99 :: SSH config picker host selection` | `INFRA: describe suite header for SSH config picker host selection` |
| tests | `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:157 :: SSH config picker tombstoned hosts` | `INFRA: describe suite header for SSH config picker tombstoned hosts` |
| tests | `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:201 :: SSH config picker bulk add` | `INFRA: describe suite header for SSH config picker bulk add` |
| tests | `components/sidebar/AddRemoteHostFields.test.tsx:17 :: RemoteServerFields` | `INFRA: describe suite header for RemoteServerFields` |
| tests | `components/sidebar/RemoteFileBrowser.paste.test.tsx:69 :: RemoteFileBrowser paste-sized input` | `INFRA: describe suite header for RemoteFileBrowser paste-sized input` |
| tests | `components/sidebar/add-remote-host-ssh-actions.test.ts:22 :: individual SSH config host selection` | `INFRA: describe suite header for individual SSH config host selection` |
| tests | `components/sidebar/add-remote-host-ssh-actions.test.ts:89 :: manual SSH host label fallback` | `INFRA: describe suite header for manual SSH host label fallback` |
| tests | `components/sidebar/add-remote-host-ssh-actions.test.ts:120 :: bulk add of ~/.ssh/config hosts` | `INFRA: describe suite header for bulk add of ~/.ssh/config hosts` |
| tests | `components/sidebar/add-remote-host-ssh-actions.test.ts:172 :: SSH config picker response admission` | `INFRA: describe suite header for SSH config picker response admission` |
| tests | `components/sidebar/host-header-menu-items.test.ts:4 :: buildHostHeaderMenuModel` | `INFRA: describe suite header for buildHostHeaderMenuModel` |
| tests | `components/sidebar/host-rename-remove.test.ts:9 :: host rename helpers` | `INFRA: describe suite header for host rename helpers` |
| tests | `components/sidebar/host-rename-remove.test.ts:39 :: resolveHostRemoval` | `INFRA: describe suite header for resolveHostRemoval` |
| tests | `components/sidebar/remote-file-browser-drive-paths.test.ts:12 :: isDrivePath` | `INFRA: describe suite header for isDrivePath` |
| tests | `components/sidebar/remote-file-browser-drive-paths.test.ts:28 :: driveRootOf / isDriveRoot` | `INFRA: describe suite header for driveRootOf / isDriveRoot` |
| tests | `components/sidebar/remote-file-browser-drive-paths.test.ts:42 :: splitBrowsePath` | `INFRA: describe suite header for splitBrowsePath` |
| tests | `components/sidebar/remote-file-browser-drive-paths.test.ts:66 :: joinDrivePath / parentOfDrivePath` | `INFRA: describe suite header for joinDrivePath / parentOfDrivePath` |
| tests | `components/sidebar/remote-file-browser-drive-paths.test.ts:79 :: driveBreadcrumbPath` | `INFRA: describe suite header for driveBreadcrumbPath` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:26 :: filterEntries` | `INFRA: describe suite header for filterEntries` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:59 :: decideEnterAction` | `INFRA: describe suite header for decideEnterAction` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:80 :: decideEscAction` | `INFRA: describe suite header for decideEscAction` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:90 :: parentPath` | `INFRA: describe suite header for parentPath` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:102 :: isPathMode` | `INFRA: describe suite header for isPathMode` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:122 :: shouldDeferRemoteFileBrowserPasteResolve` | `INFRA: describe suite header for shouldDeferRemoteFileBrowserPasteResolve` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:143 :: parsePathInput` | `INFRA: describe suite header for parsePathInput` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:250 :: resolveSegmentStep` | `INFRA: describe suite header for resolveSegmentStep` |
| tests | `components/sidebar/remote-file-browser-helpers.test.ts:341 :: Windows drive paths` | `INFRA: describe suite header for Windows drive paths` |
| tests | `components/sidebar/ssh-host-remove-resolution.test.ts:9 :: resolveSshHostRemoval` | `INFRA: describe suite header for resolveSshHostRemoval` |
| tests | `components/sidebar/ssh-target-duplicate.test.ts:4 :: isDuplicateSshTargetAlias` | `INFRA: describe suite header for isDuplicateSshTargetAlias` |
| tests | `components/sidebar/ssh-workspace-forget-resolution.test.ts:16 :: resolveSshWorkspaceForget` | `INFRA: describe suite header for resolveSshWorkspaceForget` |

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas de Inventário Associadas |
|---|---|
| `AddRemoteHostDialog.tsx` | `D02b-001`, `D02b-003`, `D02b-004`, `D02b-005`, `D02b-007`, `D02b-009`, `D02b-010` |
| `AddRemoteHostFields.tsx` | `D02b-002`, `D02b-008`, `D02b-009` |
| `AddRemoteHostServerFormPanel.tsx` | `D02b-008` |
| `AddRemoteHostSshConfigPicker.tsx` | `D02b-004`, `D02b-005`, `D02b-006`, `D02b-007` |
| `AddRemoteHostSshFormPanel.tsx` | `D02b-002` |
| `ForgetSshWorkspaceDialog.tsx` | `D02b-020` |
| `HostRemoveDialog.tsx` | `D02b-015`, `D02b-016`, `D02b-017`, `D02b-018` |
| `HostRenameDialog.tsx` | `D02b-014` |
| `HostSectionHeaderMenu.tsx` | `D02b-011`, `D02b-012`, `D02b-013` |
| `RemoteFileBrowser.tsx` | `D02b-022`, `D02b-024`, `D02b-025`, `D02b-026`, `D02b-028`, `D02b-030` |
| `RemoteFileBrowserBreadcrumbs.tsx` | `D02b-023` |
| `RemoteFileBrowserEntryList.tsx` | `D02b-024`, `D02b-025` |
| `SshTargetRow.tsx` | `D02b-021` |
| `add-remote-host-ssh-actions.ts` | `D02b-003`, `D02b-004`, `D02b-005`, `D02b-007` |
| `host-header-menu-items.ts` | `D02b-011`, `D02b-012`, `D02b-013`, `D02b-015` |
| `host-rename-remove.ts` | `D02b-014`, `D02b-015` |
| `remote-file-browser-drive-paths.ts` | `D02b-023`, `D02b-030` |
| `remote-file-browser-helpers.ts` | `D02b-026`, `D02b-027`, `D02b-028`, `D02b-029`, `D02b-030` |
| `remote-file-browser-path-preview-resolver.ts` | `D02b-027` |
| `ssh-host-remove-resolution.ts` | `D02b-016` |
| `ssh-host-remove-workspaces.ts` | `D02b-018` |
| `ssh-target-duplicate.ts` | `D02b-003` |
| `ssh-workspace-forget-resolution.ts` | `D02b-019` |
| `use-remote-file-browser-filter-key-commands.ts` | `D02b-029` |
| `use-remote-file-browser-listing.ts` | `D02b-022` |
| `use-remote-file-browser-path-preview.ts` | `D02b-026`, `D02b-027`, `D02b-028` |

---

## 2. Símbolos Exportados (`symbols`)

| Símbolo Exportado | Linhas de Inventário / Justificativa |
|---|---|
| `AddRemoteHostDialog` | `D02b-001`, `D02b-003`, `D02b-004`, `D02b-005`, `D02b-007`, `D02b-009`, `D02b-010` |
| `AddRemoteHostMode` | `D02b-001` |
| `AddRemoteHostServerFormPanel` | `D02b-008` |
| `AddRemoteHostSshConfigPicker` | `D02b-004`, `D02b-005`, `D02b-006`, `D02b-007` |
| `AddRemoteHostSshFormPanel` | `D02b-002` |
| `BrowsePathParts` | `D02b-023`, `D02b-030` |
| `BrowseResult` | `D02b-022` |
| `ClearSshHostWorkspacesResult` | `D02b-018` |
| `DirEntry` | `D02b-022`, `D02b-024` |
| `EnterAction` | `D02b-029` |
| `EscAction` | `D02b-029` |
| `FetchListing` | `D02b-022` |
| `ForgetSshWorkspaceDialog` | `D02b-020` |
| `HostHeaderMenuAction` | `D02b-011`, `D02b-012`, `D02b-013`, `D02b-015` |
| `HostHeaderMenuInput` | `D02b-011` |
| `HostHeaderMenuModel` | `D02b-011` |
| `HostRemovalTarget` | `D02b-015` |
| `HostRemoveDialog` | `D02b-015`, `D02b-016`, `D02b-017`, `D02b-018` |
| `HostRenameDialog` | `D02b-014` |
| `HostSectionHeaderMenu` | `D02b-011`, `D02b-012`, `D02b-013` |
| `ParsedInput` | `D02b-026` |
| `PreviewState` | `D02b-027` |
| `REMOTE_FILE_BROWSER_FILTER_QUERY_MAX_BYTES` | `D02b-028` |
| `RemoteFileBrowser` | `D02b-022`, `D02b-024`, `D02b-025`, `D02b-026`, `D02b-028`, `D02b-030` |
| `RemoteFileBrowserBreadcrumbs` | `D02b-023` |
| `RemoteFileBrowserEntryList` | `D02b-024`, `D02b-025` |
| `RemoteFileBrowserFilterKeyCommandsArgs` | `D02b-029` |
| `RemoteFileBrowserListing` | `D02b-022` |
| `RemoteFileBrowserPathPreview` | `D02b-026` |
| `RemoteFileBrowserPathPreviewArgs` | `D02b-026` |
| `RemoteServerFields` | `D02b-008`, `D02b-009` |
| `ResolvePathInputArgs` | `D02b-027` |
| `SegmentOutcome` | `D02b-027` |
| `SshHostFields` | `D02b-002` |
| `SshHostRemoveResolution` | `D02b-016` |
| `SshTargetRow` | `D02b-021` |
| `SshWorkspaceForgetResolution` | `D02b-019` |
| `addAllSshConfigHostsToOrca` | `D02b-007` |
| `applyHostRename` | `D02b-014` |
| `buildHostHeaderMenuModel` | `D02b-011`, `D02b-012`, `D02b-013`, `D02b-015` |
| `clearHostRename` | `D02b-014`, `D02b-018` |
| `clearSshHostWorkspaces` | `D02b-018` |
| `committedPrefix` | `D02b-026` |
| `decideEnterAction` | `D02b-029` |
| `decideEscAction` | `D02b-029` |
| `driveBreadcrumbPath` | `D02b-023` |
| `driveRootOf` | `D02b-030` |
| `filterEntries` | `D02b-026` |
| `getHostDisplayLabelOverride` | `D02b-014` |
| `isDrivePath` | `D02b-030` |
| `isDriveRoot` | `D02b-030` |
| `isDuplicateSshTargetAlias` | `D02b-003` |
| `isPathMode` | `D02b-026` |
| `isRemoteFileBrowserFilterQueryTooLarge` | `D02b-028` |
| `isRemoteFileBrowserPathResolveTextTooLarge` | `D02b-028` |
| `joinDrivePath` | `D02b-030` |
| `joinPath` | `D02b-030` |
| `loadSshConfigHostsForPicker` | `D02b-004` |
| `parentOfDrivePath` | `D02b-030` |
| `parentPath` | `D02b-030` |
| `parsePathInput` | `D02b-026` |
| `prefillFormFromSshConfigHost` | `D02b-005` |
| `resolveHostRemoval` | `D02b-015` |
| `resolvePathInput` | `D02b-027` |
| `resolveSegmentStep` | `D02b-027` |
| `resolveSshHostRemoval` | `D02b-016` |
| `resolveSshWorkspaceForget` | `D02b-019` |
| `saveNewSshHostFromForm` | `D02b-003` |
| `shouldDeferRemoteFileBrowserPasteResolve` | `D02b-028` |
| `splitBrowsePath` | `D02b-023`, `D02b-030` |
| `useRemoteFileBrowserFilterKeyCommands` | `D02b-029` |
| `useRemoteFileBrowserListing` | `D02b-022` |
| `useRemoteFileBrowserPathPreview` | `D02b-026` |

---

## 3. Testes Automatizados (`tests`)

| Caso de Teste | Linha de Inventário / Justificativa |
|---|---|
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:100 :: drops a resolve that lands after the user backs out of the picker` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:114 :: keeps the host the user settled on when an earlier resolve lands late` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:140 :: freezes the other rows while a pick is resolving` | `D02b-005` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:157 :: SSH config picker tombstoned hosts` | `INFRA: describe suite header for SSH config picker tombstoned hosts` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:158 :: keeps a previously removed host pickable while an adopted one stays disabled` | `D02b-006` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:178 :: never claims the config is empty when every host is only tombstoned` | `D02b-004` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:191 :: still shows the empty state when the config really has no hosts` | `D02b-004` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:201 :: SSH config picker bulk add` | `INFRA: describe suite header for SSH config picker bulk add` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:202 :: adds only new hosts and never re-adopts deleted aliases` | `D02b-007` |
| `components/sidebar/AddRemoteHostDialog.config-picker.test.tsx:99 :: SSH config picker host selection` | `INFRA: describe suite header for SSH config picker host selection` |
| `components/sidebar/AddRemoteHostFields.test.tsx:17 :: RemoteServerFields` | `INFRA: describe suite header for RemoteServerFields` |
| `components/sidebar/AddRemoteHostFields.test.tsx:18 :: associates blocked loopback guidance with the access-link input` | `D02b-009` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:111 :: navigates a typed Windows drive root and renders its breadcrumb` | `D02b-030` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:133 :: keeps a drive-shaped POSIX directory as an ordinary filtered row` | `D02b-030` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:149 :: does not parse or remotely resolve oversized slash-containing paste text` | `D02b-028` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:69 :: RemoteFileBrowser paste-sized input` | `INFRA: describe suite header for RemoteFileBrowser paste-sized input` |
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:95 :: still debounces and resolves ordinary path-mode input` | `D02b-028` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:120 :: bulk add of ~/.ssh/config hosts` | `INFRA: describe suite header for bulk add of ~/.ssh/config hosts` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:127 :: imports without re-adopting deleted aliases` | `D02b-007` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:152 :: reports already-synced without clearing tombstones` | `D02b-007` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:172 :: SSH config picker response admission` | `INFRA: describe suite header for SSH config picker response admission` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:173 :: accepts the legacy preload array without exposing an unbounded row list` | `D02b-004` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:197 :: explains when a live renderer still has the older preload API` | `D02b-005` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:22 :: individual SSH config host selection` | `INFRA: describe suite header for individual SSH config host selection` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:27 :: saves effective values while leaving all config identities authoritative` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:89 :: manual SSH host label fallback` | `INFRA: describe suite header for manual SSH host label fallback` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:94 :: labels a bare host with its hostname instead of an empty string` | `D02b-003` |
| `components/sidebar/host-header-menu-items.test.ts:12 :: offers Reconnect + Remove for a disconnected SSH host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:21 :: offers Disconnect + Remove for a connected SSH host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:30 :: offers Check connection + Remove for a runtime host` | `D02b-012` |
| `components/sidebar/host-header-menu-items.test.ts:35 :: offers Rename for every host kind` | `D02b-014` |
| `components/sidebar/host-header-menu-items.test.ts:4 :: buildHostHeaderMenuModel` | `INFRA: describe suite header for buildHostHeaderMenuModel` |
| `components/sidebar/host-header-menu-items.test.ts:41 :: offers Remove only for ssh and runtime hosts` | `D02b-015` |
| `components/sidebar/host-header-menu-items.test.ts:5 :: offers Focus + Rename + Manage for the local host (no Remove)` | `D02b-013` |
| `components/sidebar/host-header-menu-items.test.ts:53 :: surfaces a server-too-old block for a blocked runtime host` | `D02b-011` |
| `components/sidebar/host-header-menu-items.test.ts:69 :: surfaces a client-too-old block per verdict reason` | `D02b-011` |
| `components/sidebar/host-header-menu-items.test.ts:84 :: does not surface a block when health is not blocked` | `D02b-011` |
| `components/sidebar/host-rename-remove.test.ts:10 :: reads the current display-label override` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:16 :: applies a rename` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:22 :: clears the override when renamed to blank` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:27 :: resets a rename to the derived label` | `D02b-014` |
| `components/sidebar/host-rename-remove.test.ts:39 :: resolveHostRemoval` | `INFRA: describe suite header for resolveHostRemoval` |
| `components/sidebar/host-rename-remove.test.ts:40 :: resolves an ssh host to its target id` | `D02b-015` |
| `components/sidebar/host-rename-remove.test.ts:44 :: resolves a runtime host to its environment id` | `D02b-015` |
| `components/sidebar/host-rename-remove.test.ts:51 :: returns null for the local host` | `D02b-015` |
| `components/sidebar/host-rename-remove.test.ts:9 :: host rename helpers` | `INFRA: describe suite header for host rename helpers` |
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
| `components/sidebar/remote-file-browser-helpers.test.ts:26 :: filterEntries` | `INFRA: describe suite header for filterEntries` |
| `components/sidebar/remote-file-browser-helpers.test.ts:265 :: unique prefix descends` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:27 :: substring-matches case-insensitively across files and folders` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:272 :: ambiguous prefix errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:280 :: missing segment errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:285 :: exact file match reports not-a-directory instead of prefix-descending` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:303 :: case-insensitive exact match descends when no case-sensitive match exists` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:310 :: case-insensitive unique prefix descends` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:317 :: case-sensitive exact match wins over a case-insensitive peer` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:32 :: returns the full list when filter is empty or whitespace` | `D02b-026` |
| `components/sidebar/remote-file-browser-helpers.test.ts:332 :: case-insensitive ambiguous prefix errors` | `D02b-027` |
| `components/sidebar/remote-file-browser-helpers.test.ts:341 :: Windows drive paths` | `INFRA: describe suite header for Windows drive paths` |
| `components/sidebar/remote-file-browser-helpers.test.ts:342 :: isPathMode triggers on drive-anchored input` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:351 :: keeps drive-shaped POSIX names in filter and child-path semantics` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:358 :: parsePathInput anchors drive input at the normalized drive root` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:37 :: rejects oversized pasted filters before reading remote entry names` | `D02b-028` |
| `components/sidebar/remote-file-browser-helpers.test.ts:382 :: parsePathInput rejects repeated separators in drive input, either kind` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:392 :: joinPath treats drive rows in the host-root listing as absolute` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:397 :: joinPath appends with a backslash inside a drive` | `D02b-030` |
| `components/sidebar/remote-file-browser-helpers.test.ts:402 :: parentPath climbs drive paths and exits to the host root` | `D02b-030` |
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
| `components/sidebar/ssh-host-remove-resolution.test.ts:22 :: collects non-main worktrees and root repos on the target` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:38 :: ignores repos and worktrees on other hosts` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:49 :: reports connected when the target relay is connected` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:59 :: reports zero workspaces for a target nothing points at` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:70 :: dedupes duplicate repo and worktree rows so the count is not inflated` | `D02b-016` |
| `components/sidebar/ssh-host-remove-resolution.test.ts:9 :: resolveSshHostRemoval` | `INFRA: describe suite header for resolveSshHostRemoval` |
| `components/sidebar/ssh-target-duplicate.test.ts:16 :: matches by label when configHost is empty` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:27 :: matches case-only alias variants like the config picker does` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:4 :: isDuplicateSshTargetAlias` | `INFRA: describe suite header for isDuplicateSshTargetAlias` |
| `components/sidebar/ssh-target-duplicate.test.ts:40 :: matches an existing label even when that target has a different configHost` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:5 :: matches by configHost alias` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:51 :: returns false for a new alias` | `D02b-003` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:16 :: resolveSshWorkspaceForget` | `INFRA: describe suite header for resolveSshWorkspaceForget` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:17 :: returns not-ssh for a repo with no connectionId` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:26 :: returns not-ssh for a runtime-owned target` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:35 :: returns ghost when the target is no longer configured` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:44 :: returns connected when the configured target is connected` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:53 :: returns disconnected when configured but not connected` | `D02b-019` |
| `components/sidebar/ssh-workspace-forget-resolution.test.ts:62 :: defaults to disconnected status when configured target has no live state` | `D02b-019` |

---

## 4. Rótulos e Textos de Interface (`labels` / `menu_labels`)

| Entrada de Label | Linha de Inventário |
|---|---|
| `components/sidebar/AddRemoteHostFields.tsx:102 :: placeholder="22"` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:116 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:189 :: placeholder={translate(` | `D02b-008` |
| `components/sidebar/AddRemoteHostFields.tsx:206 :: placeholder={translate(` | `D02b-008` |
| `components/sidebar/AddRemoteHostFields.tsx:49 :: onChange={(event) => onFormChange((draft) => ({ ...draft, label: event.target.value }))}` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:50 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:67 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostFields.tsx:84 :: placeholder={translate(` | `D02b-002` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:156 :: aria-label={translate(` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:90 :: placeholder={translate(` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:96 :: aria-label={translate(` | `D02b-004` |
| `components/sidebar/HostRemoveDialog.tsx:30 :: label: string` | `D02b-016` |
| `components/sidebar/HostRenameDialog.tsx:78 :: placeholder={derivedLabel}` | `D02b-014` |
| `components/sidebar/HostSectionHeaderMenu.tsx:18 :: DropdownMenuItem,` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:186 :: aria-label={translate(` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:213 :: <DropdownMenuItem` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:219 :: </DropdownMenuItem>` | `D02b-011` |
| `components/sidebar/HostSectionHeaderMenu.tsx:23 :: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` | `D02b-011` |
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
| `components/sidebar/add-remote-host-ssh-actions.test.ts:129 :: targets: [{ id: 'ssh-1', label: 'prod', host: 'prod', port: 22, username: '' }],` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.test.ts:77 :: label: 'prod',` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.ts:106 :: label: target.label,` | `D02b-003` |
| `components/sidebar/add-remote-host-ssh-actions.ts:87 :: label: form.label.trim() || (username ? `${username}@${host}` : configHost || host),` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:10 :: label: 'Staging box',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:19 :: existingTargets: [{ label: 'prod-box', host: 'prod-box' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:21 :: label: 'prod-box',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:30 :: existingTargets: [{ configHost: 'Staging', label: 'Staging', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:32 :: label: 'staging',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:43 :: existingTargets: [{ configHost: 'box1', label: 'prod', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:45 :: label: 'Prod',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:54 :: existingTargets: [{ configHost: 'staging', label: 'staging', host: 's.example' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:56 :: label: 'prod',` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.test.ts:8 :: existingTargets: [{ configHost: 'staging', label: 'Staging', host: '10.0.0.1' }],` | `D02b-003` |
| `components/sidebar/ssh-target-duplicate.ts:13 :: label: string` | `D02b-003` |

---

## 5. Atalhos e Navegação por Teclado (`hotkeys` / `shortcuts`)

| Entrada de Atalho | Linha de Inventário |
|---|---|
| `components/sidebar/RemoteFileBrowser.paste.test.tsx:121 :: input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` | `D02b-030` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:1 :: import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react'` | `D02b-029` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:43 :: }: RemoteFileBrowserFilterKeyCommandsArgs): (e: KeyboardEvent<HTMLInputElement>) => void {` | `D02b-029` |
| `components/sidebar/use-remote-file-browser-filter-key-commands.ts:45 :: (e: KeyboardEvent<HTMLInputElement>) => {` | `D02b-029` |

---

## 6. Preferências e Persistência (`prefs`)

*(Nenhuma preferência isolada registrada no índice deste domínio)*

---

## 7. Timers e Tarefas Agendadas (`timers`)

| Timer / Agendamento | Linha de Inventário |
|---|---|
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:46 :: const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D02b-004` |
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:88 :: queryTimer.current = setTimeout(() => onQueryChange(value), 200)` | `D02b-004` |
| `components/sidebar/RemoteFileBrowser.tsx:163 :: fileHintTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:186 :: clickTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:43 :: const fileHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D02b-026` |
| `components/sidebar/RemoteFileBrowser.tsx:44 :: const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:165 :: debounceTimerRef.current = setTimeout(() => {` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:185 :: pasteResolveTimerRef.current = setTimeout(() => {` | `D02b-028` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:60 :: const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D02b-026` |
| `components/sidebar/use-remote-file-browser-path-preview.ts:62 :: const pasteResolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` | `D02b-028` |

---

## 8. Subscriptions e Event Listeners (`subscriptions`)

| Subscription / Listener | Linha de Inventário |
|---|---|
| `components/sidebar/AddRemoteHostSshConfigPicker.tsx:47 :: useEffect(` | `D02b-004` |
| `components/sidebar/HostRenameDialog.tsx:39 :: useEffect(() => {` | `D02b-014` |
| `components/sidebar/RemoteFileBrowser.tsx:138 :: useEffect(() => {` | `D02b-022` |

---

## 9. Preload e Backend RPC (`preload`)

| Chamada Preload / Backend | Linha de Inventário |
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
