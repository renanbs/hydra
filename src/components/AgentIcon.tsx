import { Bot } from "lucide-react";

export function ClaudeIcon({ size = 14 }: { size?: number }) {
  // PR-17: brand orange must survive class-level fill overrides. A bare
  // fill="#D97757" presentation attribute loses to ANY CSS fill rule, and even
  // layered utility classes lose to unlayered rules — so the color is declared
  // at every level: text-[#D97757] on the svg (semantic token, feeds `color`),
  // fill="currentColor" + class fill-current on the path (currentColor keeps
  // the icon themeable in clean contexts), and an inline style as the
  // top-priority declaration that only an !important rule can beat.
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 text-[#D97757]"
    >
      <path
        d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-1.063 1.47-1.124 1.579-.195.316.067.146.158.048 2.066-.364 2.157-.365 2.504-.388.948-.11 1.057.438.413.753-.352.887-.912.45-1.506.12-1.921.098-2.685.121-2.491.207-.122.036-.048.11.085.12.984.778 2.14 1.604 2.57 1.895 1.587 1.191.431.547.091.862-.601.766-.888-.049-.656-.4-1.495-.996-2.09-1.44-2.28-1.554-.25-.098-.103.049-.036.103.255 1.628.486 2.69.468 2.278.17.973-.097.644-.571.559-.802.134-.73-.426-.814-1.403-.68-1.932-.73-2.053-.401-.984-.158-.268-.134.025-.097.109-.043.437-.17 2.029-.328 2.375-.243 1.13-.535.808-.668.328-.79-.115-.462-.71-.122-1.167.316-2.187.456-2.582.486-2.618.17-1.142-.042-.146-.146-.037-.158.073-1.628 1.944-2.278 2.685-1.543 1.835-.608.625-.595.389-.863-.097-.62-.644.024-.899.395-.656 1.428-1.567 1.987-2.175 1.829-1.931.255-.304.03-.121-.067-.098-.121.025-2.242 1.348-2.637 1.555-2.315 1.36-1.167.572-.778-.17-.468-.693.188-.875.523-.425z"
        fill="currentColor"
        className="fill-current"
        style={{ fill: "#D97757" }}
        fillRule="nonzero"
      />
    </svg>
  );
}

export function OmpIcon({ size = 14 }: { size?: number }) {
  const gradientId = "omp-icon-gradient";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f43f5e" />
          <stop offset="0.5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d="M10 14h44v9H43v33h-9V23h-9v22h-9V23H10z" />
    </svg>
  );
}
export function PiIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 800 800"
      xmlns="http://www.w3.org/2000/svg"
      className="text-current shrink-0"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M165.29 165.29 H517.36 V400 H400 V517.36 H282.65 V634.72 H165.29 Z M282.65 282.65 V400 H400 V282.65 Z"
      />
      <path fill="currentColor" d="M517.36 400 H634.72 V634.72 H517.36 Z" />
    </svg>
  );
}


export function OpenCodeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 text-current"
    >
      <path d="M320 224V352H192V224H320Z" fill="currentColor" fillOpacity="0.28" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M384 416H128V96H384V416ZM320 160H192V352H320V160Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CursorIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M2 1.5 L2 12 L5 9 L7.2 14.5 L9.5 13.6 L7.3 8 L11.5 8 Z"
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CodexIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 text-emerald-400"
    >
      <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.543-2.617c-1.309-.76-2.189-2.378-2.189-3.948 0-1.808 1.07-3.473 2.76-4.163v5.233c0 .333.143.57.429.737l5.97 3.473-1.95 1.118a.433.433 0 01-.476 0l-.001.167z" />
    </svg>
  );
}

export function GeminiIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AgentBrandIcon({ agentId, size = 15 }: { agentId: string; size?: number }) {
  const id = agentId.toLowerCase();
  if (id.includes("claude")) return <ClaudeIcon size={size} />;
  if (id.includes("omp") || id.includes("oh my pi")) return <OmpIcon size={size} />;
  if (id === "pi" || id.startsWith("pi-") || id.endsWith("-pi") || id.includes("pi.dev")) return <PiIcon size={size} />;
  if (id.includes("pi")) return <OmpIcon size={size} />;
  if (id.includes("opencode")) return <OpenCodeIcon size={size} />;
  if (id.includes("cursor")) return <CursorIcon size={size} />;
  if (id.includes("codex") || id.includes("openai")) return <CodexIcon size={size} />;
  if (id.includes("gemini")) return <GeminiIcon size={size} />;
  return <Bot size={size} className="text-amber-400 shrink-0" />;
}
