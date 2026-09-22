# Acordos — Paridade de Temas e Aparência Hydra ↔ Orca

**Worktree:** `renanbs/theme-parity` (`/home/renan/orca/workspaces/hydra/theme-parity`)  
**Base:** `main:91e356d` → `theme-parity` 9 commits (`9e9499f` → `0dd6ddb`)  
**Data:** 2026-09-21  
**Regra de ouro:** nunca `vite` solo — sempre `pnpm tauri dev` (Hydra Host Rust + Tauri, `portable-pty`/`vt100`).

---

## 1. O que combinamos

1. **3 blocos colapsáveis fiel Orca em `Appearance`** — `Interface` / `Terminal` / `Window & Sidebar` como `AppearanceSection.tsx:23` (`grid-rows-[0fr/1fr]`, `ChevronRight rotate-90`, `summary` quando fechado, `toggleDisabled` em busca).
2. **Toggle, não checkbox** — todo boolean nos 3 blocos usa `Switch` (`SettingsSwitchRow` / `relative inline-flex h-5 w-9`) não `input checkbox`.
3. **Sem simplificar, trazer fiel** — portar controles 1:1, não atalho. Exceção: `App Icon` não trazer (pedido).
4. **Status Bar trazer** — `Window & Sidebar` precisa de Status Bar (pedido explícito).
5. **Preview fiel** — `TerminalSettingsPreview` 36x15 com `LigaturesAddon`, `composeActiveTerminalTheme`, `minimumContrastRatio`, `PREVIEW_BUFFER` idêntico.
6. **Posição e colapso idênticos** — cada config na mesma posição e mesmo disclosure (visível vs `Advanced` collapsed) que no Orca.
7. **Rust melhor quando possível** — `theme_import.rs` com `spawn_blocking` + timeout + `serde_yaml` ao invés de JS.

---

## 2. Escopo fechado — ponto a ponto Orca vs Hydra

### 2.1 Interface (`AppearanceInterfaceSection.tsx:48`)

| Orca | Hydra | Posição + colapso | Ação |
|------|-------|-------------------|------|
| Theme `system/dark/light` `SegmentedControl` | `theme` `SegmentedControl` | Interface visível | ✅ |
| UI Zoom `UIZoomControl` | Hydra não tem `uiZoom` | — | Não trazer |
| IDE Font `FontAutocomplete` | `app_font_family` `FontAutocomplete` | Interface visível | ✅ |
| UI Language `Select` | Hydra não tem `ui_language` | — | Não trazer |
| Advanced disclosure collapsed: Titlebar App Name `Switch`, Minimize to Tray (Win), Menu Bar Icon (Mac) | Hydra não tinha | Interface advanced collapsed | **Não trazer** (Hydra não tem, manter fora) |
| App Icon `AppIconSelector` fora dos 3 blocos `AppearancePane.tsx:281` | **Não trazer** (pedido) | — | Excluído |

### 2.2 Terminal (`TerminalAppearanceSection.tsx:72`)

| Orca | Hydra | Posição + colapso | Ação |
|------|-------|-------------------|------|
| Primary: Font Family `FontAutocomplete` + Font Size `TerminalFontSizeSetting` | `terminal_font_family/size` | Terminal Primary visível | ✅ fiel |
| Advanced disclosure collapsed: Weight `NumberField`, Bold Weight, LineHeight 1-3, Ligatures `Auto/On/Off` com `fontFamilyHasKnownLigatures` per-font | Hydra tinha grid flat com `input` | Terminal Advanced collapsed | ✅ `f5a488b` + `a52b35e` |
| Theme Catalog `TerminalThemeCatalogSection.tsx:78` — Target `Dark/Light`, `Match dark`, `ThemePicker` 80 cap + swatches + Divider + `advancedContent` + Preview 36x15 + Ghostty/Warp modals | Hydra `TerminalThemeCatalogSection` fiel + `advancedContent` | Terminal visível (Target/Match/Picker/Divider) + `advancedContent` collapsed | ✅ |
| advancedContent → Cursor `TerminalCursorAppearanceSection.tsx:18` Shape `Bar/Block/Underline` `Segmented` + Blinking `Switch` + Cursor Opacity `NumberField` 0-1 | `terminal_cursor_*` | Terminal advancedContent collapsed | ✅ |
| advancedContent → Pane `TerminalPaneAppearanceSection.tsx:13` Inactive Opacity 0-1 + Divider Thickness 1-32 | `terminal_inactive_pane_opacity`, `terminal_divider_thickness_px` | Mesmo disclosure | ✅ |
| advancedContent → Window `TerminalWindowSection.tsx:20` Background Opacity 0-1 + Window Blur `Switch` + restart banner `blurAtMountRef` + Padding X/Y 0-512 + Hide Mouse `Switch` + Color Overrides expansível `COLOR_OVERRIDE_GROUPS` (Base 7 + Normal 8 + Bright 8) + Reset | `terminal_background_opacity`, `window_background_blur`, `terminal_padding_x/y`, `terminal_mouse_hide_while_typing`, `terminal_color_overrides` | Mesmo disclosure, `Toggle` | ✅ (Color Overrides com `colorOverridesExpanded`) |

