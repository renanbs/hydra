import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { 
  Terminal, 
  Smartphone, 
  Settings, 
  Search
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTerminal: () => void;
  onOpenSettings: () => void;
  onOpenPairing: () => void;
  onSwitchTab: (tabId: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNewTerminal,
  onOpenSettings,
  onOpenPairing,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99998] flex items-start justify-center pt-24 bg-black/65 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-[540px] rounded-xl bg-popover border border-border shadow-2xl overflow-hidden text-xs text-popover-foreground"
      >
        <Command label="Hydra Command Palette" className="w-full">
          <div className="flex items-center gap-2.5 px-3 border-b border-border bg-popover">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search workspace..."
              className="w-full h-11 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-sans"
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            <Command.Empty className="p-4 text-center text-neutral-500 text-xs font-mono">
              No matching commands or files.
            </Command.Empty>

            <Command.Group heading="Navigation & Terminals" className="text-[10px] uppercase font-bold text-neutral-500 px-2 py-1 tracking-wider">
              <Command.Item
                onSelect={() => {
                  onNewTerminal();
                  onClose();
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Spawn New Terminal Session</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+T</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Preferences & Companion" className="text-[10px] uppercase font-bold text-neutral-500 px-2 py-1 tracking-wider mt-2">
              <Command.Item
                onSelect={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">Open Hydra Settings</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+,</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onOpenPairing();
                  onClose();
                }}
                className="flex items-center justify-between px-2.5 py-2 rounded text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Pair Mobile Companion (E2EE QR)</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">Mobile</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="h-8 border-t border-border px-3 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/40 font-mono">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>Esc to close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
