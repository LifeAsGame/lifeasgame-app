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

  it("keeps settled mobile stages single-focus with protected scroll actions", () => {
    const source = readFileSync("shared/ui/RuntimeFidelityStyles.tsx", "utf8");

    expect(source).toContain('.lag-panel-stage[data-camera-active="true"]');
    expect(source).toContain('not(:has(> .lag-panel-stage[data-camera-active="true"]))');
    expect(source).toContain("--lag-mobile-protected-bottom: calc(148px + env(safe-area-inset-bottom))");
    expect(source).toContain("height: calc(100dvh - 32px - var(--lag-mobile-protected-bottom))");
    expect(source).toContain('> .lag-panel-frame .lag-panel-body');
    expect(source).toContain("width: calc(100vw - 32px)");
    expect(source).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(source).toContain("width: min(1040px, calc(100vw - 560px)) !important");
    expect(source).toContain('.lag-growth-shell > .lag-panel-stage > .lag-panel-frame');
    expect(source).toContain('.lag-panel-card > div:last-child > p:first-child');
  });
});
