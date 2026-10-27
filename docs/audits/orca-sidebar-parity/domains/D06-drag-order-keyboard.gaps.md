# D06-drag-order-keyboard — Fase 2 (veredito Hydra)

Domínio: `D06-drag-order-keyboard` (35 linhas Orca).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2).
Mount do sidebar: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx`.

## Contagens

| veredito | linhas |
|---|---|
| parity | 1 |
| partial | 12 |
| **missing** | **22** |
| not-applicable | 0 |
| out-of-scope | 0 |

Linhas Orca cobertas: **35/35** (cada id exatamente uma vez, na ordem do `.orca.json`).

## Sumário executivo

O Hydra **portou fielmente os módulos puros** de drag/ordem do Orca, mas **quase nenhum está
wired**. A cadeia de importação que existe termina em código morto:

- Ilha morta de drag: `worktree-sidebar-drag-geometry.ts` ← (type-only) `worktree-sidebar-drag-autoscroll.ts`
  ← `worktree-sidebar-header-drop-preview.ts` ← `project-header-drop.ts`, e `project-header-drop.ts`
  exporta `computeProjectHeaderDropPreview` que **não tem call site** (`grep` → 0 fora de testes).
- Ilha morta de ordem: `worktree-manual-order-ranks.ts` ← `worktree-manual-order.ts` ← `worktree-drag-units.ts`;
  nenhuma das funções de topo (`buildManualOrderUpdatesForVisibleGroups`, `buildManualOrderUpdatesForGroupDrop`,
  `shouldWriteManualOrderForGroupDrop`) é chamada por componente.
- `pointer-drag-dom.ts` (guards + ghost clone), `keyboard-cycle.ts` e `hard-scroll-up.ts` **não têm nenhum importador**.
- `workspace-status-drag-data.ts` (D06-001/002) só é re-exportado por `workspace-status.ts:38-47`; os símbolos
  nunca são invocados.

O drag real do sidebar é **HTML5 nativo** e minimalista:

- dragstart grava apenas `application/x-hydra-worktree-drag` com um único path
  (`WorktreeSidebar.tsx:428-432`); drop usa estado React (`draggedWorktreePath`) e nunca lê `dataTransfer`
  (`WorktreeSidebar.tsx:442-463`).
- reordenação = splice de 1 item no array do projeto + persistência do array cru em localStorage
  (`WorktreeSidebar.tsx:449-459` → `App.tsx:1922-1937`). Não há ranks/manualOrder, unidades atômicas,
  lote multi-seleção, cross-group, autoscroll, geometry latching nem preview animado.
- o picker de pai foi substituído por um **modal centralizado** (`ParentPickerModal.tsx:70`) em vez do
  popover ancorado do Orca.

Nenhum comando Tauri equivalente foi necessário: **toda a persistência deste domínio no Hydra é
`localStorage`** (`hydra:worktree_lineage`, `hydra:worktrees_order[:<path>]`), e a store real de linhagem é
auto-stub (`src/store/slices/worktrees/metadata/worktree-lineage-actions.ts:1-5`,
`createAssignWorktreeParent: any = null`). `grep -iE "lineage|reorder|manual_order"` em `src-tauri/src/**` → 0.

Regra de ouro aplicada: todo `parity`/`partial` exige caminho alcançável a partir de `App.tsx:3636` com o
mesmo efeito observável. `missing` indica ausência de efeito wired — inclusive quando o módulo Orca foi
portado, mas é órfão (verificado por `grep` de importadores e de call sites, não só por existência de arquivo).

## Cobertura de evidência (arquivo:linha)

- Mount: `src/App.tsx:3636`; drag handlers: `src/components/sidebar/WorktreeSidebar.tsx:428-503`;
  reveal: `WorktreeSidebar.tsx:382-418`; container de scroll: `WorktreeSidebar.tsx:703-710`.
- Reorder persistido: `src/App.tsx:1922-1937`.
- Linhagem (local): `src/App.tsx:431-434` (`worktreeLineage` + `persistLineage`).
- Elegibilidade de pai inline: `src/App.tsx:3163-3172` (projeto) e `src/App.tsx:3288-3296` (worktree).
- Picker: `src/components/sidebar/ParentPickerModal.tsx:33-176`; render: `src/App.tsx:3951-3975`.
- Teclado: `src/App.tsx:2633-2641` → `handleNavigateWorkspace` `src/App.tsx:1596-1609`;
  definições `src/shared/keybindings/definitions-core-1.ts:46-59`.
- Ordem/row preference (única linha com parity): `worktree-sidebar-row-preference.ts:7-64` wiring em
  `rendered-sidebar-worktree-order.ts:16,105` → `visible-worktrees.ts:377,398`.
- Visibilidade de fontes: `src/lib/worktree-visibility-sources.ts:261-273,345-370` →
  `src/components/sidebar/WorktreeVisibilityDialog.tsx:379-430` ← `WorktreeSidebar.tsx:1142`.

## Tabela linha → veredito

| id | capability (curto) | veredito | âncora Hydra decisiva |
|---|---|---|---|
| D06-001 | Serialização de drag (unit + lote) | partial | `WorktreeSidebar.tsx:430-431` (só um tipo hidra, 1 path); helper `workspace-status-drag-data.ts:8-23` sem call site |
| D06-002 | Desserialização validada / limites de payload | missing | drop usa `draggedWorktreePath` (`WorktreeSidebar.tsx:442-463`); `getData()` só no módulo morto |
| D06-003 | Bloqueio de pointer drag em controles/portal | missing | `pointer-drag-dom.ts:21-35` 0 call sites; drag nativo `worktree-card-surface.tsx:89-91` |
| D06-004 | Estilos globais de documento no drag | missing | `pointer-drag-dom.ts:37-42` 0 call sites |
| D06-005 | Ghost clone + badge de contagem | missing | `pointer-drag-dom.ts:71-` 0 call sites; sem ghost em caminho vivo |
| D06-006 | Posição/escala do preview (modo nesting) | missing | `pointer-drag-dom.ts:57-69` só chamada internamente (:102) |
| D06-007 | Grab offset + projeção de centro do card | missing | `worktree-sidebar-drag-geometry.ts:28-43,101-112` órfãos |
| D06-008 | Anchor latching imune a card que cresce | missing | `drag-geometry.ts:57-92` 0 call sites; alvo recalculado a cada dragover (`WorktreeSidebar.tsx:437-439`) |
| D06-009 | Autoscroll proporcional nas bordas | missing | `worktree-sidebar-drag-autoscroll.ts:53-91` 0 call sites |
| D06-010 | Boundary drop clamping nas extremidades | missing | `drag-autoscroll.ts:93-126` → `header-drop-preview.ts:45-60` → `project-header-drop.ts:185-203` (sem call site) |
| D06-011 | Rects de drag ancorados em slot virtual | missing | `drag-autoscroll.ts:128-174` 0 call sites |
| D06-012 | Refresh/validação da sessão de drag | missing | `drag-autoscroll.ts:176-214` 0 call sites; sessão = 2 useState (`WorktreeSidebar.tsx:189-191`) |
| D06-013 | Unidades atômicas de drag + linhagem | missing | `worktree-drag-units.ts:18-68` 0 call sites (só type-import) |
| D06-014 | Índice de drop visual → índice plano | missing | `worktree-drag-units.ts:70-85` 0 call sites |
| D06-015 | Offsets animados de preview + placeholder | missing | arquivo inexistente; feedback só `worktree-card-surface.tsx:95-99` |
| D06-016 | Expansão de IDs pela linhagem visível | missing | `worktree-manual-order.ts:36-72` só chamada por código morto; drag de 1 path |
| D06-017 | Reordenar dentro do grupo (lote/V8-safe) | partial | reorder de 1 item wired (`WorktreeSidebar.tsx:449-459`); `moveWorktreeIdsWithinGroup` morto |
| D06-018 | Ranks esparsos + reindex denso | missing | sem manualOrder; localStorage de array cru (`App.tsx:1931-1937`) |
| D06-019 | Updates de ordem por grupo / drop entre lanes | partial | intra-projeto wired; cross-group é no-op (`:449-453`); builders Orca mortos |
| D06-020 | Catálogo de ordem manual multi-host | missing | sem catálogo/rank; ordem = array por projeto (`App.tsx:1922-1937`) |
| D06-021 | Intenção de multi-seleção (Shift/Cmd/Ctrl) | missing | props vestigiais `isMultiSelected`/`selectedWorktrees` nunca passadas |
| D06-022 | replace / toggle / range de seleção | missing | sem estado de seleção; clique só ativa (`WorktreeList.tsx:380`) |
| D06-023 | Poda por filtro + seleção por área | missing | marquee inexistente; visibleIds só para Cmd+1–9 (`WorktreeList.tsx:216-249`) |
| D06-024 | Elegibilidade de pai + prevenção de ciclos | partial | só auto-exclusão inline (`App.tsx:3164-3172,3289-3296`); sem repo/host/projeto/arquivado/ciclo |
| D06-025 | Placement/ancoragem do popover de pai | missing | modal centralizado `ParentPickerModal.tsx:70`; sem estimativa/clamp/âncora virtual/listeners |
| D06-026 | Filtro fuzzy + ranking de candidatos | partial | substring name/path/branch `ParentPickerModal.tsx:55-65`; sem score/highlight |
| D06-027 | Teclado/a11y/IME no picker | partial | foco inicial + Escape `ParentPickerModal.tsx:33-52`; sem setas/Home/End/Enter/IME/aria |
| D06-028 | Selecionar pai: erro, fechar, supressão 150ms | partial | `onSelect` → localStorage + close (`ParentPickerModal.tsx:125-126`); sem toast/guarda |
| D06-029 | Linha de candidato memoizada e informativa | partial | nome/branch/path/Current (`ParentPickerModal.tsx:119-160`); sem memo/status/repo/SSH |
| D06-030 | Unnest com notificação de erro em lote | partial | "Remove from Parent" 3× (`App.tsx:3275,3485,3594`) + "Remove Link" (`:167-175`); sem promise/toast |
| D06-031 | Ciclagem de teclado entre worktrees (host-aware) | partial | hotkey wired cicla **projetos** (`App.tsx:2633-2641`→`:1596-1609`); `keyboard-cycle.ts` órfão |
| D06-032 | Preferência natural vs Pinned + ordem visual | parity | `worktree-sidebar-row-preference.ts:7-64` → `visible-worktrees.ts:398` |
| D06-033 | Reveal: bounds + smooth + reduced motion | partial | `scrollIntoView({behavior:'smooth'})` wired (`WorktreeSidebar.tsx:413`); sem inset/PRM/callback |
| D06-034 | Guard de settling do scroll de reveal | missing | scroll fire-and-forget; sem arquivo/estado de settling |
| D06-035 | Proveniência/herança de fontes de visibilidade | partial | `worktree-visibility-sources.ts:261-273,345-370` wired no diálogo; faltam 4 auxiliares i18n |

## Gaps prioritários (ordem de impacto)

1. **Drag & drop é um mini-sistema à parte, desconectado do port.** Todos os módulos de drag/ordem do
   Orca existem em `src/components/sidebar/**` mas nenhum é alcançável a partir do mount (D06-003…D06-020,
   exceto 001/017/019 parcialmente). Ou se faz o wiring, ou se remove a ilha para não induzir a auditoria
   a falso-positivo de paridade.
2. **Sem multi-seleção de worktrees** (D06-021/022/023, `PAR-08`): sub-comportamentos declarados no card
   (`isMultiSelected`, `selectedWorktrees`) nunca são alimentados.
3. **Parent picker modal ≠ popover ancorado** (D06-025): perde placement/clamp/virtual anchor e
   resize/scroll tracking; sem navegação por teclado (D06-027) nem filtro fuzzy (D06-026).
4. **Linhagem regida por `localStorage` + auto-stub**: `worktree-lineage-actions.ts` é `any = null`;
   elegibilidade sem escopo de repo/host/projeto e sem detecção de ciclo (D06-024), erro/toast ausentes
   (D06-028/030).
5. **Sem manualOrder/ranks**: a ordem persistida é um array por projeto, que descarta itens filtrados
   (D06-018/020) e não suporta cross-group/lane (D06-019).
6. **Teclado**: Cmd+Shift+Arrow cicla projetos, não as worktrees renderizadas (`PAR` não listado; D06-031).
7. **Reveal** sem inset de header fixo, sem `prefers-reduced-motion` e sem guard de settling (D06-033/034).
8. **Visibilidade de fontes**: faltam avisos "Overriding global setting"/"Added in this project only"
   (i18n órfã `en.json:6355-6356`) e `listInheritedWorktreeVisibilitySources` (D06-035).

## Cross-walk PAR

| PAR | escopo | orca_rows | hydra_status |
|---|---|---|---|
| PAR-08 | sidebar | D06-021, D06-022, D06-023 | missing |
| PAR-43 | sidebar | D06-003, D06-004, D06-005, D06-006, D06-024, D06-030 | missing |
| PAR-88 | sidebar | D06-001, D06-002, D06-019 | missing |

Agregação adotada no `_par-crosswalk.json`: um item PAR só recebe `partial`/`parity` quando **todas** as
linhas mapeadas têm esse veredito; qualquer linha `missing` torna o item `missing` (pior caso). Assim
PAR-43 (drop-para-parent) e PAR-88 (DnD lista↔gaveta Kanban) permanecem `missing` mesmo com as linhas
D06-024/D06-030/D06-001/D06-019 parciais, porque o mecanismo nomeado do item não existe.

(`PAR-13` — drop nativo de pastas do SO — não tem linha em D06: trata da inserção de projeto por drop de
diretório, não do payload de drag de worktrees; `PAR-91` é TabBar, fora do escopo do sidebar.)
