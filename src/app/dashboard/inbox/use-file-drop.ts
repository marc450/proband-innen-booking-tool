"use client";

import { useRef, useState, type DragEvent } from "react";

/**
 * Reusable file drop hook for the inbox composers.
 *
 * Exposes:
 *   - `isDragOver`: boolean for rendering an overlay while the user
 *     drags files over the target.
 *   - `dragProps`: spread these onto the element that should accept
 *     drops. Drag events only react when the payload actually contains
 *     files (`dataTransfer.types` includes "Files") so dragging text,
 *     links or selected emails across the UI doesn't trigger the zone.
 *
 * Usage:
 *   const { isDragOver, dragProps } = useFileDrop((files) =>
 *     setAttachments((prev) => [...prev, ...files])
 *   );
 *   <div {...dragProps}> … </div>
 *
 * The hook uses a depth counter to handle the quirk that `dragleave`
 * fires on every child element crossed during a single drag: without
 * this, the overlay would flicker as the cursor passes over child
 * nodes. Enter/leave balance each other, and the overlay hides only
 * when depth returns to zero.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false);
  const depthRef = useRef(0);

  const hasFiles = (e: DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const dragProps = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depthRef.current += 1;
      setIsDragOver(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.stopPropagation();
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setIsDragOver(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depthRef.current = 0;
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) onFiles(files);
    },
  };

  return { isDragOver, dragProps };
}
