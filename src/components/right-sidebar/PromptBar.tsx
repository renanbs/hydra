import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Loader2 } from "lucide-react";

type Props = {
  activeSessionId?: string | null;
  onSent?: (prompt: string) => void;
};

export function PromptBar({ activeSessionId, onSent }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("hydra:prompt_history");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const persistHistory = useCallback((h: string[]) => {
    try {
      localStorage.setItem("hydra:prompt_history", JSON.stringify(h.slice(0, 100)));
    } catch {}
  }, []);

  const handleSend = useCallback(async () => {
    const txt = value.trim();
    if (!txt || !activeSessionId || sending) return;
    setSending(true);
    try {
      await invoke("send_terminal_input", { sessionId: activeSessionId, input: txt + "\n" });
      setHistory((prev) => {
        const next = [txt, ...prev.filter((v) => v !== txt)].slice(0, 100);
        persistHistory(next);
        return next;
      });
      setHistIdx(null);
      setValue("");
      onSent?.(txt);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (e) {
      console.error("[PromptBar] send_terminal_input failed", e);
    } finally {
      setSending(false);
    }
  }, [value, activeSessionId, sending, onSent, persistHistory]);

  // auto-focus when session changes
  useEffect(() => {
    if (activeSessionId) textareaRef.current?.focus();
  }, [activeSessionId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      void handleSend();
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSend();
      return;
    }
    if (e.key === "ArrowUp" && (value === "" || histIdx !== null)) {
      if (history.length === 0) return;
      // only navigate history when cursor at start or browsing
      const el = e.currentTarget;
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
      if (!atStart && value !== "" && histIdx === null) return;
      e.preventDefault();
      const nextIdx = histIdx === null ? 0 : Math.min(histIdx + 1, history.length - 1);
      setHistIdx(nextIdx);
      setValue(history[nextIdx] ?? "");
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) ta.selectionStart = ta.selectionEnd = ta.value.length;
      });
      return;
    }
    if (e.key === "ArrowDown" && histIdx !== null) {
      e.preventDefault();
      if (histIdx === 0) {
        setHistIdx(null);
        setValue("");
      } else {
        const nextIdx = histIdx - 1;
        setHistIdx(nextIdx);
        setValue(history[nextIdx] ?? "");
      }
      return;
    }
    if (e.key === "Escape" && histIdx !== null) {
      e.preventDefault();
      setHistIdx(null);
    }
  };

  const disabled = !activeSessionId || !value.trim() || sending;
  const placeholder = !activeSessionId
    ? "No active session — open a terminal tab first"
    : "Prompt to active terminal… (Enter to send, Shift+Enter newline, ↑ history)";

  return (
    <div className="shrink-0 border-t border-border bg-sidebar p-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setHistIdx(null);
              setValue(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={!activeSessionId}
            rows={1}
            className="w-full min-h-[36px] max-h-[120px] resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-[18px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed scrollbar-sleek"
            // modern auto-size; fallback to JS if not supported
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </div>
        <button
          onClick={() => void handleSend()}
          disabled={disabled}
          title={disabled ? placeholder : "Send (Enter)"}
          className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-[36px] min-w-[72px] px-3 rounded-md text-[12px] font-medium transition  ${
            disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
          }`}
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
          Send
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground px-0.5">
        <span className="truncate min-w-0">
          {activeSessionId ? `→ ${activeSessionId.slice(0, 28)}` : "no session"}
          {history.length > 0 ? ` · ${history.length} history` : ""}
          {histIdx !== null ? ` · history ${histIdx + 1}/${history.length}` : ""}
        </span>
        <span className="hidden sm:inline shrink-0">⏎ Send · ⇧⏎ Newline · ↑ History</span>
      </div>
    </div>
  );
}
