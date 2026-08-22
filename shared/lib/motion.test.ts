import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { MOTION } from "./motion";

describe("shared staged motion grammar", () => {
  it("uses a short reveal without cumulative delay and a smaller detail replacement", () => {
    expect(Math.abs(MOTION.panelSlot.initial.x)).toBeLessThanOrEqual(36);
    expect(MOTION.panelSlot.transition.duration).toBeGreaterThanOrEqual(0.16);
    expect(MOTION.panelSlot.transition.duration).toBeLessThanOrEqual(0.24);
    expect(MOTION.panelSlot.transition).not.toHaveProperty("delay");
    expect(Math.abs(MOTION.panelContentSwap.initial.x)).toBeLessThanOrEqual(12);
  });

  it("removes spatial entry and exit when reduced motion is requested", () => {
    const source = readFileSync("shared/ui/PanelStage.tsx", "utf8");
    expect(source).toContain('initial={reducedMotion ? false : MOTION.panelSlot.initial}');
    expect(source).toContain('exit={reducedMotion ? { opacity: 0 } : MOTION.panelSlot.exit}');
    expect(source).toContain('transition={reducedMotion ? { duration: 0 }');
  });
});
