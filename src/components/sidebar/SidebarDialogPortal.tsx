// Ported from Orca (https://github.com/stablyai/orca) — Copyright (c) 2026 Lovecast Inc. (MIT)
// Source: components/sidebar/index.tsx (dialogs rendered after the sidebar container).
//
// Why portal: the sidebar shell is `overflow: hidden` and carries the sidebar's own theme
// variables, so a modal mounted inside it is clipped by the scroll body and inherits the
// tinted surface. Orca renders these dialogs as siblings of the sidebar, outside its DOM
// subtree; `createPortal` gives Hydra the same placement without lifting the state.
import { createPortal } from "react-dom";
import type React from "react";

export function SidebarDialogPortal({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element | null {
  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(children, document.body);
}
