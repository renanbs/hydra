import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyDocumentTheme } from "./lib/document-theme";
import { isAgentDashboardPopoutLocation } from "./lib/agent-dashboard-popout";
import { applyShellFace } from "./lib/shell-face";
import "./App.css";

applyShellFace();

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

// Why a route at the entry: a second webview window (Agent Dashboard pop-out) must not
// boot the whole shell — it renders only the dashboard surface. The module is lazy so
// the pop-out bundle stays out of the main window's startup chunk.
const AgentDashboardPopoutWindow = React.lazy(
  () => import("./components/dashboard/AgentDashboardPopoutWindow"),
);

const isAgentDashboardPopout =
  typeof window !== "undefined" &&
  isAgentDashboardPopoutLocation(window.location.search);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isAgentDashboardPopout ? (
      <React.Suspense fallback={null}>
        <AgentDashboardPopoutWindow />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
