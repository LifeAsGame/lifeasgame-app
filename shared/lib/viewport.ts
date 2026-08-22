export type ViewportSize = { width: number; height: number };
export type FloatingSize = { width: number; height: number };
export type FloatingPosition = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function clampFloatingPosition(
  position: FloatingPosition,
  windowSize: FloatingSize,
  viewport: ViewportSize,
  padding = 16,
): FloatingPosition {
  return {
    x: clamp(position.x, padding, viewport.width - windowSize.width - padding),
    y: clamp(position.y, padding, viewport.height - windowSize.height - padding),
  };
}

export function notificationPopupPosition(
  anchor: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  popup: FloatingSize,
  viewport: ViewportSize,
  padding = 16,
  gap = 10,
): FloatingPosition {
  const below = anchor.bottom + gap;
  const above = anchor.top - popup.height - gap;
  const y = below + popup.height <= viewport.height - padding || above < padding ? below : above;
  return {
    x: clamp(anchor.right - popup.width, padding, viewport.width - popup.width - padding),
    y: clamp(y, padding, viewport.height - popup.height - padding),
  };
}
