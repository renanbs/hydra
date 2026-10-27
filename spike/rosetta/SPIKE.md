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
