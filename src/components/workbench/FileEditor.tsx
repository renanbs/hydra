import Editor from "@monaco-editor/react";

type Props = {
  content: string;
  language: string;
  theme: string;
  path?: string;
};

export function FileEditor({ content, language, theme, path }: Props) {
  return (
    <div className="h-full w-full overflow-hidden bg-editor-surface">
      <Editor
        height="100%"
        language={language}
        value={content}
        path={path}
        theme={theme === "vs" ? "vs" : "vs-dark"}
        options={{
          readOnly: false,
          fontSize: 13,
          fontFamily: "JetBrains Mono, Fira Code, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
