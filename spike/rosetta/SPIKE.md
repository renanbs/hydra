# Spike: camada Rosetta (Orca renderer sobre o core Rust)

Pergunta: dá para copiar o renderer do Orca e ligar no Hydra por um shim, em vez de
portar capability por capability?

Resposta curta: **sim para o boundary; o custo está nos backends, não no HTML/CSS/JS.**

Referência: `~/src/orca` em `e49b3aa0bd`, React 19.2.8, Electron, `window.api` como
única ponte com o main process.

## O que foi provado

| prova | resultado |
|---|---|
| build do `SidebarRoot` real com o toolchain do Hydra | **sucesso** (`vite build`, só `@`/`@renderer` + 2 aliases de xterm) |
| mount do `SidebarRoot` real em jsdom | **sucesso**: 112 nós pintados com `window.api` gerado |
| chamadas de API no primeiro paint | **7**: `e2e.getConfig`, `platform.get`, `preflight.check`, `jira.status`, `linear.status`, `mobile.listDevices`, `ui.onFileDrop` |
| superfície total do preload | **83 grupos / 968 métodos** (gerados de `src/preload/api-types.ts`) |
| grupos que o sidebar toca | **16**, com 39 chamadas distintas |
| imports de `electron` no sidebar | **0** |
| acoplamento real | store do Orca: 872 arquivos, 545 `useAppStore`, 531 campos |

## Ferramentas do spike

- `generate.mjs` — usa a API do TypeScript para resolver `PreloadApi` e gerar
  `generated/window-api.generated.ts` (um `method()` por membro, todas registradas
  num ledger `window.__rosettaLog`) + `generated/coverage.json`.
- `vite.config.ts` + `sidebar-probe.tsx` — build do `SidebarRoot` com aliases do Orca.
- `vitest.config.ts` + `mount.test.tsx` + `setup.ts` — mount real com o shim, contando
  chamadas e erros.

## O que o mount exigiu (além do shim)

1. **Providers do shell**: `TooltipProvider` → `ConfirmationDialogProvider` →
   `LinkRoutingPreferenceDialogProvider`. Sem eles o sidebar aborta.
2. **React único**: o renderer do Orca traz React 19.2.8; o host precisa apontar
   `react`/`react-dom`/`jsx-runtime` para a mesma instância (senão hooks quebram).
3. `ResizeObserver` e `matchMedia` no ambiente de teste (o webview real já tem).

## O que ainda falta para production (não é HTML/CSS)

- **Store do Orca**: 872 arquivos + 545 seletores. Ou é shipada com o renderer, ou o
  shim precisa sintetizar o `AppState` — hoje não há caminho barato para o segundo.
- **Eventos**: 193 subscrições no sidebar (`window.api.on*`) → precisam de `listen`
  Tauri com o mesmo contrato (não implementado no spike).
- **Backends ausentes**: dos 16 grupos usados, `e2e`, `updater`, `feedback`,
  `onboarding`, `ephemeralVm`, `jira`, `linear`, `mobile`, `agentTrust` não têm
  equivalente no Hydra; o shim registra e devolve `undefined` (UI abre vazia).
- **CSS/tokens**: o bundle resolvido não carrega os 228 KB de CSS do Orca; sem os
  tokens o sidebar monta sem estilo.
- **Licença**: MIT — o cabeçalho de atribuição que o repo já usa continua obrigatório.

## Próximo passo recomendado

1. Levar o spike para o webview real (Tauri) com o shim gerado e o store do Orca
   **shipado**, apontando 3 grupos (`repos`, `ssh`, `ui`) para comandos Hydra reais.
2. Medir tempo de boot e nº de chamadas órfãs em uso real.
3. Só então decidir: migrar a árvore inteira (e aposentar o port manual) ou manter o
   port e usar o shim apenas em folhas.

Nada deste diretório entra no bundle do app (`src` não importa `spike/`).

---

# Fase 2 — webview real (2026-10-27)

Objetivo: sair do jsdom e rodar o sidebar do Orca **dentro do Tauri**, com a store
do Orca e três grupos (`repos`, `ssh`, `ui`) ligados a comandos Hydra.

## Arquitetura usada

```
janela "rosetta" (Tauri)
└── http://localhost:1420/rosetta-host.html   ← origem local, IPC permitido
    └── iframe → http://localhost:1421/spike/rosetta-webview/  ← renderer do Orca
        (React único, '@' → Orca, store do Orca)
    window.api → postMessage → host → invoke() → Rust
```

Por que o iframe: uma origem **remota** (`WebviewUrl::External`) não consegue chamar
comandos Tauri mesmo com `remote.urls` na capability (`get_app_version not allowed.
Plugin not found`). O host local faz o RPC; o iframe só desenha.

## Medições (boot real)

| métrica | valor |
|---|---|
| sidebar do Orca renderizado no Tauri | **sim** (window "Rosetta spike — Orca sidebar") |
| store hidratada pelo catálogo Hydra | **repos=7, projects=7** |
| worktrees carregadas | **0** (o sidebar sozinho não dispara scan) |
| chamadas sem binding (órfãs) | **6 caminhos** |
| grupos órfãos | `preflight`, `linear`, `jira`, `mobile`, `runtimeEnvironments`, `gh` |

Órfãos exatos no boot: `preflight.check`, `linear.status`, `jira.status` (x6),
`mobile.listDevices`, `runtimeEnvironments.list`,
`gh.reportVisiblePRRefreshCandidates`.

Ligados com sucesso: `repos.list`, `projects.list`, `projects.listHostSetups`,
`platform.get`, `ui.onFileDrop`, `repos.*` (pick/create/clone), `ssh.listTargets`,
`ssh.listRemovedTargetLabels`, `shell.*`.

## Aprendizados de engenharia (custam tempo se descobertos tarde)

1. **Origem remota não fala IPC**: host local + iframe é o caminho; `remote.urls`
   não foi suficiente no Tauri 2.
2. **Preload tem métodos síncronos** (`platform.get`, `e2e.getConfig`): promisificar
   tudo gera loop de retry (foram 88 chamadas em ~1s antes do binding local).
3. **React duplicado** quebra hooks quando Orca e Hydra dividem o mesmo grafo; o
   iframe isola naturalmente.
4. **lucide diverge** (Orca 0.577 ainda tem ícones de marca; Hydra 1.x não).
5. O CSS do Orca não entra junto: a janela monta sem estilo (228 KB de tokens).

## Leitura para a decisão

Com 3 grupos ligados, sobraram **6 caminhos órfãos em 6 grupos**, todos de produto
(Linear/Jira/Mobile/gh/preflight/runtime) — não de UI. `preflight.check` mapeia para
um comando Hydra existente; os outros cinco exigem backend novo.

Custo estimado para migrar a árvore inteira: implementar/estubar explicitamente os
grupos de produto restantes e shipar a store (872 arquivos) + `listen` bridge. Ganho:
cada correção do Orca entra por cópia; a auditoria deixa de cobrir componentes copiados.
