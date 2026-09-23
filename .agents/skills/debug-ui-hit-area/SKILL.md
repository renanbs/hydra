---
name: debug-ui-hit-area
description: Diagnose invisible interactive areas, pointer-event dead zones, and hover/click interception bugs in the Hydra frontend. Provides an injectable element inspector overlay and a systematic checklist for root-cause analysis.
---

# debug-ui-hit-area — UI Hit Area & Pointer Event Debugging

## When to Use

- User reports an invisible area intercepting hover or click events.
- A button/tab/element has a hit area larger or smaller than its visual bounds.
- Hover effects activate in unexpected regions.
- Terminal or content underneath stops responding to mouse in a specific zone.

## Step 1: Inject the Element Inspector Overlay

Add this snippet to `src/main.tsx` (temporary — remove before commit):

```typescript
// DEBUG: element inspector overlay — REMOVE BEFORE COMMIT
if (import.meta.env.DEV) {
  const overlay = document.createElement("div");
  overlay.id = "dbg-overlay";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;background:rgba(255,0,0,0.85);color:#fff;" +
    "font:11px monospace;padding:4px 8px;z-index:99999;pointer-events:none;" +
    "display:none;white-space:pre;max-width:600px;";
  document.body.appendChild(overlay);

  document.addEventListener("mousemove", (e) => {
    // Adjust Y threshold to the region you're investigating
    if (e.clientY > 80) { overlay.style.display = "none"; return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) { overlay.style.display = "none"; return; }
    const rect = el.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.top = "42px";
    overlay.style.left = "0px";
    overlay.textContent = [
      `${el.tagName}.${(el.className || "").split(" ").slice(0, 5).join(".")}`,
      `id=${el.id || "-"} title=${el.title || "-"}`,
      `rect: ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      `parent: ${el.parentElement?.tagName}.${(el.parentElement?.className || "").split(" ").slice(0, 4).join(".")}`,
    ].join("\n");
  });
}
```

**Adapt as needed:**
- Change `e.clientY > 80` to limit to the vertical region of interest.
- Change `overlay.style.top` to position the red box where it doesn't cover the area you're inspecting.
- Increase `.slice(0, 5)` to show more CSS classes.

HMR picks it up instantly — move the mouse over the suspect area and read which element `elementFromPoint` reports.

## Step 2: Diagnose

Once you identify the element, check against this root-cause checklist:

### Container wider than its content
**Symptom:** A wrapper `<div>` shows up instead of the expected interactive child.
**Common causes:**
| Cause | Why it happens | Fix |
|---|---|---|
| `flex` child as sole child | Flex child can stretch to fill parent on main axis in some configurations | Use `inline-flex` instead of `flex` |
| `overflow-x-auto` + `flex` | Creates a scroll container that ignores `w-fit`/`fit-content` | Remove `overflow-x-auto` from inner div (keep on outer if needed for scrolling) |
| `w-fit` ignored | `width: fit-content` is unreliable inside scroll containers | Prefer `inline-flex` which naturally shrinks to content |

### `pointer-events-none` not propagating
**Symptom:** Children with `pointer-events-auto` still don't receive events; `elementFromPoint` returns a grandparent or unrelated element.
**Common causes:**
| Cause | Why it happens | Fix |
|---|---|---|
| Nested `pointer-events-none` | WebKitGTK may not propagate through 2+ layers of `pointer-events-none` ancestors | Use `pointer-events-none` on ONE container only, or fix sizing instead |
| `overflow: hidden/auto` ancestor | Scroll containers with `pointer-events-none` can clip event propagation | Remove `overflow` from the `pointer-events-none` element |

### Stacking / z-index issues
**Symptom:** The correct element exists at the position but another element with higher stacking context covers it.
**Check:** Compare `z-index` values. Remember `z-index` only works on positioned elements (`relative`, `absolute`, `fixed`).

## Step 3: Fix Patterns

### Preferred: size the container correctly
The best fix is making the container physically match its content so there's no dead zone to worry about:

```tsx
{/* BAD: flex child expands to fill parent */}
<div className="flex items-stretch overflow-x-auto bg-card">
  {children}
</div>

{/* GOOD: inline-flex shrinks to content */}
<div className="inline-flex items-stretch bg-card">
  {children}
</div>
```

### Fallback: pointer-events layering
When sizing isn't controllable (e.g. a toolbar track that must span full width), use ONE layer of `pointer-events-none` on the track and `pointer-events-auto` on each interactive child:

```tsx
<div className="flex items-stretch w-full pointer-events-none">
  <div className="pointer-events-auto">{tab}</div>
  <button className="pointer-events-auto">{action}</button>
</div>
```

**Never nest** two `pointer-events-none` containers — WebKitGTK (Tauri's Linux webview) may drop events entirely.

## Step 4: Cleanup

- **Remove the debug overlay** from `src/main.tsx` before committing.
- Verify the fix in the actual Tauri app (not just the Vite dev server in a browser — WebKitGTK rendering differs from Chromium).
