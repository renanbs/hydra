import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import type { ContextMenuItem } from "./CustomContextMenu";
import { shouldSuppressContextMenuFollowUpClick } from "./sidebar/context-menu-click-debounce";
import {
  CLOSE_ALL_CONTEXT_MENUS_EVENT,
  restoreWorktreeSidebarFocus,
} from "./sidebar/worktree-context-menu-policy";
import { useEffect } from "react";

/**
 * Item 4 TODO Hydra: menus Radix com submenu no hover, num portal.
 * Renderiza `ContextMenuItem[]` (mesmo modelo do CustomContextMenu) sobre
 * Radix: `children` vira `DropdownMenuSub` (abre no hover, portal por padrão).
 */
export function RadixContextMenuItems({ items, onClose }: { items: ContextMenuItem[]; onClose: () => void }) {
  return (
    <>
      {items.map((item, idx) => {
        if (item.separator) return <DropdownMenuSeparator key={idx} />;
        if (item.isLabel) return <DropdownMenuLabel key={idx}>{item.label}</DropdownMenuLabel>;
        if (item.children && item.children.length > 0) {
          return (
            <DropdownMenuSub key={idx}>
              <DropdownMenuSubTrigger disabled={item.disabled}>
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {item.children.map((child, cidx) => {
                  if (child.separator) return <DropdownMenuSeparator key={cidx} />;
                  if (child.isLabel) return <DropdownMenuLabel key={cidx}>{child.label}</DropdownMenuLabel>;
                  return (
                    <DropdownMenuItem
                      key={cidx}
                      disabled={child.disabled}
                      variant={child.danger ? "destructive" : "default"}
                      title={child.title}
                      onSelect={() => {
                        child.onClick();
                        onClose();
                      }}
                    >
                      {child.icon}
                      <span>{child.label}</span>
                      {child.shortcut && <span className="ml-auto text-xs opacity-60">{child.shortcut}</span>}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        }
        return (
          <DropdownMenuItem
            key={idx}
            disabled={item.disabled}
            variant={item.danger ? "destructive" : "default"}
            title={item.title}
            onSelect={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.shortcut && <span className="ml-auto text-xs opacity-60">{item.shortcut}</span>}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

/**
 * Overlay de menu na posição do clique, montado em portal Radix.
 * Substitui o CustomContextMenu nos fluxos da sidebar (item 4);
 * o CustomContextMenu permanece só na aba do terminal.
 */
export function RadixContextMenu({
  x,
  y,
  items,
  onClose,
  onLifecycleComplete,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  /**
   * Orca `onLifecycleComplete`: fires on a later task, once the menu and any
   * sub-dialog/picker it opened have closed, so the caller can restore focus or
   * reveal a row without fighting the menu's unmount.
   */
  onLifecycleComplete?: () => void;
}) {
  // Why capture: the click that opened the menu (right-click release, card click)
  // can land on the card underneath and activate it. Keep it out for 500ms; menu
  // clicks are exempt so a fast first selection still works.
  useEffect(() => {
    const openedAt = Date.now();
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[role="menu"]')) return;
      if (!shouldSuppressContextMenuFollowUpClick(openedAt, Date.now())) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Orca `CLOSE_ALL_CONTEXT_MENUS_EVENT`: opening another sidebar menu closes this
  // one even when the new menu is portaled outside this subtree.
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, close);
    return () => window.removeEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, close);
  }, [onClose]);

  const handleOpenChange = (open: boolean): void => {
    if (open) return;
    onClose();
    // Orca lifecycle: schedule on the next task, after the menu's close/focus cycle.
    if (onLifecycleComplete) window.setTimeout(() => onLifecycleComplete(), 0);
  };

  return (
    <DropdownMenu open onOpenChange={handleOpenChange}>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={-8}
        alignOffset={-8}
        style={{ position: "fixed", left: x, top: y }}
        onCloseAutoFocus={(e) => {
          // Orca `handleCloseAutoFocus`: do not focus/scroll the trigger; land the
          // focus on the sidebar itself without scrolling.
          e.preventDefault();
          restoreWorktreeSidebarFocus();
        }}
      >
        <RadixContextMenuItems items={items} onClose={onClose} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
