# Falsificação — escopo A–M (adversário do inventário)

Escopo auditado (definição do par, acordada com `FalsifyNtoZ`): todos os arquivos de
`src/renderer/src/components/sidebar/**` com basename **case-insensitive `^[a-m]`** no nível
raiz **mais todos** os arquivos sob `components/sidebar/worktree-list/**` (qualquer basename).
`components/Sidebar.tsx` (S) ficou fora (coberto pelo outro falsificador).

Snapshot dos artefatos: `docs/audits/orca-sidebar-parity/domains/*.orca.json` — os arquivos
foram reescritos por *wave 2* durante a auditoria (mtime 13:08 local; md5 do agregado oscilou
entre `1cd109db…`, `b59fc87c…` e `37b234c9…`). As contagens abaixo foram reconferidas no
snapshot final `37b234c9` + `1cd109db` (re-execuções idênticas nos itens estáveis). Se a wave 2
ainda não fechou, reconferir as linhas citadas.

## Contagens auditadas

| Item | Quantidade |
|---|---|
| Arquivos do escopo checados | 272 (185 `prod` + 87 `test`) |
| Arquivos de teste unitário no escopo | 87 (igual ao disco: 305/305 `*.test.*` do módulo) |
| Exports do índice checados | 476 |
| Affordances do census checadas | 72 em `static_all` (33 com `inSidebar=true`), 4 em `all_sidebar_buttons`, 2 em `hover_cards`, 8 em `keyboard_probe` |
| Itens de menu (React, census) | 26 nomes distintos; menus nativos (`native_menus`) = **0 capturados** |
| Entradas de índice no escopo | labels 292 · hotkeys 40 · prefs 27 · timers 21 · subscriptions 73 · preload 26 |
| Testes (leaves `it`/`test`) no escopo | 652 (774 incluindo `describe`) |
| Specs e2e varridos | 503 arquivos em `tests/e2e/**`; 12 com referência direta ao escopo |
| Referências de evidência a arquivos do escopo | 583 |

## Veredito

**SEM ESCAPES ENCONTRADOS** — nenhum comportamento, arquivo, símbolo, menu ou teste do escopo
A–M ficou sem ≥1 linha de inventário com evidência `arquivo:linha`. As checagens mecânicas
fecham 100% e as candidatas a escape foram uma a uma rejeitadas com prova (abaixo). Restam,
porém, **8 inconsistências/matizes internos** (evidência que não sustenta a afirmação, formato
fora do contrato e uma limitação do census), que impedem chamar o inventário de íntegro — mas
não são escapes.

## Checagens executadas (todas fechadas)

1. **Arquivo × inventário**: 185/185 prod presentes em `coverage.files`; 185/185 com ≥1 row citando o arquivo em `orca_evidence` (os 9 arquivos que apareciam com zero evidência num snapshot intermediário passaram a ser citados após a wave 2 — ex. `worktree-list/drag/groups.ts` → `D03a-022`, `viewport/VirtualizedWorktreeViewport.tsx` → `D03a-103`).
2. **Export × inventário**: 476/476 exports citados em `coverage.symbols` (0 órfãos); 0 casos de símbolo atribuído a row que não cita o arquivo do símbolo no snapshot atual.
3. **Interação real × inventário**: os 33 affordances `inSidebar` do census mapeiam para rows/arquivos do escopo (ex. `Mark as unread` → `D04a-023`; `Project actions for X` → `D03a-084`; `Create new worktree for X` → `D03a-085`; `Reveal active workspace` → `D01-031`+`D03a-065`; `Workspace board`/`Refresh rate limits` → `D01-…`/`D08-…`); os 26 labels de menu do census têm row correspondente (`Mark as unread` `D04a-023`; `Move to Status` `D07-022`/`D04a-054`; `Copy Path` `D07-020`/`D04a-057`; `Delete Worktree` `D07-028`/`D04a-068`; `Remove Project from Orca` `D04a-068`/`D04a-069`; `New group from project` `D04a-060`/`D03a-084`; `Update`/`Sleep`/`Pin` `D15b-002`+`D07-…`). Os labels de menu de **terminal** do census (`Quick Commands`, `Fork Agent Session…`, `Copy Terminal ID`, `Split Terminal Right/Down`, `Clear Screen`, `Set Title…`) moram em `components/terminal-pane/TerminalContextMenu.tsx` e `components/native-chat/use-native-chat-context-menu.tsx` — fora do sidebar, logo fora do escopo (não é escape).
4. **Teste como spec**: 652/652 leaves do escopo mapeados a um id (0 `INFRA`/`N/A`); 305/305 arquivos de teste do módulo presentes no escopo; e2e de sidebar conferidos contra rows: `worktree-active-delete-scroll-position` → `D03a-097` (reduced-motion) + `D04b-001` (foco sucessor) + `D07-027`; `worktree-scroll-to-current` → `D01-031`+`D03a-065`+`D03a-095`; `folder-setup*` → `D02a-022`/`D02a-041`/`D02c-010`/`D02a-024`; `add-project-default-checkout` → `D02a-028`/`D02a-029`; `default-branch-visibility` → `D11-001`/`D11-010`/`D03a-047`/`D09-006`; `manual-worktree-order-persistence` → `D06-018`/`D06-019`.
5. **Evidência**: 583 refs do escopo resolvem para arquivo existente e linhas dentro do range; 0 `missing`/`out-of-range`.
6. **Backend**: 16/16 símbolos `window.api.*` usados no escopo aparecem em algum `backend_contract` do inventário (0 símbolo sem handler). Ver inconsistência I5 para a lacuna por-row.

