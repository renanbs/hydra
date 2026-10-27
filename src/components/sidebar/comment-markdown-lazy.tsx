// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/comment-markdown-lazy.tsx
//
// Boot-path split: react-markdown + remark/rehype + mermaid are ~400 KB of JS that
// only the hover-card markdown needs. One lazy() identity for every consumer, so the
// chunk is fetched once; the fallback mirrors the same wrapping classes so a paint
// before the chunk lands cannot shift the card's layout.
import React from "react";
import { cn } from "@/lib/utils";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import type { CommentMarkdownProps } from "./comment-markdown";

const LazyCommentMarkdown = lazyWithRetry(
  () => import("./comment-markdown").then((mod) => ({ default: mod.default })),
  { reloadKey: "comment-markdown" }
);

/** Warms the chunk ahead of render (hover enter) so the fallback is never seen. */
export function preloadCommentMarkdown(): void {
  void import("./comment-markdown");
}

type CommentMarkdownAsyncProps = CommentMarkdownProps & {
  /** Extra classes for the pre-load fallback only, e.g. to mirror remark-breaks. */
  fallbackClassName?: string;
};

/**
 * Renders the markdown body, falling back to the raw source in an identically
 * classed box while the chunk loads.
 */
export function CommentMarkdownAsync({
  fallbackClassName,
  ...props
}: CommentMarkdownAsyncProps): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div
          className={cn(
            "min-w-0 max-w-full [overflow-wrap:anywhere]",
            props.className,
            fallbackClassName
          )}
          title={props.title}
        >
          {props.content ?? props.text ?? ""}
        </div>
      }
    >
      <LazyCommentMarkdown {...props} />
    </React.Suspense>
  );
}
