import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

export function TerminalDrawer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;

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

    // Conecta a entrada do teclado do usuário ao PTY do Rust
    term.onData((data) => {
      invoke("send_terminal_input", { input: data }).catch(console.error);
    });

    // Inicia a sessão headless no Rust (se já não estiver ativa)
    invoke("start_terminal_session")
      .then(() => {
        // Pega o snapshot inicial do buffer em memória (vt100)
        return invoke<{ formatted: string; clean_text: string }>("get_terminal_snapshot");
      })
      .then((snapshot) => {
        if (snapshot && snapshot.formatted) {
          term.write(snapshot.formatted);
        }
      })
      .catch(console.error);

    // Escuta novos chunks de output emitidos em tempo real pelo Rust
    const unlistenPromise = listen<string>("terminal:output", (event) => {
      term.write(event.payload);
    });

    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      unlistenPromise.then((unlisten) => unlisten());
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-[#0c0d0e] p-2 overflow-hidden" 
    />
  );
}
