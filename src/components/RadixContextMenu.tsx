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
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  return (
    <DropdownMenu open onOpenChange={(open) => !open && onClose()}>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={-8}
        alignOffset={-8}
        style={{ position: "fixed", left: x, top: y }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <RadixContextMenuItems items={items} onClose={onClose} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
