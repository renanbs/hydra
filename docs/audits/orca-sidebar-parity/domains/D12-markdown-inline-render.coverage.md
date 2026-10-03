# Cobertura de Domínio — D12-markdown-inline-render

## Contagens de Cobertura

- **Arquivos produtivos**: 7/7 (100%)
- **Símbolos / Exports**: 19/19 (100%)
- **Testes**: 55/55 (100%)
- **Labels / Menu items**: 8/8 (100%)
- **Atalhos (hotkeys)**: 0/0 (100%)
- **Preferências (prefs)**: 0/0 (100%)
- **Timers / Watchers**: 0/0 (100%)
- **Subscrições de Store**: 0/0 (100%)
- **Preload / IPC Symbols**: 0/0 (100%)

---

## 1. Arquivos Produtivos (`files`)

| Arquivo Produtivo | Linhas | IDs de Capacidade Mapeados |
|---|---|---|
| `components/sidebar/CommentMarkdown.tsx` | 263 | D12-001, D12-003, D12-004, D12-005, D12-006, D12-007, D12-008, D12-012 |
| `components/sidebar/CommentMermaidBlock.tsx` | 28 | D12-011 |
| `components/sidebar/MarkdownImageLightbox.tsx` | 82 | D12-009 |
| `components/sidebar/comment-markdown-element-renderers.tsx` | 355 | D12-001, D12-002, D12-003, D12-007, D12-008, D12-009, D12-010, D12-011, D12-012, D12-013 |
| `components/sidebar/comment-markdown-github-attachment-media.tsx` | 116 | D12-010 |
| `components/sidebar/comment-markdown-lazy.tsx` | 49 | D12-014 |
| `components/sidebar/comment-markdown-native-chat-file-links.ts` | 243 | D12-006 |

---

## 2. Símbolos e Exports (`symbols`)

