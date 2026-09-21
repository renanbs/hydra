import { useEffect, useRef, useState, useLayoutEffect } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  isLabel?: boolean;
  children?: ContextMenuItem[];
  onClick: () => void;
  title?: string;
}

interface CustomContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function CustomContextMenu({ x, y, items, onClose }: CustomContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x, y });
  const [openSubmenuIdx, setOpenSubmenuIdx] = useState<number | null>(null);
  const [submenuCoords, setSubmenuCoords] = useState<{ x: number; y: number } | null>(null);
  const submenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // allow submenu interactions
      if (menuRef.current?.contains(target) || submenuRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("contextmenu", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", onClose, { passive: true });
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("contextmenu", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", onClose);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 10;
    let adjustedX = x;
    let adjustedY = y;
    if (adjustedX + rect.width > window.innerWidth - padding) {
      adjustedX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (adjustedX < padding) adjustedX = padding;
    if (adjustedY + rect.height > window.innerHeight - padding) {
      adjustedY = Math.max(padding, window.innerHeight - rect.height - padding);
    }
    if (adjustedY < padding) adjustedY = padding;
    setCoords({ x: adjustedX, y: adjustedY });
  }, [x, y, items]);

  const handleSubmenuOpen = (idx: number, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const menuW = 208; // w-52
    let sx = rect.right + 6;
    let sy = rect.top - 6;
    if (sx + menuW > window.innerWidth - 8) {
      sx = rect.left - menuW - 6;
    }
    if (sy < 8) sy = 8;
    setSubmenuCoords({ x: sx, y: sy });
    setOpenSubmenuIdx(idx);
  };

  const renderItem = (item: ContextMenuItem, idx: number) => {
    if (item.isLabel) {
      return (
        <div key={idx} className="px-2 py-1 text-[11px] font-medium text-muted-foreground text-neutral-500 tracking-wide">
          {item.label}
        </div>
      );
    }
    const hasChildren = item.children && item.children.length > 0;
    return (
      <div key={idx}>
        {item.separator && <div className="h-px bg-border my-1" />}
        <button
          disabled={item.disabled && !hasChildren}
          title={item.title}
          onClick={() => {
            if (item.disabled) return;
            if (hasChildren) return;
            item.onClick();
            onClose();
          }}
          onMouseEnter={(e) => {
            if (hasChildren && !item.disabled) handleSubmenuOpen(idx, e.currentTarget);
            else if (!hasChildren) setOpenSubmenuIdx(null);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
            item.disabled
              ? "opacity-40 cursor-not-allowed text-neutral-500"
              : item.danger
              ? "hover:bg-red-500/20 text-red-400 cursor-pointer"
              : "hover:bg-accent text-popover-foreground hover:text-foreground cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {item.icon && <span className="text-neutral-400 shrink-0">{item.icon}</span>}
            <span className="text-[11px] truncate">{item.label}</span>
          </div>
          <span className="flex items-center gap-1 shrink-0 ml-2">
            {item.shortcut && <span className="text-[10px] text-neutral-500 font-mono">{item.shortcut}</span>}
            {hasChildren && <span className="text-neutral-500 text-[10px]">▶</span>}
          </span>
        </button>
      </div>
    );
  };

  const activeSubmenu = openSubmenuIdx !== null ? items[openSubmenuIdx]?.children : null;

  return (
    <>
      <div
        ref={menuRef}
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-[99999] w-56 rounded-xl bg-popover border border-border p-1.5 shadow-2xl text-xs select-none backdrop-blur-md text-popover-foreground"
      >
        {items.map((item, idx) => renderItem(item, idx))}
      </div>
      {activeSubmenu && submenuCoords && (
        <div
          ref={submenuRef}
          style={{ left: `${submenuCoords.x}px`, top: `${submenuCoords.y}px` }}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setOpenSubmenuIdx(null)}
          className="fixed z-[99999] w-52 rounded-xl bg-popover border border-border p-1.5 shadow-2xl text-xs select-none backdrop-blur-md text-popover-foreground"
        >
          {activeSubmenu.map((sub, sIdx) => (
            <div key={sIdx}>
              {sub.separator && <div className="h-px bg-border my-1" />}
              {sub.isLabel ? (
                <div className="px-2 py-1 text-[11px] font-medium text-neutral-500">{sub.label}</div>
              ) : (
                <button
                  disabled={sub.disabled}
                  title={sub.title}
                  onClick={() => {
                    if (sub.disabled) return;
                    if (sub.children && sub.children.length > 0) return;
                    sub.onClick();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    sub.disabled
                      ? "opacity-40 cursor-not-allowed text-neutral-500"
                      : sub.danger
                      ? "hover:bg-red-500/20 text-red-400 cursor-pointer"
                      : "hover:bg-neutral-800/80 text-neutral-200 hover:text-white cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sub.icon && <span className="text-neutral-400 shrink-0">{sub.icon}</span>}
                    <span className="text-[11px] truncate">{sub.label}</span>
                  </div>
                  {sub.shortcut && <span className="text-[10px] text-neutral-500 font-mono ml-2 shrink-0">{sub.shortcut}</span>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