### 2.3 Window & Sidebar (`AppearanceWindowSidebarSection.tsx:62`)

| Orca | Hydra | Posição + colapso | Ação |
|------|-------|-------------------|------|
| LeftSidebar `default/tinted` + tint color/opacity `LeftSidebarAppearanceSetting` | `left_sidebar_appearance_mode` `Segmented` + tint | Window visível | ✅ |
| Status Bar visível: `Usage Percentage` `Used/Remaining` `Segmented` + toggles `resource-usage`/`ports`/`ssh`/`claude`/`codex`/`gemini`/… `Switch` | Hydra não tinha → **trazido** `0dd6ddb` `status_bar_items`/`usage_percentage_display` | Window visível | ✅ trazido |
| Advanced disclosure collapsed: Sidebar `Compact/Detailed` `Show Tasks/Automations/Mobile` `Pinned in groups` `Switch` | Hydra tem `showTasksButton` fora, não em Appearance | Advanced collapsed | Não trazer por enquanto (Hydra decide) |
| Advanced: File Explorer `Show Git-Ignored` `Switch` | Hydra não tem `showGitIgnoredFiles` em Appearance | Advanced collapsed | Não trazer |

**Fora dos 3 blocos (Hydra mantém em Workspace → Terminal, Orca `TerminalPane.tsx:49`):** `terminal_default_shell`, `Rendering` (GPU/Contrast/Inline), `Interaction` (scroll, right-click, focus, copy), `Advanced` (scrollback, wordSeparator), `Manage Sessions`, `Setup Script`, `Open In Apps` — não movidos.

---

## 3. Implementação fiel — arquivos

**Novos/portados:**
- `src/components/settings/AppearanceSection.tsx:23` (port Orca 83 linhas)
- `src/components/settings/AppearancePane.tsx:44` (3 blocos, `open Set`, `toggle`)
- `src/components/settings/TerminalThemePicker.tsx:1` (80 cap, swatches, highlight)
- `src/components/settings/TerminalSettingsPreview.tsx:1` (352→116 linhas, `buildDefaultTerminalOptions`, `buildFontFamily`, `composeActiveTerminalTheme`, `resolveTerminalMinimumContrastRatio`, `LigaturesAddon`, `PREVIEW_BUFFER`)
- `src/lib/pane-manager/pane-terminal-options.ts:31`, `src/components/terminal-pane/layout-serialization.ts:52`, `src/components/terminal-pane/terminal-appearance.ts:54`, `src/lib/terminal-contrast-correction.ts:25`, `src/shared/terminal-ligatures.ts:50`, `src/shared/terminal-line-height-settings.ts:4`, `src/shared/terminal-minimum-contrast-settings.ts:11`, `src/components/settings/terminal-preview-content.ts:15`
- `src-tauri/src/theme_import.rs:1` (Ghostty palette 0-15, Warp YAML `serde_yaml`, `spawn_blocking` 4s, `MAX_200`)

**Alterados:**
- `src/App.css:1` — `@theme` 40 tokens, `editor-surface`, `orca-security`, `grid-rows`, `scrollbar-sleek`, `titlebar` + `xterm-cursor` opacity + `window-blur`
- `src/shared/settings-types.ts:10` — `left_sidebar_*`, `window_blur`, `editor_*`, `terminal_padding/cursorOpacity/mouseHide/scopeHistory`, `status_bar_items`/`usage_percentage_display`
- `src-tauri/src/db.rs:217` — mesmas chaves com `serde alias` + `default_status_bar_items`
- `src/components/SettingsModal.tsx:423` — `Appearance` agora só `<AppearancePane ... />` (3 colapsáveis), `Terminal` só não-aparência

---

## 4. Como rodar e verificar

```bash
cd /home/renan/orca/workspaces/hydra/theme-parity
pnpm exec tsc --noEmit # 0
cargo check            # 52 warnings snake_case intencionais (JS compat)
pnpm run build         # 2015 modules, 92.44kB CSS
pnpm tauri dev         # não `pnpm dev` solo — Tauri Host Rust + Vite 1420
# Abrir Settings → Appearance → ver 3 headers colapsáveis com ChevronRight rotate-90, Switch em todos booleans, Terminal preview 36x15 com ligatures fi fl
```

**Commits:** `9e9499f` tema, `e300106` picker fiel, `1734f5b` dedup, `0a17547` Typography/Cursor/Pane/Window, `5fae703` Appearance 3 blocos, `dd287e8` wire 6, `12a73e2` sidebar tint, `f5a488b` preview fiel, `a52b35e` toggle, `0dd6ddb` status bar.

---

## 5. Decisões

- App Icon excluído a pedido.
- UI Zoom/Language/Status Bar (Orca) não trazidos exceto Status Bar (pedido).
- Hydra `terminal_active_pane_opacity`/`transition` mantidos em `Window` (Orca só mostra `Inactive` + `Divider` em Pane, mas Hydra mantém por compat).

---

*Caminho completo deste arquivo:* `/home/renan/orca/workspaces/hydra/theme-parity/docs/THEME_PARITY_AGREEMENTS.md`
