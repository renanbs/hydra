# HYDRA MAPPING — protocolo da fase 2 (diff Orca → Hydra)

## Entrada
- Inventário congelado: `docs/audits/orca-sidebar-parity/domains/<DOM>.orca.json` (linhas + coverage).
- Fonte do Hydra: `/home/renan/orca/workspaces/hydra/ondine` (React 19 + Tauri v2; sidebar em
  `src/components/sidebar/**`, mount em `src/components/sidebar/WorktreeSidebar.tsx` e `src/App.tsx`;
  backend Rust em `src-tauri/src/**`).
- Regras do projeto: `AGENTS.md` + `skill://hydra-architecture` (o sidebar do Hydra é Fleet & Worktree
  Manager, não file explorer; PTY com shadow buffer `vt100`; comandos Tauri `async fn`; SQLite WAL).

## Regra de ouro
**Arquivo existir não é funcionalidade.** Todo veredito exige prova de wiring:
1. o símbolo é alcançável a partir do mount do sidebar do Hydra (cadeia de imports/uso), e
2. o efeito observável corresponde (mesma ação), e
3. se a linha do Orca depende de backend, existe comando Tauri equivalente **chamado** por esse caminho.

## Vocabulário de veredito (fechado — nada fora disso)
- `parity` — mesmo comportamento observável, com evidência de wiring nos dois lados.
- `partial` — existe, mas falta sub-comportamento nomeado (liste exatamente quais `behaviors` faltam).
- `missing` — não existe no Hydra.
- `not-applicable` — não portável por plataforma/arquitetura. Exige razão explícita
  (ex.: `Electron main window API`, `macOS native module`, `SSH remote host`, `mobile companion`,
  `multi-window popout`). Nunca usar como muleta para "difícil".
- `out-of-scope` — decisão explícita de produto contra a paridade (ex.: telemetria). Exige razão.

Não existe `unknown`. Se não deu para decidir, é `missing` com nota `"não localizado após busca em X, Y, Z"`.

## Como procurar no Hydra (obrigatório, nesta ordem)
1. Nome: procure o homônimo/correspondente em `src/components/sidebar/**` (o Hydra herdou nomes do Orca).
2. Marcação/semântica: procure a string/label exata, `data-testid`, classe de ícone, texto de menu.
3. Comportamento: procure a função que produz o efeito (store, hook, comando `invoke`).
4. Backend: procure o `#[tauri::command]` equivalente em `src-tauri/src/**`; verifique se é chamado.
5. Se ainda não achou: declare `missing` com a lista de buscas feitas.

## Saída por domínio
`domains/<DOM>.diff.json`:
```json
{ "domain": "<DOM>",
  "rows": [ { "id": "<DOM>-001", "capability": "...", "orca_evidence": ["..."],
              "hydra": { "status": "parity|partial|missing|not-applicable|out-of-scope",
                         "evidence": ["src/components/sidebar/X.tsx:123"],
                         "backend": ["invoke('cmd') -> src-tauri/src/db.rs:88"],
                         "missing_behaviors": ["..."],
                         "reason": "só para not-applicable/out-of-scope",
                         "notes": "" } } ],
  "summary": { "parity": 0, "partial": 0, "missing": 0, "not-applicable": 0, "out-of-scope": 0 } }
```
Cada `id` do `.orca.json` deve aparecer exatamente uma vez. Zero linhas do Orca sem veredito.

## Cross-walk obrigatório com a auditoria anterior
A spec do vault `70-Specs/hydra/Spec - Paridade Terminal e Left Sidebar Orca.md` tem itens `[PAR-03]` …
`[PAR-91]` (sidebar/tabbar). Para cada item `PAR-*` que for de sidebar, adicione em
`domains/_par-crosswalk.json`: `{"PAR-21": {"orca_rows": ["D07-012"], "hydra_status": "missing"}}`.
Item de `TabBar` fica fora do escopo do sidebar (registre `"escopo": "tabbar"`).
