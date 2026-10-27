import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { translate } from "@/i18n/i18n";
import { useShortcutKeyComboDetails } from "@/hooks/useShortcutLabel";
import { ShortcutKeyCombo } from "../ShortcutKeyCombo";

export function SidebarNav({
  onOpenWorktreePalette,
}: {
  onOpenWorktreePalette?: () => void;
}) {
  // Subscribe this nav to locale changes before using translate().
  useTranslation();
  const worktreePaletteShortcutCombos = useShortcutKeyComboDetails("worktree.palette");

  return (
    <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1" data-contextual-tour-target="sidebar-navigation">
      <button
        type="button"
        onClick={() => onOpenWorktreePalette?.()}
        aria-label={translate(
          "auto.components.sidebar.SidebarNav.0c3395fd32",
          "Search worktrees and browser tabs"
        )}
        className="group flex w-full items-center gap-2 rounded-md bg-worktree-sidebar-foreground/5 px-2 py-1.5 text-left text-[13px] font-medium tracking-tight text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/8"
      >
        <Search className="size-4 shrink-0 text-worktree-sidebar-foreground/30" strokeWidth={1.75} />
        <span className="flex-1">
          {translate("auto.components.sidebar.SidebarNav.80611a8b10", "Search")}
        </span>
        <span className="pointer-events-none hidden shrink-0 items-center gap-1 group-hover:flex group-focus-within:flex">
          {worktreePaletteShortcutCombos.map((combo) => (
            <ShortcutKeyCombo
              key={combo.keys.join("-")}
              keys={combo.keys}
              doubleTap={combo.doubleTap}
              className="inline-flex gap-0.5"
              keyCapClassName="min-w-4 border-worktree-sidebar-border/80 bg-worktree-sidebar-foreground/8 px-1 py-px text-[9px] text-worktree-sidebar-foreground/55 shadow-none"
              separatorClassName="text-[9px] text-worktree-sidebar-foreground/45"
            />
          ))}
        </span>
      </button>
    </div>
  );
}
