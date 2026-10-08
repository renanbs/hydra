# REPAIRS-D04a — reparo dos defeitos de integridade

Domínio: `D04a-worktree-card-surface`.

Comando de verificação: `python3 docs/audits/orca-sidebar-parity/index/verify_coverage.py D04a-worktree-card-surface`.
Artefatos tocados apenas em `docs/audits/orca-sidebar-parity/` (nenhuma alteração em Hydra/Orca).

## Resultado do verificador

| Domínio | violações (antes) | violações (depois) |
|---|---|---|
| D04a-worktree-card-surface | 2 (5 símbolos `default` + 9 testes sem cobertura) | **0** |

Contagens antes → depois: símbolos `114/119` → `119/119`; testes `424/433` → `433/433`;
arquivos `50/50`, labels `260/260`, hotkeys `64/64`, timers `1/1`, subscriptions `5/5`, preload `7/7`
inalterados. `total violations: 0 over 1 domains`.

## Item 1 — símbolos `default` sem cobertura (5)

Cada `<file>:default` recebeu o id da linha que cobre o componente e que cita o arquivo em `orca_evidence`
(mapeamento por chave completa `components/sidebar/<file>:default` em `coverage.symbols`, em vez de
`default` solto, para não colidir entre arquivos):

- `WorktreeCard.tsx:default` → **D04a-001** (wrapper memoizado do card).
- `WorktreeCardAgents.tsx:default` → **D04a-078** (monta a lista inline de agentes).
- `WorktreeContextMenu.tsx:default` → **D04a-051** (monta o menu de contexto a partir do modelo de política).
- `WorktreeContextMenuView.tsx:default` → **D04a-052** (mesma linha que já cobre `WorktreeContextMenuView`).
- `WorktreeMetaDialog.tsx:default` → **D04a-093** (abre/semeia/salva o diálogo de metadados).

## Item 2 — testes novos sem cobertura (9)

Adicionadas as chaves exatas de `index.tests` em `coverage.tests`, apontando para a linha cujo comportamento
o caso exercita:

| Teste (arquivo:linha :: nome) | Linha |
|---|---|
| `WorktreeCard.lineage.test.tsx:105 :: does not render parent lineage badge copy on workspace cards` | D04a-009 (estrutura/overflow do conteúdo sem filhos de lineage) |
| `WorktreeCard.lineage.test.tsx:123 :: keeps the child workspace toggle chip` | D04a-020 (chip de worktrees filhas) |
| `WorktreeCard.pinned-repo-icon.test.tsx:115` | D04a-007 (`showPinnedRepoIcon = inPinnedSection && !!repo`) |
| `WorktreeCard.pinned-repo-icon.test.tsx:137` | D04a-007 |
| `WorktreeCard.pinned-repo-icon.test.tsx:156` | D04a-007 (ícone no novo estilo em vez de badge da meta row) |
| `WorktreeCardSshHostControl.test.tsx:97 :: labels the %s state %s` | D04a-012 |
| `WorktreeCardSshHostControl.test.tsx:117 :: tints the %s state with the destructive token…` | D04a-012 |
| `WorktreeCardSshHostControl.test.tsx:126 :: shows a disabled busy control while the host is %s` | D04a-012 |
| `WorktreeCardSshHostControl.test.tsx:372 :: sizes the passive glyph for %s at size-3` | D04a-012 |

## Item 3 — justificativas falsas (falsificação A–M, item J1)

### 3a. aria-labels reais mapeados a `DUP`/`INFRA`

As entradas de `coverage.labels` que dispensavam a obrigação passaram a apontar a linha que cobre a affordance
(o arquivo da affordance é citado em `orca_evidence` da linha):

- `More PR actions` / `Open in Orca` (PR) / `View on GitHub` (PR) — `WorktreeCardMeta.test.tsx:140/141/142`
  → **D04a-041** (seção de review PR/MR; teste `:114`, que é da seção PR, vinha atribuído a D04a-040).
