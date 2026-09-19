import { useEffect } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
  onClick: () => void;
}

interface CustomContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function CustomContextMenu({ x, y, items, onClose }: CustomContextMenuProps) {
  useEffect(() => {
    const handleOutsideClick = () => onClose();
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("contextmenu", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("contextmenu", handleOutsideClick);
    };
  }, [onClose]);

  // Protected positioning against window bounds
  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - (items.length * 30 + 20));

  return (
    <div
      style={{ left: `${menuX}px`, top: `${menuY}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[99999] w-52 rounded-lg bg-[#141518] border border-[#28292e] p-1 shadow-2xl text-xs select-none backdrop-blur-md"
    >
      {items.map((item, idx) => (
        <div key={idx}>
          {item.separator && <div className="h-px bg-[#222327] my-1" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
              item.danger
                ? "hover:bg-red-500/20 text-red-400"
                : "hover:bg-neutral-800/80 text-neutral-200 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {item.icon && <span className="text-neutral-400">{item.icon}</span>}
              <span className="text-[11px]">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-[10px] text-neutral-500 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
