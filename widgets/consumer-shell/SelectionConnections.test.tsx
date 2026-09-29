import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SelectionConnections from "./SelectionConnections";

afterEach(() => vi.restoreAllMocks());

it.each([["journey-list", "journey-detail"], ["lifelog-journal", "lifelog-journal-detail"], ["lifelog-journal", "lifelog-quick-record"], ["lifelog-collection-list", "lifelog-collection-detail"], ["lifelog-collection-list", "lifelog-collection-form"]])("tracks %s and %s bounds, clamps scrolling, and removes hidden connections", (listKey, detailKey) => {
  let paint: FrameRequestCallback = () => {};
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { paint = callback; return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  let rowY = 300, axisX = 500;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const [x, y, width, height] = this.matches("svg") ? [0, 0, 1000, 800]
      : this.matches(".lag-orb-icon") ? [axisX, 20, 50, 50]
      : this.matches(".lag-panel-body") ? [600, 100, 300, 400]
      : this.matches("button") ? [600, rowY, 300, 80]
      : this.closest(`[data-stage-key="${detailKey}"]`) ? [50, 0, 400, 600]
      : [600, 0, 300, 600];
    return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) };
  });
  const content = (active: boolean) => <div>
    <button data-menu-id="quests" aria-pressed="true"><span className="lag-orb-icon" /></button>
    <div data-stage-key={listKey} data-panel-role="list"><div className="lag-panel-frame"><div className="lag-panel-body"><button aria-pressed="true" /></div></div></div>
    <div data-stage-key={detailKey} data-panel-role="detail" data-panel-side="left"><div className="lag-panel-frame" /></div>
    <SelectionConnections active={active} />
  </div>;
  const view = render(content(true));
  const path = (name: string) => view.container.querySelector(`[data-connection="${name}"]`)!;
  const tick = () => act(() => paint(0));
  tick();
  expect(path("list")).toHaveAttribute("d", "M557,45 H584 V340 H600");
  expect(path("detail")).toHaveAttribute("d", "M493,45 H468 V45 H450");
  rowY = -100; axisX = 510; tick();
  expect(path("list")).toHaveAttribute("d", "M567,45 H584 V109 H600");
  rowY = 900; tick();
  expect(path("list")).toHaveAttribute("d", "M567,45 H584 V491 H600");
  view.container.querySelector(`[data-stage-key="${detailKey}"]`)!.setAttribute("aria-hidden", "true"); tick();
  expect(path("detail")).toHaveAttribute("d", "");
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(390); tick();
  expect(path("list")).toHaveAttribute("d", "");
  view.rerender(content(false));
  for (const p of view.container.querySelectorAll("path")) expect(p).toHaveAttribute("d", "");
});
