import React from "react";
import { Crosshair } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { translate } from "@/i18n/i18n";

/** Orca `sidebar.revealFiltered`: confirm before adjusting the filters hiding a reveal target. */
export function RevealHiddenWorkspaceDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent data-testid="reveal-hidden-workspace-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="size-4" aria-hidden />
            {translate("sidebar.revealFiltered.title", "Reveal hidden workspace?")}
          </DialogTitle>
          <DialogDescription>
            {translate(
              "sidebar.revealFiltered.description",
              "The active workspace is hidden in the sidebar. Revealing it will adjust only the filters hiding it."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {translate("sidebar.revealFiltered.cancel", "Keep filters")}
          </Button>
          <Button onClick={onConfirm}>
            {translate("sidebar.revealFiltered.confirm", "Adjust filters and reveal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
