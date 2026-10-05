import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PanelStackItem } from "@/entities/nav";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import RightPanels from "./RightPanels";

const root = (selectedId?: string): Extract<PanelStackItem, { kind: "menu" }> => ({
  id: "main-player",
  kind: "menu",
  title: "Player",
  selectedId,
  items: [{ id: "title", label: "Title", slotLabel: "TI" }],
  context: { main: "player", route: "main-submenu" },
});

const list = (selectedId?: string): PanelStackItem => ({
  id: "player-title-list",
  kind: "list",
  title: "Title List",
  selectedId,
  items: [
    { id: "title-a", label: "Title A", slotLabel: "A", detailDescription: "A", detailRows: [] },
    { id: "title-b", label: "Title B", slotLabel: "B", detailDescription: "B", detailRows: [] },
  ],
  context: { main: "player", route: "player-title-list" },
});

const detail = (id: string): PanelStackItem => ({
  id: `player-title-detail-${id}`,
  kind: "placeholder",
  title: "Title Detail",
  description: id,
  rows: [],
});

describe("RightPanels stable stage frames", () => {
  it("preserves the root and detail DOM frames while child content changes", () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    const props = { selectedMain: "player" as const, onPanelItemSelect: vi.fn() };
    const view = render(<RightPanels {...props} panelStack={[root()]} />);
    const rootStage = document.querySelector('[data-stage-key="player-stage-0"]');

    view.rerender(<RightPanels {...props} panelStack={[root("title"), list("title-a"), detail("title-a")]} />);
    const detailStage = document.querySelector('[data-stage-key="player-stage-2"]');
    expect(document.querySelector('[data-stage-key="player-stage-0"]')).toBe(rootStage);

    focus.mockClear();
    view.rerender(<RightPanels {...props} panelStack={[root("title"), list("title-b"), detail("title-b")]} />);
    expect(document.querySelector('[data-stage-key="player-stage-0"]')).toBe(rootStage);
    expect(document.querySelector('[data-stage-key="player-stage-2"]')).toBe(detailStage);
    expect(screen.getByText("title-b")).toBeInTheDocument();
    expect(focus).not.toHaveBeenCalled();
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

});

it("keeps secondary category order while the primary menu reorders around its selection", () => {
  const items = ["first", "middle", "last"].map((id) => ({ id, label: id, slotLabel: id[0] }));
  const props = { selectedMain: "player" as const, onPanelItemSelect: vi.fn() };
  const menu: Extract<PanelStackItem, { kind: "menu" }> = { ...root("last"), items };
  const category: Extract<PanelStackItem, { kind: "menu" }> = { ...menu, id: "categories", context: { main: "player", route: "player-category" } };
  const view = render(<RightPanels {...props} panelStack={[menu, category]} />);
  const labels = (index: number) => [...view.container.querySelectorAll(`[data-stage-key="player-stage-${index}"] .lag-role-node strong`)].map((node) => node.textContent);
  expect(labels(0)).toEqual(["first", "last", "middle"]);
  expect(labels(1)).toEqual(["first", "middle", "last"]);
  view.rerender(<RightPanels {...props} panelStack={[menu, { ...category, selectedId: "first" }]} />);
  expect(labels(1)).toEqual(["first", "middle", "last"]);
});


it("focuses an activated submenu before navigation even when pointer panning prevents native focus", () => {
  let caller: Element | null = null;
  const select = vi.fn(() => { caller = document.activeElement; });
  render(<div onPointerDown={event => event.preventDefault()}><RightPanels selectedMain="player" panelStack={[root()]} onPanelItemSelect={select} /></div>);
  const button = screen.getByRole("button", { name: /Title/ });
  fireEvent.pointerDown(button); fireEvent.click(button);
  expect(caller).toBe(button);
  expect(button).toHaveFocus();
  expect(select).toHaveBeenCalledExactlyOnceWith(0, "title");
});

it("플레이어 분류는 한 번 누르면 목록, Alt+Enter로 내 분류 생성 폼을 연다", () => {
  const select = vi.fn(), create = vi.fn();
  const panel = { ...root(), items: [{ id: "credentials", label: "자격증", slotLabel: "CE" }, { id: "title", label: "칭호", slotLabel: "TI" }] };
  render(<RightPanels selectedMain="player" panelStack={[panel]} onPanelItemSelect={select} onPanelItemCreate={create} />);
  fireEvent.click(screen.getByRole("button", { name: "자격증" })); expect(select).toHaveBeenCalledWith(0, "credentials"); expect(create).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("button", { name: "자격증" }), { key: "Enter", altKey: true }); expect(create).toHaveBeenCalledWith(0, "credentials");
  const count = create.mock.calls.length; fireEvent.keyDown(screen.getByRole("button", { name: /칭호/ }), { key: "Enter", altKey: true }); expect(create).toHaveBeenCalledTimes(count);
});

it("역할 소모임도 모임 메뉴에서 생성 요청을 연다", () => {
  const create = vi.fn();
  const panel: Extract<PanelStackItem, { kind: "menu" }> = {
    id: "social-menu", kind: "menu", title: "모임", items: [{ id: "role-parties", label: "역할 소모임", slotLabel: "RP" }],
    context: { main: "social", route: "main-submenu" },
  };
  render(<RightPanels selectedMain="social" panelStack={[panel]} onPanelItemSelect={vi.fn()} onPanelItemCreate={create} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "역할 소모임" }), { key: "Enter", altKey: true });
  expect(create).toHaveBeenCalledExactlyOnceWith(0, "role-parties");
});
