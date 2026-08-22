import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PanelStackItem } from "@/entities/nav";
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
  id: "skills-list-passive",
  kind: "list",
  title: "Passive List",
  selectedId,
  items: [
    { id: "skill-a", label: "Skill A", slotLabel: "A", detailDescription: "A", detailRows: [] },
    { id: "skill-b", label: "Skill B", slotLabel: "B", detailDescription: "B", detailRows: [] },
  ],
  context: { main: "skills", route: "skills-list" },
});

const detail = (id: string): PanelStackItem => ({
  id: `skills-detail-${id}`,
  kind: "placeholder",
  title: "Skill Detail",
  description: id,
  rows: [],
});

describe("RightPanels stable stage frames", () => {
  it("preserves the root and detail DOM frames while child content changes", () => {
    const props = { selectedMain: "player" as const, onPanelItemSelect: vi.fn() };
    const view = render(<RightPanels {...props} panelStack={[root()]} />);
    const rootStage = document.querySelector('[data-stage-key="player-stage-0"]');

    view.rerender(<RightPanels {...props} panelStack={[root("title"), list("skill-a"), detail("skill-a")]} />);
    const detailStage = document.querySelector('[data-stage-key="player-stage-2"]');
    expect(document.querySelector('[data-stage-key="player-stage-0"]')).toBe(rootStage);

    view.rerender(<RightPanels {...props} panelStack={[root("title"), list("skill-b"), detail("skill-b")]} />);
    expect(document.querySelector('[data-stage-key="player-stage-0"]')).toBe(rootStage);
    expect(document.querySelector('[data-stage-key="player-stage-2"]')).toBe(detailStage);
    expect(screen.getByText("skill-b")).toBeInTheDocument();
  });

  it("gives Skills child stages a feature-state Back affordance", () => {
    const onBack = vi.fn();
    render(<RightPanels selectedMain="skills" panelStack={[root("title"), list("skill-a"), detail("skill-a")]} onPanelItemSelect={vi.fn()} onPanelBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Back to Passive List" }));

    expect(onBack).toHaveBeenCalledWith(2);
  });
});
