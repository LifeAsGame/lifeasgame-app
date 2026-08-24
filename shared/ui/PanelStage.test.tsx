import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import PanelStage from "./PanelStage";

describe("PanelStage camera contract", () => {
  const focus = vi.fn();

  beforeEach(() => {
    focus.mockClear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
  });

  afterEach(() => window.removeEventListener(STAGE_FOCUS_EVENT, focus));

  it("focuses a genuine spatial stage once when it mounts", () => {
    render(<PanelStage stageKey="detail"><span>Detail A</span></PanelStage>);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus.mock.calls[0][0]).toMatchObject({ detail: { key: "detail", align: "forward" } });
  });

  it("keeps camera position stable when content identity changes in the same stage", () => {
    const view = render(<PanelStage stageKey="detail"><span>Detail A</span></PanelStage>);

    view.rerender(<PanelStage stageKey="detail"><span>Detail B</span></PanelStage>);

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("preserves opt-out topology metadata and reduced-motion panel behavior", () => {
    const { container } = render(<PanelStage stageKey="history" autoFocus={false}><span>History</span></PanelStage>);
    const source = readFileSync("shared/ui/PanelStage.tsx", "utf8");

    expect(container.querySelector('[data-stage-auto-focus="false"]')).toBeInTheDocument();
    expect(focus).not.toHaveBeenCalled();
    expect(source).toContain("initial={reducedMotion ? false");
    expect(source).toContain("transition={reducedMotion ? { duration: 0 }");
  });
});
