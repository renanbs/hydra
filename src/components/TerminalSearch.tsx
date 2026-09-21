import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, X, CaseSensitive, Regex } from "lucide-react";
import type { SearchAddon } from "@xterm/addon-search";

export interface TerminalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchAddon: SearchAddon | null;
}

const EMPTY_RESULTS = { resultIndex: -1, resultCount: 0 };

function clearTerminalSearch(searchAddon: SearchAddon | null): void {
  if (!searchAddon) return;
  try {
    searchAddon.clearDecorations();
  } catch {}
  try {
    searchAddon.findNext("");
  } catch {}
}

export function TerminalSearch({
  isOpen,
  onClose,
  searchAddon,
}: TerminalSearchProps) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const searchOptions = useCallback(
    (incremental = false) => ({
      caseSensitive,
      regex,
      incremental,
      decorations: {
        matchBackground: "#5c4a00",
        matchBorder: "#5c4a00",
        matchOverviewRuler: "#ffcc00",
        activeMatchBackground: "#c4580e",
        activeMatchBorder: "#ffcf6b",
        activeMatchColorOverviewRuler: "#ff9900",
      },
    }),
    [caseSensitive, regex]
  );

  const findNext = useCallback(() => {
    if (searchAddon && query) {
      try {
        searchAddon.findNext(query, searchOptions(false));
      } catch (e) {
        console.warn("[Hydra] Search findNext error", e);
      }
    }
  }, [searchAddon, query, searchOptions]);

  const findPrevious = useCallback(() => {
    if (searchAddon && query) {
      try {
        searchAddon.findPrevious(query, searchOptions(false));
      } catch (e) {
        console.warn("[Hydra] Search findPrevious error", e);
      }
    }
  }, [searchAddon, query, searchOptions]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchAddon) return;
    try {
      const disposable = searchAddon.onDidChangeResults(setResults);
      return () => {
        disposable.dispose();
        clearTerminalSearch(searchAddon);
      };
    } catch {
      return () => clearTerminalSearch(searchAddon);
    }
  }, [searchAddon]);

  useEffect(() => {
    if (!isOpen || !query) {
      clearTerminalSearch(searchAddon);
      setResults(EMPTY_RESULTS);
      return;
    }
    if (searchAddon) {
      try {
        searchAddon.findNext(query, searchOptions(true));
      } catch (e) {
        console.warn("[Hydra] Search incremental error", e);
      }
    }
  }, [query, searchAddon, isOpen, caseSensitive, regex, searchOptions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      clearTerminalSearch(searchAddon);
      onClose();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      findPrevious();
    } else if (e.key === "Enter") {
      e.preventDefault();
      findNext();
    }
  };

  if (!isOpen) return null;

  const matchStatus = !query
    ? "0/0"
    : results.resultCount === 0
    ? "No results"
    : results.resultIndex === -1
    ? `${results.resultCount}+`
    : `${results.resultIndex + 1}/${results.resultCount}`;

  return (
    <div
      data-terminal-search-root
      className="absolute top-2 right-4 z-50 flex items-center gap-1.5 rounded-md border border-[#333] bg-[#141517]/95 px-2.5 py-1 text-[#eee] shadow-xl backdrop-blur-md"
      style={{ width: 340, maxWidth: "calc(100% - 32px)" }}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in terminal..."
        className="min-w-0 flex-1 border-none bg-transparent text-[12px] font-mono text-[#f0f0f0] outline-none placeholder:text-neutral-500"
      />

      <button
        type="button"
        aria-pressed={caseSensitive}
        onClick={() => setCaseSensitive((v) => !v)}
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          caseSensitive
            ? "bg-neutral-700 text-white"
            : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        }`}
        title="Match Case (Alt+C)"
      >
        <CaseSensitive size={14} />
      </button>

      <button
        type="button"
        aria-pressed={regex}
        onClick={() => setRegex((v) => !v)}
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          regex
            ? "bg-neutral-700 text-white"
            : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        }`}
        title="Use Regular Expression (Alt+R)"
      >
        <Regex size={14} />
      </button>

      <span className="shrink-0 whitespace-nowrap px-1 text-[11px] font-mono tabular-nums text-neutral-400">
        {matchStatus}
      </span>

      <div className="mx-0.5 h-3.5 w-px bg-neutral-800" />

      <button
        type="button"
        onClick={findPrevious}
        className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
        title="Previous Match (Shift+Enter)"
      >
        <ChevronUp size={14} />
      </button>

      <button
        type="button"
        onClick={findNext}
        className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
        title="Next Match (Enter)"
      >
        <ChevronDown size={14} />
      </button>

      <div className="mx-0.5 h-3.5 w-px bg-neutral-800" />

      <button
        type="button"
        onClick={() => {
          clearTerminalSearch(searchAddon);
          onClose();
        }}
        className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-red-950/50 hover:text-red-400 transition-colors"
        title="Close (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
