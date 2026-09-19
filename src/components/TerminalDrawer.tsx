import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

interface TerminalDrawerProps {
  sessionId: string;
  executable?: string;
  onContextMenu?: (x: number, y: number) => void;
}

export function TerminalDrawer({ 
  sessionId, 
  executable = "bash",
  onContextMenu 
}: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#0c0d0e",
        foreground: "#ededed",
        cursor: "#10b981",
        black: "#1e1e1e",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#ec4899",
        cyan: "#06b6d4",
        white: "#ededed",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    // Conecta teclado ao PTY
    term.onData((data) => {
      invoke("send_terminal_input", { sessionId, input: data }).catch(console.error);
    });

    // Inicia sessão PTY
    invoke("start_agent_terminal", {
      sessionId,
      executable,
      args: []
    })
      .then(() => {
        return invoke<{ session_id: string; formatted: string; clean_text: string }>(
          "get_terminal_snapshot",
          { sessionId }
        );
      })
      .then((snapshot) => {
        if (snapshot && snapshot.formatted) {
          term.write(snapshot.formatted);
        }
      })
      .catch(console.error);

    // Escuta output em tempo real
    const unlistenPromise = listen<{ session_id: string; output: string }>(
      "terminal:output",
      (event) => {
        if (event.payload.session_id === sessionId) {
          term.write(event.payload.output);
        }
      }
    );

    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      unlistenPromise.then((unlisten) => unlisten());
      term.dispose();
      xtermRef.current = null;
    };
  }, [sessionId, executable]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e.clientX, e.clientY);
  };

  return (
    <div 
      ref={containerRef} 
      onContextMenu={handleContextMenu}
      className="w-full h-full bg-[#0c0d0e] p-2 overflow-hidden" 
    />
  );
}
