import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import PanelStage, { StageContentTransition } from "./PanelStage";

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

  it("preserves the visual container while replacing selection-owned content", () => {
    const view = render(<StageContentTransition identity="a"><input defaultValue="A" /></StageContentTransition>);
    const container = view.container.firstElementChild;
    const content = view.container.querySelector("input");
    for (const identity of ["b", "a", "c"]) {
      view.rerender(<StageContentTransition identity={identity}><input defaultValue={identity} /></StageContentTransition>);
      expect(view.container.firstElementChild).toBe(container);
      expect(container).toHaveAttribute("data-content-identity", identity);
      expect(view.container.querySelector("input")).not.toBe(content);
      expect(view.container.querySelector("input")).toHaveValue(identity);
    }
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
    expect(source).toContain('not(:has(.lag-panel-stage[data-camera-active="true"]))');
    expect(source).toContain("--lag-mobile-protected-bottom: calc(148px + env(safe-area-inset-bottom))");
    expect(source).toContain("height: calc(100dvh - 32px - var(--lag-mobile-protected-bottom))");
    expect(source).toContain('> .lag-panel-frame .lag-panel-body');
    expect(source).toContain("width: calc(100vw - 32px)");
    expect(source).toContain('.lag-growth-shell > .lag-panel-stage > .lag-panel-frame');
    expect(source).toContain('.lag-panel-card > div:last-child > p:first-child');
  });

  it("keeps ancestors of a nested active Person or relation stage visible on mobile", () => {
    const source = readFileSync("shared/ui/RuntimeFidelityStyles.tsx", "utf8");
    const selector = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .find((rule) => rule[1].includes(".lag-panel-rail:not(:has("))![1].trim();
    const { container } = render(<div className="lag-workspace">
      <div className="lag-panel-rail" data-testid="outer"><div className="lag-panel-rail">
        <div className="lag-panel-stage" data-camera-active="true" />
      </div></div>
      <div className="lag-panel-rail" data-testid="inactive"><div className="lag-panel-stage" /></div>
    </div>);
    expect([...container.querySelectorAll(selector)].map((rail) => rail.getAttribute("data-testid"))).toEqual(["inactive"]);
  });
});
