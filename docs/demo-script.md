# Demo Hydra ADE — roteiro 60s (gravar quando houver release instalado)

Slot: `docs/demo.mp4` + thumbnail `docs/demo-thumb.png` (16:9, 1600×900).
Referência no README aponta para aqui até o vídeo existir.

## Roteiro

| t | plano | ação | narração |
|---|---|---|---|
| 0–8s | hero vazio → Add Project | clicar **Add Project**, escolher pasta | "Hydra orquestra agentes em worktrees isolados." |
| 8–20s | Create workspace (`Ctrl+N`) | criar workspace, mostrar card + badge Idle | "Cada agente vive no seu branch, sem sujar o teu working dir." |
| 20–35s | New terminal (`Ctrl+T`) | abrir terminal, correr `git status` + build curto | "Terminal real com shadow buffer — fechar a janela não mata nada." |
| 35–50s | Agent feed + tool approval | mostrar feed Idle → Working, card Approve/Reject | "Estados ao vivo, aprovações com um clique." |
| 50–60s | Settings → versão + update | rodapé: `Hydra vX.Y.Z`, `update available` | "E o updater trata do resto." |

## Notas de gravação

- Wayland: `wf-recorder -g "$(slurp)" -f docs/demo.mp4` ou `spectacle --record`.
- Esconder `~/.ssh` labels reais; usar projeto de exemplo.
- Sem áudio de sistema; narração em pós ou legendas.
