import { useEffect, useRef, useState, useLayoutEffect } from "react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import { RadixContextMenuItems } from "./RadixContextMenu";

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
  const submenuTimerRef = useRef<number | undefined>(undefined);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [highlightedSubIndex, setHighlightedSubIndex] = useState<number>(-1);

  const getInteractiveIndices = (itemList: ContextMenuItem[]): number[] =>
    itemList
      .map((item, idx) => (!item.isLabel && !item.disabled ? idx : -1))
      .filter((idx) => idx !== -1);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current?.contains(target) || submenuRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeSubmenu = openSubmenuIdx !== null ? items[openSubmenuIdx]?.children : null;
      const isSubmenuFocused = activeSubmenu && highlightedSubIndex >= 0;

      if (e.key === "Escape") {
        e.preventDefault();
        if (openSubmenuIdx !== null) {
          setOpenSubmenuIdx(null);
          setHighlightedSubIndex(-1);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (isSubmenuFocused && activeSubmenu) {
          const valid = getInteractiveIndices(activeSubmenu);
          if (valid.length === 0) return;
          const curPos = valid.indexOf(highlightedSubIndex);
          const nextPos = curPos === -1 || curPos === valid.length - 1 ? 0 : curPos + 1;
          setHighlightedSubIndex(valid[nextPos]);
        } else {
          const valid = getInteractiveIndices(items);
          if (valid.length === 0) return;
          const curPos = valid.indexOf(highlightedIndex);
          const nextPos = curPos === -1 || curPos === valid.length - 1 ? 0 : curPos + 1;
          setHighlightedIndex(valid[nextPos]);
        }
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isSubmenuFocused && activeSubmenu) {
          const valid = getInteractiveIndices(activeSubmenu);
          if (valid.length === 0) return;
          const curPos = valid.indexOf(highlightedSubIndex);
          const nextPos = curPos <= 0 ? valid.length - 1 : curPos - 1;
          setHighlightedSubIndex(valid[nextPos]);
        } else {
          const valid = getInteractiveIndices(items);
          if (valid.length === 0) return;
          const curPos = valid.indexOf(highlightedIndex);
          const nextPos = curPos <= 0 ? valid.length - 1 : curPos - 1;
          setHighlightedIndex(valid[nextPos]);
        }
        return;
      }

      if (e.key === "ArrowRight") {
        const item = items[highlightedIndex];
        if (item && item.children && item.children.length > 0) {
          e.preventDefault();
          const button = menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']")[highlightedIndex];
          if (button) handleSubmenuOpen(highlightedIndex, button);
          const valid = getInteractiveIndices(item.children);
          if (valid.length > 0) setHighlightedSubIndex(valid[0]);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        if (openSubmenuIdx !== null) {
          e.preventDefault();
          setOpenSubmenuIdx(null);
          setHighlightedSubIndex(-1);
        }
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isSubmenuFocused && activeSubmenu) {
          const sub = activeSubmenu[highlightedSubIndex];
          if (sub && !sub.disabled) {
            sub.onClick();
            onClose();
          }
        } else if (highlightedIndex >= 0) {
          const item = items[highlightedIndex];
          if (!item || item.disabled) return;
          if (item.children && item.children.length > 0) {
            const button = menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']")[highlightedIndex];
            if (button) handleSubmenuOpen(highlightedIndex, button);
            const valid = getInteractiveIndices(item.children);
            if (valid.length > 0) setHighlightedSubIndex(valid[0]);
          } else {
            item.onClick();
            onClose();
          }
        }
      }
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
      clearTimeout(submenuTimerRef.current);
    };
  }, [highlightedIndex, highlightedSubIndex, items, onClose, openSubmenuIdx]);

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

  const scheduleSubmenuOpen = (idx: number, anchor: HTMLElement) => {
    clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = window.setTimeout(() => {
      handleSubmenuOpen(idx, anchor);
    }, 120);
  };

  const scheduleSubmenuClose = () => {
    clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = window.setTimeout(() => {
      setOpenSubmenuIdx(null);
      setHighlightedSubIndex(-1);
    }, 150);
  };

  const cancelSubmenuClose = () => {
    if (submenuTimerRef.current !== undefined) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = undefined;
    }
  };

  const renderItem = (item: ContextMenuItem, idx: number) => {
    if (item.isLabel) {
      return (
        <div key={idx} className="px-2 py-1 text-[11px] font-medium text-neutral-500 tracking-wide select-none">
          {item.label}
        </div>
      );
    }
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isHighlighted = highlightedIndex === idx;
    const isSubmenuOpen = openSubmenuIdx === idx;

    return (
      <div key={idx}>
        {item.separator && <div className="h-px bg-border my-1" />}
        <button
          role="menuitem"
          tabIndex={-1}
          aria-haspopup={hasChildren ? "menu" : undefined}
          aria-expanded={hasChildren ? isSubmenuOpen : undefined}
          disabled={item.disabled && !hasChildren}
          title={item.title}
          onClick={() => {
            if (item.disabled) return;
            if (hasChildren) return;
            item.onClick();
            onClose();
          }}
          onMouseEnter={(e) => {
            setHighlightedIndex(idx);
            if (hasChildren && !item.disabled) {
              scheduleSubmenuOpen(idx, e.currentTarget);
            } else {
              scheduleSubmenuClose();
            }
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
            item.disabled
              ? "opacity-40 cursor-not-allowed text-neutral-500"
              : isHighlighted || isSubmenuOpen
              ? item.danger
                ? "bg-red-500/25 text-red-300"
                : "bg-accent text-accent-foreground"
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
        role="menu"
        aria-orientation="vertical"
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-[99999] w-56 rounded-xl bg-popover border border-border p-1.5 shadow-2xl text-xs select-none backdrop-blur-md text-popover-foreground animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {items.map((item, idx) => renderItem(item, idx))}
      </div>
      {activeSubmenu && submenuCoords && (
        <div
          ref={submenuRef}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={cancelSubmenuClose}
          onMouseLeave={scheduleSubmenuClose}
          style={{ position: "fixed", left: submenuCoords.x, top: submenuCoords.y, width: 0, height: 0 }}
        >
          {/* Item 4: submenu do terminal em Radix (hover, portal); top-level mantém Custom. */}
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger style={{ display: "none" }} />
            <DropdownMenuSubContent sideOffset={0} alignOffset={0}>
              <RadixContextMenuItems items={activeSubmenu} onClose={onClose} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </div>
      )}
    </>
  );
}