| Arquivo de Origem | Símbolo Exportado | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/CommentMarkdown.tsx` | `default` | `D12-001` |
| `components/sidebar/CommentMermaidBlock.tsx` | `default` | `D12-011` |
| `components/sidebar/CommentMarkdown.tsx` | `remarkGitHubReferences` | `D12-005` |
| `components/sidebar/CommentMermaidBlock.tsx` | `CommentMermaidBlock` | `D12-011` |
| `components/sidebar/MarkdownImageLightbox.tsx` | `ExpandableMarkdownImage` | `D12-009` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `CommentMarkdownLinkClickHandler` | `INFRA: TypeScript type definition for anchor/image click interception callback` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `DocumentCodeBlockRenderer` | `INFRA: TypeScript type definition for custom code block renderer callback` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `isTrustedCompactImageSrc` | `D12-008` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `createCompactCommentMarkdownComponents` | `D12-001`, `D12-002`, `D12-008`, `D12-013` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `createDocumentCommentMarkdownComponents` | `D12-003`, `D12-007`, `D12-009`, `D12-010`, `D12-011`, `D12-012`, `D12-013` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `compactCommentMarkdownComponents` | `D12-001`, `D12-008` |
| `components/sidebar/comment-markdown-element-renderers.tsx` | `documentCommentMarkdownComponents` | `D12-003`, `D12-010` |
| `components/sidebar/comment-markdown-github-attachment-media.tsx` | `isGitHubUserAttachmentUrl` | `D12-010` |
| `components/sidebar/comment-markdown-github-attachment-media.tsx` | `isGitHubUserAttachmentVideoLink` | `D12-010` |
| `components/sidebar/comment-markdown-github-attachment-media.tsx` | `GitHubUserAttachmentVideo` | `D12-010` |
| `components/sidebar/comment-markdown-github-attachment-media.tsx` | `GitHubUserAttachmentImage` | `D12-010` |
| `components/sidebar/comment-markdown-lazy.tsx` | `preloadCommentMarkdown` | `D12-014` |
| `components/sidebar/comment-markdown-lazy.tsx` | `CommentMarkdownAsync` | `D12-014` |
| `components/sidebar/comment-markdown-native-chat-file-links.ts` | `remarkNativeChatFileLinks` | `D12-006` |

---

## 3. Casos de Teste (`tests`)

| Arquivo de Teste e Linha | Identificador / Nome do Teste | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/CommentMarkdown.github-attachment-image.test.tsx:24` | `describe CommentMarkdown GitHub attachment images` | `INFRA: describe block grouping attachment image tests` |
| `components/sidebar/CommentMarkdown.github-attachment-image.test.tsx:38` | `it renders GitHub user attachment document images as openable links` | `D12-010` |
| `components/sidebar/CommentMarkdown.github-attachment-image.test.tsx:50` | `it falls back to a text link when a GitHub user attachment image cannot load` | `D12-010` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:12` | `describe CommentMarkdown link click handler` | `INFRA: describe block grouping link click tests` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:25` | `it lets callers intercept rendered document links` | `D12-007` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:55` | `it intercepts auxiliary clicks on generated native file links` | `D12-007` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:89` | `it does not activate generated native file links on right-click` | `D12-007` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:121` | `it sanitizes file URI links unless the caller opts in` | `D12-004` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:137` | `it sanitizes raw HTML file URI links unless the caller opts in` | `D12-004` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:156` | `it lets opted-in callers intercept rendered file URI links` | `D12-007` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:190` | `it lets callers intercept rendered document images` | `D12-009` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:220` | `it linkifies bare POSIX and Windows document paths without an extension allowlist` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:248` | `it makes an inline-code file path clickable while preserving code styling` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:280` | `it leaves prose-shaped slash tokens and numeric versions unlinked` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:311` | `it links each relative path separately when prose joins them` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:332` | `it links quoted spaced-first-segment paths around apostrophes` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:364` | `it links a spaced-first-segment relative path when inline code disambiguates it` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:389` | `it requires path shape before a spaced line suffix can make a link` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:410` | `it preserves line suffixes on valid spaced path shapes` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:441` | `it links complete Unicode paths and extensions that begin with a digit` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:462` | `it never links an ASCII suffix inside a path containing an unsupported character` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:482` | `it links paths before common sentence punctuation` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:503` | `it links paths after CLI assignment and before Unicode sentence punctuation` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:524` | `it does not link partial paths across unsupported punctuation` | `D12-006` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:543` | `it prevents the default action for an unresolved internal file href` | `D12-007` |
| `components/sidebar/CommentMarkdown.link-click.test.tsx:572` | `it normalizes Windows markdown hrefs but leaves fenced paths as source text` | `D12-006` |
| `components/sidebar/CommentMarkdown.test.tsx:6` | `describe CommentMarkdown` | `INFRA: describe block grouping CommentMarkdown tests` |
| `components/sidebar/CommentMarkdown.test.tsx:7` | `it marks compact headings so a parent can opt into block flow` | `D12-001` |
| `components/sidebar/CommentMarkdown.test.tsx:20` | `it marks adjacent compact paragraphs inside disclosure content` | `D12-001` |
| `components/sidebar/CommentMarkdown.test.tsx:34` | `it autolinks same-repo GitHub issue references when repo context is provided` | `D12-005` |
| `components/sidebar/CommentMarkdown.test.tsx:47` | `it autolinks cross-repo GitHub issue references` | `D12-005` |
| `components/sidebar/CommentMarkdown.test.tsx:59` | `it does not autolink GitHub issue references inside existing links or code` | `D12-005` |
| `components/sidebar/CommentMarkdown.test.tsx:73` | `it keeps remote compact markdown images as links` | `D12-008` |
| `components/sidebar/CommentMarkdown.test.tsx:83` | `it renders trusted compact markdown images inline` | `D12-008` |
| `components/sidebar/CommentMarkdown.test.tsx:93` | `it renders document markdown images with an expand control for the lightbox` | `D12-009` |
| `components/sidebar/CommentMarkdown.test.tsx:108` | `it adds an expand control to compact images only when requested` | `D12-008` |
| `components/sidebar/CommentMarkdown.test.tsx:117` | `it renders bare GitHub user attachment links as document videos` | `D12-010` |
| `components/sidebar/CommentMarkdown.test.tsx:127` | `it keeps non-attachment document links as links` | `D12-010` |
| `components/sidebar/CommentMarkdown.test.tsx:135` | `it autolinks very large generated GitHub reference comments` | `D12-005` |
| `components/sidebar/CommentMarkdown.test.tsx:162` | `it strips single-line and multi-line HTML comments` | `D12-004` |
| `components/sidebar/CommentMarkdown.test.tsx:176` | `it renders <details>/<summary> as a disclosure section` | `D12-004` |
| `components/sidebar/CommentMarkdown.test.tsx:189` | `it renders markdown blockquotes` | `D12-003` |
| `components/sidebar/CommentMarkdown.test.tsx:198` | `it renders raw HTML blockquotes` | `D12-004` |
| `components/sidebar/CommentMarkdown.test.tsx:207` | `it renders GFM tables` | `D12-013` |
| `components/sidebar/CommentMarkdown.test.tsx:217` | `it renders mermaid code fences as a mermaid container instead of a pre block` | `D12-011` |
| `components/sidebar/CommentMarkdown.test.tsx:228` | `it uses the supplied code-block renderer for fenced document markdown` | `D12-012` |
| `components/sidebar/CommentMarkdown.test.tsx:242` | `it does not invent a language label for a bare code fence` | `D12-012` |
| `components/sidebar/CommentMarkdown.test.tsx:255` | `it keeps compact mermaid fences as bounded source blocks` | `D12-011` |
| `components/sidebar/CommentMarkdown.test.tsx:266` | `it renders headings as block elements with hierarchy in the document variant` | `D12-003` |
| `components/sidebar/CommentMarkdown.test.tsx:275` | `it flattens headings to inline text in the compact variant` | `D12-002` |
| `components/sidebar/CommentMarkdown.test.tsx:284` | `it contains long PR body markdown inside its available width` | `D12-013` |
| `components/sidebar/MarkdownImageLightbox.test.tsx:12` | `describe ExpandableMarkdownImage` | `INFRA: describe block grouping lightbox tests` |
| `components/sidebar/MarkdownImageLightbox.test.tsx:13` | `it opens an accessible dialog, traps focus, and restores focus after Escape` | `D12-009` |
| `components/sidebar/MarkdownImageLightbox.test.tsx:38` | `it closes from the dialog close button` | `D12-009` |
| `components/sidebar/MarkdownImageLightbox.test.tsx:46` | `it keeps the parent issue drawer open after Escape and close-button dismissal` | `D12-009` |

