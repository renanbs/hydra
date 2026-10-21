// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/CommentMarkdown.tsx (compact variant)
//
// Deliberately dependency-free and HTML-inert: notes are rendered as text tokens, so
// raw HTML can never become markup. Only http(s)/mailto links linkify; any other
// protocol stays literal text. The compact variant suppresses block paragraphs and
// preserves line breaks, which is what a sidebar card needs.
import type React from "react";
import { invoke } from "@tauri-apps/api/core";

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "em"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; value: string; href: string };

const INLINE_PATTERN =
  /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

function parseInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;
  for (const match of line.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ kind: "text", value: line.slice(cursor, index) });
    }
    const raw = match[0];
    if (raw.startsWith("**") || raw.startsWith("__")) {
      tokens.push({ kind: "strong", value: raw.slice(2, -2) });
    } else if (raw.startsWith("`")) {
      tokens.push({ kind: "code", value: raw.slice(1, -1) });
    } else if (raw.startsWith("[")) {
      const separator = raw.indexOf("](");
      const label = raw.slice(1, separator);
      const href = raw.slice(separator + 2, -1);
      if (SAFE_LINK.test(href)) {
        tokens.push({ kind: "link", value: label, href });
      } else {
        tokens.push({ kind: "text", value: raw });
      }
    } else {
      tokens.push({ kind: "em", value: raw.slice(1, -1) });
    }
    cursor = index + raw.length;
  }
  if (cursor < line.length) {
    tokens.push({ kind: "text", value: line.slice(cursor) });
  }
  return tokens;
}

function openExternal(event: React.MouseEvent<HTMLAnchorElement>, href: string): void {
  event.preventDefault();
  event.stopPropagation();
  void invoke("open_external_url_cmd", { url: href }).catch((error) =>
    console.error("Failed to open link:", error)
  );
}

function renderTokens(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.kind) {
      case "strong":
        return <strong key={key}>{token.value}</strong>;
      case "em":
        return <em key={key}>{token.value}</em>;
      case "code":
        return (
          <code key={key} className="rounded bg-neutral-800/70 px-1 py-px font-mono">
            {token.value}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={token.href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={(event) => openExternal(event, token.href)}
          >
            {token.value}
          </a>
        );
      default:
        return <span key={key}>{token.value}</span>;
    }
  });
}

export function CommentMarkdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}): React.JSX.Element {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {lines.map((line, index) => {
        const bullet = /^\s*[-*]\s+/.exec(line);
        const heading = /^\s*#{1,6}\s+/.exec(line);
        const content = bullet
          ? line.slice(bullet[0].length)
          : heading
            ? line.slice(heading[0].length)
            : line;
        const key = `line-${index}`;
        if (bullet) {
          return (
            <div key={key} className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>{renderTokens(parseInline(content), key)}</span>
            </div>
          );
        }
        if (heading) {
          return (
            <div key={key} className="font-semibold">
              {renderTokens(parseInline(content), key)}
            </div>
          );
        }
        return (
          <div key={key}>{line ? renderTokens(parseInline(content), key) : <br />}</div>
        );
      })}
    </div>
  );
}