## Escapes

Nenhum escape de comportamento. Candidatas avaliadas e **rejeitadas** com evidência:

| Candidata | Evidência (Orca) | Por que NÃO é escape |
|---|---|---|
| Copy i18n exata de strings do escopo (186 defaults `translate()` não aparecem verbatim no inventário) | `components/sidebar/AddRemoteHostSshConfigPicker.tsx:131` `No hosts in ~/.ssh/config`; `:135` `No matching hosts`; `HostSectionHeaderMenu.tsx:43/47` `Update server required/client required`; `delete-worktree-toast.ts:49..134`; `RepoScanUnavailableIndicator.tsx:43` `Retry scan` | As **linhas** de `translate(...)` estão no índice `menu_labels.json` (133 entradas com `translate(`) e todas mapeadas a um id em `coverage.labels`; os estados/behaviors são descritos nos rows (ex. `D02b-004` cobre loading/erro/sem-host/sem-match/truncado; `D02b-007` cobre toasts de import). É lacuna de *copy*, não de comportamento. |
| Atributos `data-*` de contrato DOM não nomeados no inventário | `worktree-list/rows/item-row.tsx:156-161` grava `data-worktree-host-identity/-row-key/-section-key/-drag-group-key/-drag-group-index`; lidos em `worktree-sidebar-drag-autoscroll.ts:135,139` e `worktree-list/rows/option-dom.ts:26,34`; `SectionHeader.tsx:210` `data-repo-header-index` lido em `project-header-drop.ts:139`; `SectionHeader.tsx:187`/`virtual-row-dispatch.tsx:82` `data-worktree-sticky-header-active` lido em `use-row-removal-animation.ts:108`; `index.tsx:155/229` (`data-native-file-drop-target`, `data-sidebar-resize-handle`) | Os conceitos estão descritos nos rows (`D03a-081` "IDs de opção DOM e marcação imediata de ativo" cita `option-dom.ts:1-67`; `D06-009`/`D06-011` descrevem o autoscroll de drag por grupo; `D03a-054` sticky headers; `D15a-010` resize handle). Falta o *seletor literal*, não o comportamento. |
| Arquivos prod que num snapshot intermediário tinham 0 evidência (9) | `worktree-list/drag/groups.ts`, `drop-commit-context.ts`, `use-drop-commit-context.ts`, `project-grouping.ts`, `listing/render-row.ts`, `listing/use-reused-array-identity.ts`, `navigation/render-row-lookup.ts`, `viewport/VirtualizedWorktreeViewport.tsx`, `viewport/viewport-props.ts` | Snapshot intermediário durante reescrita da wave 2; no snapshot final todos estão citados (`D03a-022/024/016/031/053/051/067/080/103`). Provável falso positivo se reportado por quem leu o snapshot em movimento. |
| Menus nativos Electron do sidebar | census `native_menus: []` | Não é escape do inventário: o **census não capturou** menu nativo algum (`card_options_menu: "no-trigger"`, itens do `card_context_menu` com `items: []`). Lacuna do runtime, não do inventário (registrada em I6). |

## Inconsistências (evidência não sustenta a afirmação)

