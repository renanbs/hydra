import { useState, useMemo, useRef, useEffect, useId } from "react";
import { Check, ChevronsUpDown, CircleX } from "lucide-react";

type Props = {
  value: string;
  suggestions: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  onPreviewFontFamily?: (font: string | null) => void;
};

function filterSuggestions(suggestions: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return suggestions;
  return suggestions.filter((s) => s.toLowerCase().includes(q));
}

export function FontAutocomplete({ value, suggestions, onChange, placeholder = "Geist", onPreviewFontFamily }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!onPreviewFontFamily) return;
    if (!open || highlighted < 0) { onPreviewFontFamily(null); return; }
    onPreviewFontFamily(filtered[highlighted] ?? null);
  }, [open, highlighted]);

  const filtered = useMemo(() => filterSuggestions(suggestions, query), [suggestions, query]);
  const displayList = query.trim().toLowerCase() === value.trim().toLowerCase() ? suggestions : filtered;

  const commit = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(false);
    setHighlighted(-1);
    onPreviewFontFamily?.(null);
  };

  return (
    <div ref={rootRef} className="relative max-w-sm">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setOpen(true);
            setHighlighted(next.trim() ? 0 : -1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close to allow click on option
            setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
            }, 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlighted((c) => Math.min((c < 0 ? -1 : c) + 1, displayList.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setHighlighted((c) => Math.max(c - 1, 0)); return; }
            if (e.key === "Enter" && open && highlighted >= 0) { e.preventDefault(); const f = displayList[highlighted]; if (f) commit(f); }
          }}
          placeholder={placeholder}
          className="w-full bg-background border border-input rounded-md pl-3 pr-16 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ fontFamily: query || undefined }}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {query ? (
            <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>{ setQuery(""); onChange(""); setOpen(true); inputRef.current?.focus(); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <CircleX className="size-3.5" />
            </button>
          ) : null}
          <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>setOpen((o)=>!o)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronsUpDown className="size-3.5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1 scrollbar-sleek" id={listId} role="listbox">
            {displayList.length > 0 ? displayList.map((font, idx) => (
              <button
                key={font}
                type="button"
                role="option"
                aria-selected={idx === highlighted}
                onMouseEnter={()=>setHighlighted(idx)}
                onMouseDown={(e)=>e.preventDefault()}
                onClick={()=>commit(font)}
                className={`flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-left text-[13px] ${idx===highlighted ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                style={{ fontFamily: font }}
              >
                <span className="truncate">{font}</span>
                {font === value ? <Check className="ml-2 size-3.5 shrink-0" /> : null}
              </button>
            )) : (
              <div className="px-3 py-2 text-[13px] text-muted-foreground">No matching fonts.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