- `More issue actions` / `Edit issue` / `Open in Orca` (issue) / `View on GitHub` (issue) —
  `WorktreeCardMeta.test.tsx:181/183/184/185` → **D04a-040** (seção de issue).
- `1 live port` — `WorktreeCard.compact-hover.test.tsx:246` e
  `WorktreeCard.compact-ports-hover-independence.test.tsx:240` → **D04a-034**
  (gatilho de portas ao vivo, `WorktreeCardPortsTrigger`, `aria-label='{{n}} live port'`).

### 3b. Títulos de `it(...)` classificados como `labels`

Reapontados para a linha que cobre o comportamento (coerentes com `coverage.tests`):

- `WorktreeCardSshHostControl.test.tsx:103 :: distinguishes an auth failure…` → **D04a-012**.
- `WorktreeCardMeta.interaction.test.tsx:194 :: omits the review trigger tooltip while the review menu is open`
  → **D04a-041**.
- `WorktreeCard.compact-hover.test.tsx:628 :: keeps status and agent tooltip targets outside…` → **D04a-009**.

### 3c. Outras linhas de produção com rótulo real de UI sob `INFRA`

Linhas que **renderizam/definem rótulo visível** deixaram de ser `INFRA` e passaram a apontar a linha da
affordance; linhas de tipo/import/comentário/`aria-hidden` permanecem `INFRA` (justificativa verdadeira):

- `aria-label={label}`: `WorktreeCardMetadataControls.tsx:56` e `:68` → **D04a-029**;
  `WorktreeCardPorts.tsx:86` → **D04a-036**.
- `placeholder=…`: `WorktreeDisplayNameField.tsx:53` → D04a-094; `WorktreeIssueLinkField.tsx:178` → D04a-095;
  `WorktreeMetaDialog.tsx:394` → D04a-097; `WorktreeReviewLinkField.tsx:34` → D04a-096.
- `title={formatAgentTypeLabel(...)}`: `worktree-card-compact-agent-row.tsx:226` → **D04a-080**.
- `label: application.label,`: `WorktreeOpenInMenu.tsx:45` → **D04a-055**.
- `tooltipLabel={getPortOpenBrowserTooltipLabel(...)}`: `WorktreeCardPorts.tsx:256` → **D04a-036**.
- tooltip renderizado: `WorktreeCardSshHostControl.tsx:66/212/279` → **D04a-012**;
  `WorktreeCardStatusSlot.tsx:171/228` → **D04a-023**.

### 3d. Correções de consistência adjacentes (mesma área de J1)

`coverage.tests` estava atribuindo testes da seção PR a D04a-040 e um teste de hover a D04a-007, divergindo dos
arrays `tests` das próprias linhas:

- `WorktreeCardMeta.test.tsx:114 :: puts unlink behind the first PR actions menu…` → **D04a-041**.
- `WorktreeCardMeta.test.tsx:198 :: labels GitLab unlink actions with MR terminology` → **D04a-041**.
- `WorktreeCard.compact-hover.test.tsx:628 :: keeps status and agent tooltip targets outside…` → **D04a-009**.

## Arquivos alterados

- `domains/D04a-worktree-card-surface.orca.json` — `coverage.symbols` (+5), `coverage.tests` (+9 e 3 valores
  corrigidos), `coverage.labels` (27 valores remapeados).
- `domains/D04a-worktree-card-surface.coverage.md` — métricas (119/119, 433/433), 5 linhas de símbolo e 9 de
  teste adicionadas, 30 valores de label/teste sincronizados, seção 11 recalculada (labels justificados
  213→186; 74 rótulos reais).
- `.diff.json` / `.gaps.md` **não** alterados: nenhuma linha nova foi criada (`rows` continua 111 e igual ao
  `diff.json`).

## Justificativas finais

- Símbolos: 0 justificados — os 119 exports têm capability própria.
- Testes: 0 justificados — os 433 casos mapeiam para uma capability.
- Labels: 186 justificados (120 `DUP` + 66 `INFRA`, todos estruturais/mock/assert já coberto); 74 rótulos reais
  mapeados à capability que os produz.
