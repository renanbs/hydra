import { useEffect, useRef, useState, useLayoutEffect } from "react";

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x, y });

  useEffect(() => {
    const handleOutsideClick = () => onClose();
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("contextmenu", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("contextmenu", handleOutsideClick);
    };
  }, [onClose]);

  // Medição precisa da DOM após a montagem para ajuste de colisão nas 4 bordas (Orca style)
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 10;

    let adjustedX = x;
    let adjustedY = y;

    // Colisão direita
    if (adjustedX + rect.width > window.innerWidth - padding) {
      adjustedX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    // Colisão esquerda
    if (adjustedX < padding) {
      adjustedX = padding;
    }

    // Colisão inferior
    if (adjustedY + rect.height > window.innerHeight - padding) {
      adjustedY = Math.max(padding, window.innerHeight - rect.height - padding);
    }
    // Colisão superior
    if (adjustedY < padding) {
      adjustedY = padding;
    }

    setCoords({ x: adjustedX, y: adjustedY });
  }, [x, y, items]);

  return (
    <div
      ref={menuRef}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[99999] w-56 rounded-xl bg-[#141518] border border-[#28292e] p-1.5 shadow-2xl text-xs select-none backdrop-blur-md"
    >
      {items.map((item, idx) => (
        <div key={idx}>
          {item.separator && <div className="h-px bg-[#222327] my-1" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
              item.danger
                ? "hover:bg-red-500/20 text-red-400"
                : "hover:bg-neutral-800/80 text-neutral-200 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {item.icon && <span className="text-neutral-400 shrink-0">{item.icon}</span>}
              <span className="text-[11px] truncate">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-[10px] text-neutral-500 font-mono ml-2 shrink-0">
                {item.shortcut}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