| # | Linha | Afirma | Evidência mostra |
|---|---|---|---|
| I1 | `D12-013` (GFM tables) | "Renderização de tabelas GFM responsivas com contenção de overflow e listas de tarefas não interativas" | Evidência citada (`comment-markdown-element-renderers.tsx:95`, `:206`, `:261`, `:319`) são linhas de **links/imagens/code/className**, não de tabela. O renderer de tabela está em `comment-markdown-element-renderers.tsx:225-232` (compacto) e `:341-346` (documental). Claims são verdadeiros, mas a evidência não os demonstra. |
| I2 | `D02a-031` | "Gera e emite telemetria de descoberta de worktrees pré-existentes…" | Evidência única `add-repo-existing-workspaces-telemetry.ts:36` = linha trivial (`}`/vazia). Nenhuma linha demonstrando `recordFeatureInteraction`/evento. |
| I3 | `D02a-032` | "Sincroniza o store de repositórios, projetos e configurações de host…" | Evidência única `add-repo-store-upsert.ts:28` = linha trivial. As 4 behaviors (executionHostId, duplicidade, projeção, upsert atômico) não têm linha de apoio. |
| I4 | `D10-024`, `D10-027`, `D12-007` | Estados/ação de notice, host por linha, interceptação de links | Todas as refs citadas resolvem para linhas triviais (`}`, `)`, trechos de JSX sem a lógica). |
| I5 | `D01-027`, `D02a-002/004/007/019`, `D02b-001/009/011/013/015/016/017`, `D10-003/004` (14 rows) | Rows que tocam backend com `backend_contract: []` | Os arquivos citados invocam `window.api.*` (ex. `AgentDashboardSidebarEntry.tsx` usa `window.api.dashboard.openPopout`; `HostRemoveDialog.tsx` usa `window.api.ssh`; `AddRepoRemoteStep.tsx` usa `window.api.ssh.*`/`repos.addRemote`). Os símbolos estão declarados por **rows irmãos** (`D01-028`, `D02a-001/008/020`, `D02b-003/010/012/018`, `D10-001/002`), então o item 6 fecha globalmente (16/16), mas as rows de I5 não têm o contrato preenchido nelas. |
| I6 | census-v2 | — | `errors: []` mas `native_menus: []` e `card_options_menu: "no-trigger"`; `card_context_menu.items` vem vazio para o menu sem escopo. O item 2 do protocolo (menus nativos) **não é verificável** com este census. Não inventei dados de runtime. |
| I7 | `D01-027` | evidência `components/sidebar/AgentDashboardSidebarEntry.tsx:1-60,91-94` | Formato fora do contrato `arquivo:linha` (multi-range com vírgula), não parseável por `partition_check.py`/consumidores. |
| I8 | `coverage.labels` (8 entradas) | Label mapeada a um id | Id da row não cita o arquivo do label: `host-section-rows.ts:23/39/78/294` → `D01-001` (row da casca/dimensão); `HostSectionHeaderMenu.tsx:232/235` → `D02b-014` (dialog de rename) e `:266/275` → `D02b-015` (resolução de remoção). Semanticamente plausível, mas a evidência não abre o arquivo do label. |

## Prova negativa sobre `N/A:` / `INFRA:` / `DUP:`

Justificativas atribuíveis a arquivos do escopo: **96** — `INFRA` prod **2**, `INFRA` test 94
(labels 19, hotkeys 1, prefs 19, tests 55). **`N/A` = 0 e `DUP` = 0 em arquivos do escopo.**

- As 2 `INFRA` em arquivos **prod** do escopo são legítimas (não escondem comportamento):
  - `AutoRenameFailedDialog.tsx:28` — "linha de comentário de doc capturada pelo regex (não é label)".
  - `ImportedWorktreesVisibilityLine.tsx:5` — "import de Tooltip/TooltipContent/TooltipTrigger".
- As 94 `INFRA` em arquivos de teste do escopo são `describe` containers, helpers de teste
  (`findButton`, `clickButton`, `rootContaining`), mocks (`vi.mock('@/components/ui/tooltip')`,
  `TooltipProvider`) e fixtures — conforme a exceção do protocolo ("helpers puros de fixture").
- Justificativas em chaves **sem prefixo de arquivo** vêm de `symbols` type-only
  (`D02a-*`, `D02b-*`, `D10-*`, `D12-*`: interfaces/unions/constantes), todas `type-only` /
  `test helper` — legítimas por inspeção.

**Suspeitos** (fora do meu escopo de arquivos, mas no mesmo inventário — encaminhar a quem cobre N–Z):
- `D04a-worktree-card-surface` usa `INFRA: mock/estrutura de teste` em chaves que são, na
  verdade, **aria-labels de produção**: `aria-label="More PR actions"`, `"Open in Orca"`,
  `"View on GitHub"`, `"Edit issue"`, `"More issue actions"`, `'[aria-label="1 live port"]'`.
  Ex.: `WorktreeCardMeta.test.tsx` (`moreActionsIndex = markup.indexOf('aria-label="More PR actions"')`).
  Os menus correspondentes têm rows em D04a (ex. `Move to Status` `D04a-054`, `New group…` `D04a-060`,
  `Delete Worktree` `D04a-068`), mas a obrigação `labels` foi dispensada — checar se o label exato
  não deveria estar mapeado.
- `D04a` também justifica com `INFRA` um título de **`it(...)`** dentro de `labels`
  (`it('keeps status and agent tooltip targets outside the worktree details hover trigger'…` e
  `it('omits the review trigger tooltip while the review menu is open'…)`) — entrada de teste
  na categoria errada; é categorização, não comportamento.
- `D03a` justifica com `INFRA` asserts de `build-rows.test.ts` que carregam labels reais de seção
  (`'Pinned'`, `'All'`, `'In progress'`) — legítimo como fixture, mas `'In progress'` também é
  label de status de workspace produzido em produção; conferir se o label de status tem row.

## Limitações honestas

- Sem census de runtime completo: `native_menus` e os `items` do menu de contexto React vieram
  vazios no `census-v2.json`; a checagem "menu nativo × inventário" (item 2) ficou impossível.
- Snapshots em movimento (wave 2): dois dos itens acima (I1–I4) podem já ter sido corrigidos
  após a coleta; revalidar por `md5` do agregado.
