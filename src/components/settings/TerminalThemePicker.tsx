import { useEffect, useRef, useState } from "react";
import { MAX_THEME_RESULTS } from "./SettingsConstants";
import { filterTerminalThemeOptions, isSettingsFormOptionQueryTooLarge } from "./settings-form-option-filter";
import type { TerminalThemeOption } from "../../lib/terminal-theme";

type ThemePickerProps = {
  label: string;
  description: string;
  selectedTheme: string;
  themeOptions: TerminalThemeOption[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelectTheme: (theme: string) => void;
  importedHighlightSignal?: number;
};

export function ThemePicker({
  label,
  description,
  selectedTheme,
  themeOptions,
  query,
  onQueryChange,
  onSelectTheme,
  importedHighlightSignal,
}: ThemePickerProps) {
  const importedGroupRef = useRef<HTMLDivElement | null>(null);
  const [highlightImported, setHighlightImported] = useState(false);

  useEffect(() => {
    if (!importedHighlightSignal) return;
    importedGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setHighlightImported(true);
    const timer = setTimeout(() => setHighlightImported(false), 2000);
    return () => clearTimeout(timer);
  }, [importedHighlightSignal]);

  const themeQuery = query.trim();
  const shouldShowThemeQueryLabel = themeQuery.length > 0 && !isSettingsFormOptionQueryTooLarge(themeQuery);
  const matchingThemes = filterTerminalThemeOptions(themeOptions, query);
  const selectedThemeLabel = themeOptions.find((o) => o.value === selectedTheme)?.label ?? selectedTheme;
  const groupedThemes = [
    {
      label: "Built-in",
      themes: matchingThemes.filter((t) => t.group === "built-in").slice(0, MAX_THEME_RESULTS),
    },
    {
      label: "Imported",
      themes: matchingThemes.filter((t) => t.group === "imported").slice(0, MAX_THEME_RESULTS),
    },
  ].filter((g) => g.themes.length > 0);
  const visibleThemeCount = groupedThemes.reduce((sum, g) => sum + g.themes.length, 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-[13px] font-medium">{label}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search terminal themes"
        className="w-full bg-background border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="rounded-lg border border-border/50">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-xs text-muted-foreground">
          <span>Selected: {selectedThemeLabel}</span>
          <span>
            Showing {visibleThemeCount}
            {shouldShowThemeQueryLabel ? ` matching "${themeQuery}"` : ` of ${themeOptions.length}`}
          </span>
        </div>
        <div className="h-64 overflow-y-auto">
          <div className="space-y-1 p-2">
            {groupedThemes.map((group) => {
              const isImported = group.label === "Imported";
              return (
                <div
                  key={group.label}
                  ref={isImported ? importedGroupRef : undefined}
                  className={`space-y-1 rounded-md transition-colors duration-500 ${isImported && highlightImported ? "bg-accent/40 ring-1 ring-accent" : ""}`}
                >
                  <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{group.label}</p>
                  {group.themes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => onSelectTheme(theme.value)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${selectedTheme === theme.value ? "bg-accent font-medium text-accent-foreground" : "hover:bg-accent"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{theme.label}</span>
                        {theme.sourceLabel ? (
                          <span className="block truncate text-[11px] font-normal text-muted-foreground">
                            Imported from {theme.sourceLabel}
                            {theme.mode && theme.mode !== "unknown" ? ` · ${theme.mode}` : ""}
                          </span>
                        ) : null}
                      </span>
                      {theme.group === "imported" && theme.previewTheme && selectedTheme !== theme.value ? (
                        <span className="flex shrink-0 overflow-hidden rounded-sm border border-border/60">
                          {[theme.previewTheme.black, theme.previewTheme.red, theme.previewTheme.green, theme.previewTheme.yellow, theme.previewTheme.blue, theme.previewTheme.magenta, theme.previewTheme.cyan, theme.previewTheme.white].map((color, idx) => (
                            <span key={idx} className="h-3 w-2" style={{ backgroundColor: color ?? "transparent" }} />
                          ))}
                        </span>
                      ) : null}
                      {selectedTheme === theme.value ? <span className="ml-3 shrink-0 text-[11px] uppercase tracking-[0.16em]">Current</span> : null}
                    </button>
                  ))}
                </div>
              );
            })}
            {visibleThemeCount === 0 ? <div className="px-3 py-6 text-sm text-muted-foreground">No themes found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
