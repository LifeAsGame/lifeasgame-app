export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const MOTION = {
  panelReset: {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, scale: 0.98, x: 0 },
    transition: { type: "tween", duration: 0.3, ease: EASE_OUT },
  },
  panelSwap: {
    initial: { opacity: 0, x: 32 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, scale: 0.98, x: 0 },
    transition: { type: "tween", duration: 0.34, ease: EASE_OUT },
  },
  panelSlot: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, scale: 0.98, x: 0 },
    transition: { type: "tween", duration: 0.3, ease: EASE_OUT },
  },
  panelContentSwap: {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, scale: 0.98, x: 0 },
    transition: { type: "tween", duration: 0.32, ease: EASE_OUT },
  },
  listItem: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 6 },
    transition: { type: "tween", duration: 0.28, ease: EASE_OUT },
  },
  orbTrack: {
    transition: { type: "tween", duration: 0.34, ease: EASE_OUT },
  },
} as const;
