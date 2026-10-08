# D12-markdown-inline-render — Fase 2 (veredito Hydra)

Domínio: `D12-markdown-inline-render` (14 linhas Orca).
Fonte Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2).
Mount do sidebar: `src/App.tsx:3636` → `src/components/sidebar/WorktreeSidebar.tsx`.

## Contagens

| veredito | linhas |
|---|---|
| parity | 0 |
| partial | 0 |
| **missing** | **14** |
| not-applicable | 0 |
| out-of-scope | 0 |

Linhas Orca cobertas: **14/14** (cada id exatamente uma vez).

## Sumário executivo

O subsistema de markdown inline do sidebar **não foi portado**. Não existe nenhum
parser/renderizador de markdown em todo o `src/**` do Hydra:

- `package.json:13-30` (dependencies) não contém `react-markdown`, `remark-*`, `rehype-*`,
  `mermaid`, `marked` nem `markdown-it`. Único artefato correlato é `dompurify@3.4.8` em
  `pnpm-lock.yaml` (transitiva, sem nenhum uso em `src/**`).
- Nenhum símbolo com `markdown`/`mermaid` em `index/hydra_exports.json`.
- Nenhum comando Tauri de markdown/mermaid em `index/hydra_tauri_commands.json`.
- `grep -rn "CommentMarkdown|CommentMermaid|MarkdownImageLightbox|remarkNativeChatFileLinks" src` → 0 hits.
- `grep -rni "markdown|remark|rehype" src/components/sidebar` → 0 hits.
- Os módulos markdown que o port deixou para trás são **auto-stubs** (`export const x: any = null`,
  comentário "Auto-stub so the Orca port typechecks"):
  - `src/store/slices/editor/actions/markdown-preview-actions.ts:1-3`
  - `src/store/slices/editor/actions/markdown-link-action.ts:1-3`
  - `src/runtime/mobile-markdown-bridge.ts:1-3`
  - `src/shared/mobile-markdown-document.ts:1-5`
  - `src/hooks/ipc-events/os-markdown-file-open-bridge.ts:1-3`
- Chaves i18n herdadas do Orca existem, mas são **órfãs** (nenhum componente as consome):
  `src/i18n/locales/en.json:6237-6241` (`MarkdownImageLightbox.image/expand/close`),
  `src/i18n/locales/en.json:17501` (`copyCode`).

A superfície que o item de spec `[PAR-39]` aponta (`WorktreeCardDetailsHover.tsx`) existe, porém
renderiza **texto puro**: título/branch (`:124-128`), porta/PR (`:223`, `:256-258`) e path (`:276-294`).
Não há corpo de commit, issue ou nota em markdown.

## Regra de ouro — prova de wiring por linha

Todo veredito `missing` foi decidido pela busca obrigatória em 5 passos (nome → marcação →
comportamento → backend → declaração). Nenhuma linha tem `parity`/`partial` porque **nenhum**
caminho tem, simultaneamente, símbolo alcançável a partir de `WorktreeSidebar` e efeito observável
equivalente.

## Tabela linha → veredito

| id | capability (curto) | veredito | busca (ancoras Hydra) |
|---|---|---|---|
| D12-001 | Markdown compacto com supressão de `<p>` | missing | package.json:13; WorktreeCardDetailsHover.tsx:124,256 |
| D12-002 | Headings H1–H6 inline acessíveis (compact) | missing | package.json:13; worktree-card-meta-row.tsx:60 |
| D12-003 | Markdown documental (blockquote/hr/headings em bloco) | missing | package.json:13; WorktreeCardDetailsHover.tsx:124,276 |
| D12-004 | Sanitização de HTML bruto + remoção de comentários | missing | App.tsx:195; terminal-bracketed-paste.ts:51 (sanitize não relacionado) |
| D12-005 | Autolink de issues/PRs GitHub (#123, owner/repo#123) | missing | shared/github/project-identity.ts:11; package.json:13 |
| D12-006 | Linkify de caminhos de arquivo (`remarkNativeChatFileLinks`) | missing | mobile-markdown-bridge.ts:3; markdown-link-action.ts:3 (stubs) |
| D12-007 | Interceptação de clique/auxclick em links | missing | WorktreeCardDetailsHover.tsx:223 (window.open direto) |
| D12-008 | Imagens compactas confiáveis + fallback de link | missing | worktree-card-meta-row.tsx:1; package.json:13 (sem `<img>` no sidebar) |
| D12-009 | Lightbox modal acessível de imagem | missing | en.json:6237,6239 (i18n órfã, sem componente) |
| D12-010 | Mídia de anexos GitHub (vídeo/imagem autenticada) | missing | package.json:13; WorktreeCardDetailsHover.tsx:276 (`user-attachments` 0 hits) |
| D12-011 | Diagramas Mermaid com tema claro/escuro | missing | language-detect.ts:32-33 (só mapa de extensão); package.json:13 (sem `mermaid`) |
| D12-012 | Renderer delegado de code blocks com `language` | missing | markdown-preview-actions.ts:3 (stub); en.json:17501 (`copyCode` órfã) |
| D12-013 | Tabelas GFM responsivas + task lists não interativas | missing | truncated-sidebar-label.tsx:1; package.json:13 (sem `<table>`) |
| D12-014 | `CommentMarkdownAsync`/`preloadCommentMarkdown` (code-split) | missing | mobile-markdown-document.ts:3; mobile-markdown-bridge.ts:3 (stubs) |

## Comportamentos faltantes por linha

Os `missing_behaviors` de cada linha no `.diff.json` reproduzem integralmente o array
`behaviors` do `.orca.json` (70 sub-comportamentos no total), pois nenhum foi implementado.

## `not-applicable` / `out-of-scope`

Nenhum. Renderização de markdown é portável (web/Tauri) e não há decisão de produto registrada
contra a paridade; logo todas as ausências são `missing`.

## Cross-walk `[PAR-39]`

`[PAR-39] Renderização de Markdown em Mensagens de Commit e Notas (CommentMarkdown)`
(`/home/renan/src/vault/70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md:384-388`)
cobre as 14 linhas D12 → `hydra_status: missing`. Alvo da spec (`WorktreeCardDetailsHover.tsx`)
existe mas segue renderizando texto bruto.

## Nota de completude

Toda evidência é `arquivo:linha` do Hydra e foi obtida de leitura direta do working tree atual.
Nenhuma linha do `.orca.json` ficou sem veredito; não há veredito `unknown`.
