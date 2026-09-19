import { DiffEditor } from "@monaco-editor/react";

interface CodeDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
}

export function CodeDiffViewer({
  original,
  modified,
  language = "rust",
}: CodeDiffViewerProps) {
  return (
    <div className="w-full h-full bg-[#0c0d0e] overflow-hidden">
      <DiffEditor
        height="100%"
        width="100%"
        theme="vs-dark"
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
