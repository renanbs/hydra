import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  X, 
  Palette, 
  TextCursorInput, 
  Keyboard, 
  FolderGit2, 
  Shield, 
  Check, 
  Sliders
} from "lucide-react";

export interface HydraSettings {
  // Appearance (Orca style)
  theme: "dark" | "oled" | "system";
  terminal_font_family: string;
  terminal_font_size: number;
  terminal_cursor_style: string;
  terminal_cursor_blink: boolean;
  terminal_gpu_acceleration: "auto" | "on" | "off";
  // Input & Editing (Orca style)
  primary_selection_middle_click_paste: boolean;
  // Security & Gate
  auto_approve_reads: boolean;
  notification_on_blocked: boolean;
  // Workspace & Git
  default_branch_prefix: string;
  workspace_dir: string;
}

const DEFAULT_SETTINGS: HydraSettings = {
  theme: "dark",
  terminal_font_family: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  terminal_font_size: 12,
  terminal_cursor_style: "block",
  terminal_cursor_blink: true,
  terminal_gpu_acceleration: "auto",
  primary_selection_middle_click_paste: true,
  auto_approve_reads: true,
  notification_on_blocked: true,
  default_branch_prefix: "feat/",
  workspace_dir: "/home/renan/src",
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: HydraSettings) => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "input" | "shortcuts" | "security" | "git">("appearance");
  const [settings, setSettings] = useState<HydraSettings>(DEFAULT_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState("");

  useEffect(() => {
    if (isOpen) {
      invoke<HydraSettings>("get_settings")
        .then((s) => {
          if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    invoke("save_settings", { settings })
      .then(() => {
        setSavedFeedback(true);
        onSaved?.(settings);
        setTimeout(() => setSavedFeedback(false), 2000);
      })
      .catch(console.error);
  };

  const SHORTCUTS = [
    { action: "Command Palette", chord: "Ctrl+P", category: "Global Navigation", desc: "Quick search and command dispatcher" },
    { action: "Toggle Left Sidebar", chord: "Ctrl+B", category: "Layout", desc: "Toggle Worktree / Fleet sidebar" },
    { action: "Toggle Agent Panel", chord: "Ctrl+J", category: "Layout", desc: "Toggle active agent panel" },
    { action: "Open Settings", chord: "Ctrl+,", category: "Preferences", desc: "Open Hydra preferences hub" },
    { action: "New Terminal Tab", chord: "Ctrl+T", category: "Terminal", desc: "Spawn fresh bash PTY in active workbench" },
    { action: "Close Tab", chord: "Ctrl+W", category: "Workbench", desc: "Close focused editor or terminal tab" },
    { action: "Copy Terminal Selection", chord: "Ctrl+Shift+C", category: "Terminal", desc: "Copy highlighted text to system clipboard" },
    { action: "Paste to Terminal", chord: "Ctrl+Shift+V", category: "Terminal", desc: "Paste system clipboard into active PTY" },
    { action: "Clear Terminal Screen", chord: "Ctrl+L", category: "Terminal", desc: "Clear visible scrollback buffer" },
    { action: "Approve Tool Execution", chord: "Ctrl+Enter", category: "Agent Gate", desc: "Approve pending human-in-the-loop tool call" },
    { action: "Reject Tool Execution", chord: "Escape", category: "Agent Gate", desc: "Reject pending tool execution request" },
  ];

  const filteredShortcuts = SHORTCUTS.filter(
    (s) => s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) || s.chord.toLowerCase().includes(shortcutFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-[680px] rounded-xl bg-[#111214] border border-[#26272b] shadow-2xl flex flex-col overflow-hidden text-xs text-neutral-300">
        {/* Header */}
        <div className="h-11 border-b border-[#222] px-4 flex items-center justify-between bg-[#141518]">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Hydra Settings Hub</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split: Left Navigation + Content */}
        <div className="flex h-[420px]">
          {/* Orca 100% Navigation Menu */}
          <div className="w-48 border-r border-[#222] bg-[#0e0f11] p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
              Interface & Desktop
            </div>

            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === "appearance" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab("input")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === "input" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <TextCursorInput className="w-3.5 h-3.5 text-blue-400" />
              <span>Input & Editing</span>
            </button>

            <button
              onClick={() => setActiveTab("shortcuts")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === "shortcuts" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shortcuts</span>
            </button>

            <div className="px-2 pt-3 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
              Workflow & Engine
            </div>

            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === "security" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Security & Gate</span>
            </button>

            <button
              onClick={() => setActiveTab("git")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition ${
                activeTab === "git" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Workspace & Git</span>
            </button>
          </div>

          {/* Settings Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {/* 1. APPEARANCE (100% Orca Structure) */}
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-neutral-100 text-sm">Theme & Surface</h4>
                  <p className="text-[11px] text-neutral-500">Custom dark and OLED visual styling inspired by Orca IDE.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setSettings({ ...settings, theme: "dark" })}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      settings.theme === "dark" ? "border-emerald-500 bg-neutral-900" : "border-[#222] bg-[#0e0f11] hover:bg-neutral-900"
                    }`}
                  >
                    <div className="font-medium text-neutral-200 mb-0.5">Dark Default</div>
                    <div className="text-[10px] text-neutral-500">Subtle charcoal (#0c0d0e) background.</div>
                  </div>

                  <div 
                    onClick={() => setSettings({ ...settings, theme: "oled" })}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      settings.theme === "oled" ? "border-emerald-500 bg-neutral-900" : "border-[#222] bg-[#0e0f11] hover:bg-neutral-900"
                    }`}
                  >
                    <div className="font-medium text-neutral-200 mb-0.5">OLED Pure Black</div>
                    <div className="text-[10px] text-neutral-500">Deep pitch-black for OLED panels.</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#222] space-y-3">
                  <h4 className="font-semibold text-neutral-100 text-sm">Terminal Typography & Acceleration</h4>

                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Font Family</label>
                    <input
                      type="text"
                      value={settings.terminal_font_family}
                      onChange={(e) => setSettings({ ...settings, terminal_font_family: e.target.value })}
                      className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Font Size (px)</label>
                      <input
                        type="number"
                        min={9}
                        max={24}
                        value={settings.terminal_font_size}
                        onChange={(e) => setSettings({ ...settings, terminal_font_size: Number(e.target.value) })}
                        className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Cursor Style</label>
                      <select
                        value={settings.terminal_cursor_style}
                        onChange={(e) => setSettings({ ...settings, terminal_cursor_style: e.target.value })}
                        className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                      >
                        <option value="block">Block</option>
                        <option value="underline">Underline</option>
                        <option value="bar">Bar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">WebGL GPU</label>
                      <select
                        value={settings.terminal_gpu_acceleration}
                        onChange={(e) => setSettings({ ...settings, terminal_gpu_acceleration: e.target.value as HydraSettings["terminal_gpu_acceleration"] })}
                        className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                      >
                        <option value="auto">Auto (WebGL)</option>
                        <option value="on">Force On</option>
                        <option value="off">Off (Canvas)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. INPUT & EDITING (100% Orca Structure) */}
            {activeTab === "input" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-neutral-100 text-sm">Selection & Editing Behavior</h4>
                  <p className="text-[11px] text-neutral-500">Clipboard, pointer interactions, and muscle memory routing.</p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-medium text-neutral-200">Middle-click Paste from Selection</div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                      Enabled by default on Linux (X11 / Wayland). Uses the native primary selection clipboard buffer without altering the primary clipboard.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.primary_selection_middle_click_paste}
                    onChange={(e) => setSettings({ ...settings, primary_selection_middle_click_paste: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                </div>
              </div>
            )}

            {/* 3. SHORTCUTS (100% Orca Structure) */}
            {activeTab === "shortcuts" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-100 text-sm">Keyboard Shortcuts Catalog</h4>
                    <p className="text-[11px] text-neutral-500">Native keybinding table matching Orca ADE and Herdr conventions.</p>
                  </div>
                  <input
                    type="text"
                    value={shortcutFilter}
                    onChange={(e) => setShortcutFilter(e.target.value)}
                    placeholder="Filter keybindings..."
                    className="w-40 bg-[#0c0d0e] border border-[#26272b] rounded px-2.5 py-1 text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 font-sans"
                  />
                </div>

                <div className="rounded-xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/60 bg-[#0e0f11]">
                  {filteredShortcuts.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-[11px] hover:bg-neutral-800/40 transition">
                      <div>
                        <div className="text-neutral-200 font-medium">{s.action}</div>
                        <div className="text-[10px] text-neutral-500">{s.desc}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-[10px]">
                        {s.chord}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SECURITY & GATE */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-neutral-100 text-sm">Human-in-the-Loop & Security Gates</h4>
                  <p className="text-[11px] text-neutral-500">Autonomous tool execution controls and alerts.</p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-medium text-neutral-200">Auto-Approve Read-Only Tools</div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                      Allows 'cat', 'ls', 'grep' and file viewing without pausing for interactive confirmation. Destructive commands (rm, git push) still require manual confirmation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_approve_reads}
                    onChange={(e) => setSettings({ ...settings, auto_approve_reads: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-medium text-neutral-200">Notify on Agent Blocked</div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                      Triggers desktop alerts and sends companion notifications when an agent reaches the Herdr BLOCKED state.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification_on_blocked}
                    onChange={(e) => setSettings({ ...settings, notification_on_blocked: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                </div>
              </div>
            )}

            {/* 5. WORKSPACE & GIT */}
            {activeTab === "git" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-neutral-100 text-sm">Repository & Worktree Management</h4>
                  <p className="text-[11px] text-neutral-500">Directory structure for multi-agent parallel branching.</p>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Default Workspaces Root</label>
                  <input
                    type="text"
                    value={settings.workspace_dir}
                    onChange={(e) => setSettings({ ...settings, workspace_dir: e.target.value })}
                    className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Auto-generated Branch Prefix</label>
                  <input
                    type="text"
                    value={settings.default_branch_prefix}
                    onChange={(e) => setSettings({ ...settings, default_branch_prefix: e.target.value })}
                    className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                  />
                  <span className="text-[10px] text-neutral-500">Prefix applied when spawning parallel git branches for agent tasks (e.g. feat/, task/).</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 border-t border-[#222] px-4 flex items-center justify-between bg-[#141518]">
          <span className="text-[11px] text-neutral-500 font-mono">Persisted to SQLite WAL in ~/.config/hydra/</span>
          <div className="flex items-center gap-2">
            {savedFeedback && (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
