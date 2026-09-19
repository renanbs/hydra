import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyDocumentTheme } from "./lib/document-theme";
import "./App.css";

// Apply theme before first paint to avoid flash (mirrors Orca popout.tsx:35)
try {
  const raw = localStorage.getItem("hydra:theme");
  if (raw) {
    applyDocumentTheme(raw as "system" | "dark" | "light", { disableTransitions: false });
  } else {
    // fallback to system if no persisted theme yet — App.tsx will hydrate from SQLite
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyDocumentTheme(prefersDark ? "dark" : "system", { disableTransitions: false });
  }
} catch {
  // ignore
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
