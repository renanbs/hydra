import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type UsePanelResizeOptions = {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  deltaSign: 1 | -1; // 1 = arrasta da esquerda para a direita, -1 = da direita para a esquerda
};

export function usePanelResize({
  initialWidth,
  minWidth,
  maxWidth,
  deltaSign,
}: UsePanelResizeOptions) {
  const [width, setWidth] = useState(initialWidth);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const onResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      isResizingRef.current = true;
      setIsResizing(true);
      startXRef.current = event.clientX;
      startWidthRef.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = (e.clientX - startXRef.current) * deltaSign;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(nextWidth);
    };

    const onMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [deltaSign, maxWidth, minWidth]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.width = `${width}px`;
    }
  }, [width]);

  return { width, containerRef, isResizing, onResizeStart };
}
