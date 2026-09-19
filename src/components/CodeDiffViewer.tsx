import { DiffEditor } from "@monaco-editor/react";

interface CodeDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  theme?: string;
}

export function CodeDiffViewer({
  original,
  modified,
  language = "rust",
  theme = "vs-dark",
}: CodeDiffViewerProps) {
  return (
    <div className="w-full h-full overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <DiffEditor
        height="100%"
        width="100%"
        theme={theme}
        language={language}
        original={original}
        modified={modified}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: "on",
          renderWhitespace: "none",
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
