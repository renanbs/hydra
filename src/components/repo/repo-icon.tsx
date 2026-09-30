import React from "react";
import {
  Bot,
  Box,
  Braces,
  Briefcase,
  Building2,
  Code2,
  Cpu,
  Database,
  Folder,
  Gauge,
  Globe,
  Layers,
  Package,
  Palette,
  Rocket,
  Server,
  Shapes,
  Sparkles,
  SquareTerminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { RepoIcon } from "../../shared/repo-icon";
import { cn } from "../../lib/utils";

const REPO_LUCIDE_ICONS: Record<string, LucideIcon> = {
  Folder,
  Code2,
  SquareTerminal,
  Bot,
  Package,
  Database,
  Globe,
  Server,
  Cpu,
  Layers,
  Braces,
  Rocket,
  Wrench,
  Briefcase,
  Building2,
  Palette,
  Gauge,
  Sparkles,
  Shapes,
  Box,
};

export function getRepoLucideIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Folder;
  return REPO_LUCIDE_ICONS[name] ?? Folder;
}

export function RepoIconGlyph({
  repoIcon,
  className,
  iconClassName,
  color,
}: {
  repoIcon: RepoIcon | null | undefined;
  className?: string;
  iconClassName?: string;
  color?: string;
}): React.JSX.Element {
  const imageSrc = repoIcon?.type === "image" ? repoIcon.src : null;
  const [failedImageSrc, setFailedImageSrc] = React.useState<string | null>(null);

  if (imageSrc !== null && failedImageSrc !== imageSrc) {
    return (
      <span className={cn("inline-flex items-center justify-center overflow-hidden rounded-[3px]", className)}>
        <img
          src={imageSrc}
          alt=""
          className={cn("size-full object-contain", iconClassName)}
          draggable={false}
          onError={() => setFailedImageSrc(imageSrc)}
        />
      </span>
    );
  }

  if (repoIcon?.type === "emoji") {
    return (
      <span
        className={cn("inline-flex items-center justify-center leading-none", className)}
        aria-hidden="true"
      >
        <span className={cn("inline-flex items-center justify-center text-[0.9em]", iconClassName)}>
          {repoIcon.emoji}
        </span>
      </span>
    );
  }

  const Icon = getRepoLucideIcon(repoIcon?.type === "lucide" ? repoIcon.name : "Folder");
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      {React.createElement(Icon, {
        className: iconClassName,
        style: color ? { color } : undefined,
      })}
    </span>
  );
}
