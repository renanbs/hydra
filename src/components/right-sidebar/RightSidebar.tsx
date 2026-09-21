import { useState } from "react";
import { Files, GitBranch } from "lucide-react";
import { FileExplorer } from "./FileExplorer";
import { SourceControl } from "./SourceControl";
import type { OpenInApplication } from "../../shared/settings-types";

type TabId = "explorer" | "source-control";

type Props = {
  rootPath: string | null;
  isGit: boolean;
  openInApps?: OpenInApplication[];
  onOpenFile?: (path: string) => void;
  onOpenDiff?: (path: string, staged: boolean) => void;
  onOpenSettings?: () => void;
};

export function RightSidebar({ rootPath, isGit, openInApps, onOpenFile, onOpenDiff, onOpenSettings }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("explorer");

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] overflow-hidden">
      {/* Activity bar — topo — copia Orca activity-bar-buttons.tsx: icon 16px, 36x36 hit, active underline 2px */}
      <div className="flex items-center gap-0 border-b border-[#222] bg-[#0e0f11] shrink-0 h-[36px] px-1">
        <button
          onClick={() => setActiveTab("explorer")}
          title="Explorer (Files)"
          className={`relative flex h-[36px] w-9 items-center justify-center transition-colors ${activeTab === "explorer" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <Files size={16} />
          {activeTab === "explorer" && <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />}
        </button>
        <button
          onClick={() => setActiveTab("source-control")}
          title="Source Control"
          className={`relative flex h-[36px] w-9 items-center justify-center transition-colors ${activeTab === "source-control" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <GitBranch size={16} />
          {activeTab === "source-control" && <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />}
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-neutral-500 font-mono pr-2">{activeTab === "explorer" ? "EXPLORER" : "SOURCE CONTROL"}</span>
      </div>

      {/* Panel content — copia Orca right-sidebar-panel-content.tsx com lazy */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "explorer" && <FileExplorer rootPath={rootPath} openInApps={openInApps} onOpenFile={onOpenFile} onOpenSettings={onOpenSettings} />}
        {activeTab === "source-control" && (
          isGit ? <SourceControl repoPath={rootPath} openInApps={openInApps} onOpenDiff={onOpenDiff} onOpenSettings={onOpenSettings} /> : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground px-4 text-center">
              Source Control só disponível para repositórios Git
            </div>
          )
        )}
      </div>
    </div>
  );
}
