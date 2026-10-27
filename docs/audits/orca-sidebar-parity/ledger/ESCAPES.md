# Ledger de escapes — o que a falsificação derrubou

Registro adversarial da fase 3. Cada item foi encontrado por um agente que **não** escreveu o inventário,
com evidência `arquivo:linha` no Orca. Status de reparo ao final de cada item.

## Escapes reais (comportamento do sidebar ausente do inventário)

| # | Escape | Evidência Orca | Domínio | Reportado por | Reparo |
|---|---|---|---|---|---|
| E1 | Ações por linha da lista de Agentes: marcar thread como lida/não-lida e `Clear notification` de thread concluída | `components/sidebar/SidebarAgentsList.tsx:159-160`, `components/activity/activity-thread-actions.ts:69-75`, `components/activity/activity-thread-row.tsx:170-207`, `components/activity/activity-clear-completed.ts:118-126` | D05 | falsificação runtime | **corrigido** — linhas `D05-021..023` (todas `missing` no Hydra) |
| E3 | Toggle do sidebar por comando (`sidebar.left.toggle` / Cmd+B) | `src/renderer/src/app-shell/app-command-handlers.ts:168`, `store/slices/ui/ui-slice-agent-actions.ts:46`, `tests/e2e/tab-sidebar-closed-overlap.spec.ts:36` | D01 | falsificação N–Z | em reparo (RepairA) |
| E2 | 3 arquivos prod com zero evidência em qualquer linha, apesar de declarados cobertos | `ssh-target-duplicate.ts:12-31` (D02b), `workspace-kanban-pointer-drag-selection.ts:11-34` (D08), `worktree-list-lineage-card-test-fixtures.ts:1-62` (D03b) | D02b/D08/D03b | falsificação N–Z | em reparo (RepairA/B) |
| E5 | 10 mapeamentos de `coverage.files` apontando para linhas que não citam o arquivo | ver `falsification-N-Z.md` §E5 | D08/D02b/D02a/D05/D03b/D06 | falsificação N–Z | em reparo (RepairA/B) |

## Defeitos de índice (limitação do instrumento, não do inventário)

| # | Defeito | Impacto | Reparo |
|---|---|---|---|
| E4 | `index/exports.json` ignorava `export default` → 18 arquivos sem entrada de símbolo | 57 obrigações de símbolo invisíveis | **índice corrigido** (`index/build_index.py`), cobertura em reparo |
| E1' | `index/tests.json` ignorava testes multi-linha e `it.each(...)` → 33 declarações invisíveis | 27 obrigações de teste invisíveis | **índice corrigido**, cobertura em reparo |

## Justificativas suspeitas (N/A/INFRA/DUP usados onde há comportamento real)

| # | Item | Reportado por | Reparo |
|---|---|---|---|
| J1 | D04a: `INFRA` aplicado a aria-labels reais (`More PR actions`, `Open in Orca`, `View on GitHub`, `Edit issue`, `More issue actions`, `1 live port`) | falsificação A–M | em reparo (pós-W2 D04a) |
| J2 | D03a: `INFRA` aplicado a labels reais (`Pinned`, `All`, `In progress`) | falsificação A–M | em reparo (RepairA) |

## Inconsistências de evidência (linha afirma o que a evidência não mostra)

- A–M: `I1` D12-013 (tabelas GFM sustentadas por evidência de links/imagens), `I2`/`I3` D02a (evidência trivial única), `I4` D10-024/D10-027/D12-007, `I7` D01-027 (formato de evidência fora do contrato), `I8` 8 entradas de label mapeadas a linhas que não citam o arquivo.
- N–Z: `I1`–`I6` (citações de `vi.mock`/linha de corpo de teste tratadas como especificação; nome de teste inexistente; linha de teste errada por 4 linhas).
- Ação: os itens com impacto no mapeamento entram no reparo A/B; os puramente cosméticos (formato de evidência) ficam registrados aqui e no `MATRIX.md`.

## Vereditos da falsificação

| escopo | arquivos | exports | testes | veredito |
|---|---|---|---|---|
| A–M | 272 | 476 | 652 | **SEM ESCAPES ENCONTRADOS** (8 inconsistências) |
| N–Z | 536 | 833 | 2.559 | **FALSIFICADO** (E1/E2/E3/E4/E5) |
| runtime | 18 arquivos abertos para classificação; 94 rótulos, 11 itens de menu, 729 ações de store | — | — | **FALSIFICADO** (E1) |
