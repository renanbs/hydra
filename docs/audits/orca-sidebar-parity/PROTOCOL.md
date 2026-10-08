# PROTOCOL — Inventário exaustivo do sidebar esquerdo do Orca

## Objetivo
Produzir o inventário **completo** das funcionalidades do sidebar esquerdo do Orca (código-fonte em
`/home/renan/src/orca`, alias `@/` → `src/renderer/src/`), com evidência `arquivo:linha`, de forma que
**nada** fique sem identificação. Este inventário é a base do diff contra o Hydra.

Referência pinada: `stablyai/orca` @ `e49b3aa0bd` + working tree atual.

## Regra de ouro
Um item só existe no inventário se tiver **evidência verificável** (`arquivo:linha`). Zero invenção,
zero "provavelmente". Se algo é inferência, marcar `confidence: "inferred"` e explicar.

## Fronteira (o que entra)
- Todo arquivo `src/renderer/src/components/sidebar/**` e `src/renderer/src/components/Sidebar.tsx`.
- Toda funcionalidade alcançável a partir do sidebar: menus, submenus, popovers, hover cards, tooltips,
  dialogs, wizards, badges, atalhos, drag&drop, multi-seleção, estados visuais, gates de visibilidade.
- Atividade em background disparada pelo sidebar: timers, watchers, subscriptions de store, refresh de
  PR/review/git/ports, autorenome, inbox de worktrees externos, sincronização de tarefas do Kanban, cache.
- Contrato de backend: cada símbolo `window.orca.*` / `window.electron.*` usado → handler correspondente
  no main (procure em `src/main/**`, `src/preload/**`). Se não achar o handler, registre
  `backend_contract: ["<símbolo> -> handler não localizado"]`.
- Comportamento que o Orca delega a dependências de store/hook fora do módulo: registre como
  `state_inputs` (ex.: `useWorktreeStore.xyz`) sem expandir o inventário para dentro do store.

## NÃO faça
- NÃO abra `/home/renan/orca/workspaces/hydra/ondine/src` (nem qualquer arquivo do Hydra). Esta fase é
  Orca puro: nenhum viés de "o Hydra tem/não tem".
- NÃO rode build, lint, typecheck ou testes. NÃO edite código do Orca.
- NÃO resuma por arquivo ("renderiza o card"). Descreva **comportamento observável**.

## Como enumerar (checklist por arquivo, obrigatório)
Para **cada** arquivo produtivo do seu manifest, percorra e transforme em linha de inventário:
1. Todo componente/hook/função exportada (use `domains/<DOM>.index.json → exports`).
2. Todo elemento interativo: botão, `<MenuItem>`, `DropdownMenuItem`, `<ContextMenuItem>`, input, toggle,
   checkbox, link, ícone clicável, área de hover, alça de drag.
3. Todo item de menu/submenu, com label exato e ação (`domains/<DOM>.index.json → menu_labels`).
4. Todo estado condicional: `disabled`, `hidden`, `aria-disabled`, badge, contador, cor/ícone de status,
   "loading/skeleton", empty state, tooltip, aviso.
5. Todo atalho de teclado e navegação por teclado (`index.json → shortcuts`).
6. Toda persistência/preferência (`index.json → prefs`).
7. Todo timer/rAF/watcher/job e cada `subscribe`/`addEventListener` (`index.json → timers, subscriptions`).
8. Todo símbolo de backend/preload e qual operação ele executa (`index.json → preload`).
9. Todo dialog/fluxo multi-etapa (passos, validações, erros, retry, cancelamento).
10. Todo teste do arquivo: use como **especificação** (`index.json → tests`). Teste sem linha
    correspondente = comportamento que você deixou escapar.

## Linha de inventário (JSON)
```json
{
  "id": "D03a-001",
  "capability": "habilidade do usuário, em pt-BR, frase curta e específica",
  "surface": "onde aparece (ex.: card de worktree, menu de contexto, header de projeto, dialog, background)",
  "trigger": "como é acionado (clique, hover, teclado, drag, timer, evento de store, condição)",
  "behaviors": ["sub-comportamentos: estados, validações, feedbacks, erros, ordem"],
  "background_activity": "none | descrição com gatilho e frequência",
  "state_inputs": ["store/seletor/pref consumido"],
  "backend_contract": ["window.orca.x -> handler"],
  "orca_evidence": ["components/sidebar/Arquivo.tsx:123", "components/sidebar/outro.ts:45"],
  "tests": ["components/sidebar/X.test.tsx:12 :: nome do teste"],
  "confidence": "verified | inferred"
}
```
IDs: `<DOM>-NNN`, sequencial, estável.

## Obrigações de cobertura (o que prova que nada escapou)
Escreva `domains/<DOM>.orca.json`:
```json
{ "domain": "<DOM>", "rows": [ ...linhas... ],
  "coverage": {
    "files":       {"Arquivo.tsx": ["D03a-001","D03a-004"]},
    "symbols":     {"exportName": ["D03a-002"]},
    "tests":       {"X.test.tsx:12 :: nome": "D03a-003"},
    "labels":      {"<label exato>": "D03a-005"},
    "hotkeys":     {"mod+shift+p": "D03a-006"},
    "prefs":       {"chave": "D03a-007"},
    "timers":      {"Arquivo.tsx:88 setInterval": "D03a-008"},
    "subscriptions": {"Arquivo.tsx:91 subscribe(x)": "D03a-009"},
    "preload":     {"window.orca.xyz": "D03a-010"}
  } }
```
Regras:
- `files`: **todo** arquivo produtivo do manifest deve aparecer, com ≥1 id.
- `symbols`, `labels`, `hotkeys`, `prefs`, `timers`, `subscriptions`, `preload`: **toda** entrada do
  `domains/<DOM>.index.json` deve aparecer mapeada a um id **ou** a uma justificativa literal:
  `"N/A: <razão>"`, `"INFRA: <razão> (test helper/type-only/constante)"`, `"DUP: <id que já cobre>"`.
- `tests`: **todo** caso de teste do manifest deve estar mapeado a um id ou `"INFRA: <razão>"`.
- Arquivos de teste têm que ter ≥1 linha de capability correspondente, exceto helpers puros de fixture.

## Saída (2 arquivos + retorno curto)
1. `docs/audits/orca-sidebar-parity/domains/<DOM>.orca.json` (linhas + coverage).
2. `docs/audits/orca-sidebar-parity/domains/<DOM>.coverage.md` — parede de evidência:
   tabela `entrada → id` para cada obrigação acima, com contagens no topo
   (`arquivos: N/N`, `símbolos: N/N`, `testes: N/N`, `labels: N/N`, `hotkeys: N/N`, `prefs: N/N`,
   `timers: N/N`, `subs: N/N`, `preload: N/N`) e a lista explícita do que ficou `N/A/INFRA/DUP`.
3. No retorno da tarefa: JSON curto `{domain, rows, uncovered: [...], top_findings: [até 10], coverage_counts}`.
   Não cole o inventário inteiro no retorno.

## Qualidade
- Prefira granularidade de comportamento: "adiciona worktree filho a partir do menu de contexto do pai
  com validação de elegibilidade" é bom; "gerencia worktrees" é inútil.
- Menus: liste **cada** item, com condição de exibição e ação.
- Fluxos: liste passos e estados de erro.
- Background: diga gatilho + frequência + o que atualiza na UI.
