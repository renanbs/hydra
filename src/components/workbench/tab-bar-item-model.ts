// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Reference: src/renderer/src/components/tab-bar/tab-bar-item-model.ts

import type { TabItem } from "./WorkbenchTabBar";

export type TabBarItemModel =
  | {
      type: "terminal";
      id: string;
      isPinned: boolean;
      data: TabItem;
    }
  | {
      type: "editor";
      id: string;
      isPinned: boolean;
      data: TabItem;
    }
  | {
      type: "diff";
      id: string;
      isPinned: boolean;
      data: TabItem;
    };

export function getTabDragLabel(item: TabBarItemModel | TabItem): string {
  if ("data" in item) {
    return item.data.title || (item.type === "terminal" ? "Terminal" : "Editor");
  }
  return item.title || (item.type === "terminal" ? "Terminal" : "Editor");
}

export function getTabLayoutSignature(
  item: TabBarItemModel | TabItem,
  {
    isExpanded = false,
  }: {
    isExpanded?: boolean;
  } = {}
): string {
  const id = "data" in item ? item.id : item.id;
  const isPinned = "data" in item ? item.isPinned : Boolean(item.isPinned);
  const color = "data" in item ? item.data.color : item.color;
  const label = getTabDragLabel(item);
  return `${id}:${isPinned}:${isExpanded}:${Boolean(color)}:${label}`;
}
