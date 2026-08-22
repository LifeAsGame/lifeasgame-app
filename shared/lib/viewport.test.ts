import { describe, expect, it } from "vitest";

import { clampFloatingPosition, notificationPopupPosition } from "./viewport";

describe("viewport-aware utility geometry", () => {
  it("clamps a dragged window on every viewport edge and after resize", () => {
    expect(clampFloatingPosition({ x: -200, y: 900 }, { width: 420, height: 500 }, { width: 1200, height: 800 }))
      .toEqual({ x: 16, y: 284 });
    expect(clampFloatingPosition({ x: 760, y: 284 }, { width: 420, height: 500 }, { width: 900, height: 650 }))
      .toEqual({ x: 464, y: 134 });
  });

  it("places a notification above when needed and clamps it inside horizontal padding", () => {
    expect(notificationPopupPosition(
      { left: 4, right: 36, top: 700, bottom: 732 },
      { width: 320, height: 360 },
      { width: 390, height: 844 },
    )).toEqual({ x: 16, y: 330 });
  });
});
