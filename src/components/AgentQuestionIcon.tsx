// Ported from Orca (`renderer/src/components/AgentQuestionIcon.tsx`).
// Source: components/AgentQuestionIcon.tsx
//
// "The agent is asking you something" shows up in the sidebar, terminal tabs, the
// dashboard and the board. One icon + one token (`--agent-question` →
// `text-agent-question`, declared in App.css) so they never drift apart. Callers
// pass sizing via className.
import React from "react";
import { MessageCircleQuestion } from "lucide-react";
import { cn } from "../lib/utils";

type AgentQuestionIconProps = React.ComponentProps<typeof MessageCircleQuestion>;

export function AgentQuestionIcon({ className, ...props }: AgentQuestionIconProps): React.JSX.Element {
  return (
    <MessageCircleQuestion
      {...props}
      className={cn("text-agent-question", className)}
      aria-hidden="true"
    />
  );
}

export default AgentQuestionIcon;
