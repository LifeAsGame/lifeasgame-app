import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PanelStackItem } from "@/entities/nav";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import RightPanels from "./RightPanels";

const root = (selectedId?: string): PanelStackItem => ({
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
