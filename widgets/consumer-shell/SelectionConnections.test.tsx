import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SelectionConnections, { visibleConnections } from "./SelectionConnections";

afterEach(() => vi.restoreAllMocks());

it("connects every selected intermediate stage rather than skipping to the first list", () => {
  const view = render(<div>
    <button data-menu-id="player" aria-pressed="true"><span className="lag-orb-icon" /></button>
    <div className="lag-workspace">
      <div data-stage-key="player-stage-0"><div className="lag-panel-frame"><button aria-pressed="true">자격증</button></div></div>
      <div data-stage-key="categories" data-parent-stage-key="player-stage-0"><div className="lag-panel-frame"><button aria-pressed="true">어학</button></div></div>
      <div data-stage-key="list" data-parent-stage-key="categories"><div className="lag-panel-frame"><button aria-pressed="true">시험</button></div></div>
      <div data-stage-key="detail" data-parent-stage-key="list"><div className="lag-panel-frame" /></div>
    </div>
    <SelectionConnections active />
  </div>);
  expect(visibleConnections(view.container).map(({ id }) => id)).toEqual(["main-player-stage-0", "player-stage-0-categories", "categories-list", "list-detail"]);
  view.container.querySelector('[data-stage-key="categories"]')?.setAttribute("aria-hidden", "true");
  expect(visibleConnections(view.container).map(({ id }) => id)).not.toContain("categories-list");
});

it("tracks a visible chain only while active and omits long mobile lines", () => {
  let paint: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { paint = callback; return 1; });
  const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const x = this.matches(".lag-orb-icon") ? 500 : this.matches("svg") ? 0 : 600;
    const width = this.matches(".lag-orb-icon") ? 50 : 300;
    return { x, y: 20, width, height: 50, top: 20, left: x, right: x + width, bottom: 70, toJSON: () => ({}) };
  });
  const content = (active: boolean) => <div><button data-menu-id="player" aria-pressed="true"><span className="lag-orb-icon" /></button><div className="lag-workspace"><div data-stage-key="root"><div className="lag-panel-frame" /></div></div><SelectionConnections active={active} /></div>;
  const view = render(content(true));
  act(() => paint(0));
  expect(view.container.querySelector('[data-connection="main-root"]')).toHaveAttribute("d", "M550,25 H584 V25 H600");
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);
  act(() => paint(0));
  expect(view.container.querySelector("svg path")).toBeNull();
  view.rerender(content(false));
  act(() => paint(0));
  expect(view.container.querySelector("svg path")).toBeNull();
  view.unmount();
  expect(cancelFrame).toHaveBeenCalled();
});