---

## 4. Labels e Textos Literais (`labels`)

| Arquivo e Linha | Texto / Label | Mapeamento / Justificativa |
|---|---|---|
| `components/sidebar/CommentMarkdown.test.tsx:104` | `expect(markup).toContain('aria-label="Expand image"')` | `D12-009` |
| `components/sidebar/CommentMarkdown.test.tsx:113` | `expect(markup).toContain('aria-label="Expand image"')` | `D12-008` |
| `components/sidebar/CommentMarkdown.test.tsx:237` | `expect(markup).toContain('aria-label="Copy code"')` | `D12-012` |
| `components/sidebar/CommentMarkdown.test.tsx:251` | `expect(markup).toContain('aria-label="Copy code"')` | `D12-012` |
| `components/sidebar/CommentMarkdown.tsx:81` | `label: string,` | `INFRA: TypeScript parameter declaration in splitGitHubReferenceText/createGitHubReferenceLinkNode` |
| `components/sidebar/MarkdownImageLightbox.tsx:49` | `aria-label={translate(` | `D12-009` |
| `components/sidebar/MarkdownImageLightbox.tsx:70` | `aria-label={translate('auto.components.sidebar.MarkdownImageLightbox.close', 'Close')}` | `D12-009` |
| `components/sidebar/comment-markdown-lazy.tsx:40` | `title={props.title}` | `D12-014` |

---

## 5. Justificativas Explícitas de `N/A`, `INFRA` e `DUP`

- `CommentMarkdownLinkClickHandler`: `INFRA: TypeScript type definition for anchor/image click interception callback`
- `DocumentCodeBlockRenderer`: `INFRA: TypeScript type definition for custom code block renderer callback`
- `label: string,` (`CommentMarkdown.tsx:81`): `INFRA: TypeScript parameter declaration in splitGitHubReferenceText/createGitHubReferenceLinkNode`
- `describe CommentMarkdown GitHub attachment images`: `INFRA: describe block grouping attachment image tests`
- `describe CommentMarkdown link click handler`: `INFRA: describe block grouping link click tests`
- `describe CommentMarkdown`: `INFRA: describe block grouping CommentMarkdown tests`
- `describe ExpandableMarkdownImage`: `INFRA: describe block grouping lightbox tests`
