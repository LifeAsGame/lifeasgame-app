import { useCallback, useRef } from "react";

/**
 * Returns a click handler that fires `onDoubleClick` when invoked twice
 * within `delay` milliseconds (default 300ms).
 *
 * Usage:
 *   const handleDouble = useDoubleClick(() => openEditForm());
 *   <button onClick={handleDouble} />
 */
export function useDoubleClick(onDoubleClick: () => void, delay = 300) {
  const lastRef = useRef<number>(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current < delay) {
      lastRef.current = 0;
      onDoubleClick();
    } else {
      lastRef.current = now;
    }
  }, [onDoubleClick, delay]);
}
