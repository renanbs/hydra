import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Sliders, Terminal, Shield, FolderGit2, Check } from "lucide-react";

export interface HydraSettings {
  terminal_font_family: string;
  terminal_font_size: number;
  terminal_cursor_style: string;
  terminal_cursor_blink: boolean;
  auto_approve_reads: boolean;
  notification_on_blocked: boolean;
  default_branch_prefix: string;
  workspace_dir: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: HydraSettings) => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "security" | "git">("terminal");
  const [settings, setSettings] = useState<HydraSettings | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (isOpen && !settings) {
      invoke<HydraSettings>("get_settings")
        .then(setSettings)
        .catch(console.error);
    }
  }, [isOpen, settings]);

  if (!isOpen || !settings) return null;

  const handleSave = () => {
    invoke("save_settings", { settings })
      .then(() => {
        setSavedFeedback(true);
        onSaved?.(settings);
        setTimeout(() => setSavedFeedback(false), 2000);
      })
      .catch(console.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-[560px] rounded-xl bg-[#111214] border border-[#26272b] shadow-2xl flex flex-col overflow-hidden text-xs text-neutral-300">
        {/* Header */}
        <div className="h-11 border-b border-[#222] px-4 flex items-center justify-between bg-[#141518]">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Hydra Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split: Sidebar + Content */}
        <div className="flex h-[360px]">
          {/* Settings Tabs (Orca Style) */}
          <div className="w-40 border-r border-[#222] bg-[#0e0f11] p-2 space-y-1">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition ${
                activeTab === "terminal" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminal & Font</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition ${
                activeTab === "security" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Security & Gate</span>
            </button>

            <button
              onClick={() => setActiveTab("git")}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition ${
                activeTab === "git" ? "bg-neutral-800 text-neutral-100 font-medium" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Workspace & Git</span>
            </button>
          </div>

          {/* Settings Pane */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {activeTab === "terminal" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Font Family</label>
                  <input
                    type="text"
                    value={settings.terminal_font_family}
                    onChange={(e) => setSettings({ ...settings, terminal_font_family: e.target.value })}
                    className="w-full bg-[#0c0d0e] border border-[#26272b] rounded px-3 py-1.5 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-emerald-500/60"
                  />
                  <span className="text-[10px] text-neutral-500">Supports JetBrains Mono, Fira Code, Cascadia Code.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Font Size (px)</label>
                    <input
                      type="number"
                      min={9}
                      max={20}
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
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-neutral-950 border border-neutral-800">
                  <span>Cursor Blinking</span>
                  <input
                    type="checkbox"
                    checked={settings.terminal_cursor_blink}
                    onChange={(e) => setSettings({ ...settings, terminal_cursor_blink: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded bg-neutral-950 border border-neutral-800">
                  <div>
                    <div className="font-medium text-neutral-200">Auto-Approve Read-Only Tools</div>
                    <div className="text-[10px] text-neutral-500">Allows 'cat', 'ls', 'grep' without manual confirmation prompt.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_approve_reads}
                    onChange={(e) => setSettings({ ...settings, auto_approve_reads: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-neutral-950 border border-neutral-800">
                  <div>
                    <div className="font-medium text-neutral-200">Notify on Agent Blocked</div>
                    <div className="text-[10px] text-neutral-500">Alerts desktop and mobile companion when agent is awaiting approval.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification_on_blocked}
                    onChange={(e) => setSettings({ ...settings, notification_on_blocked: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === "git" && (
              <div className="space-y-4">
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
                  <span className="text-[10px] text-neutral-500">Prefix used when spawning a new worktree branch (e.g. feat/, fix/).</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Save feedback */}
        <div className="h-11 border-t border-[#222] px-4 flex items-center justify-between bg-[#141518]">
          <span className="text-[11px] text-neutral-500 font-mono">Changes persist to SQLite WAL immediately</span>
          <div className="flex items-center gap-2">
            {savedFeedback && (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
