import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerSkillInfo, SkillCatalogInfo } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import SkillsShell from "./SkillsShell";

const api = vi.hoisted(() => ({ getPlayerSkillsApi: vi.fn(), getSkillCatalogApi: vi.fn() }));
vi.mock("@/lib/api/endpoints/skills.api", () => api);

const skills: PlayerSkillInfo[] = [
  { id: 1, skillCode: "GUARD", skillName: "Shield Mastery", type: "PASSIVE", category: "Defense", level: 3, exp: 40, expToNext: 100, equipped: false, equippedSlot: null, acquiredAt: "2026-08-01T00:00:00Z" },
  { id: 2, skillCode: "FOCUS", skillName: "Battle Focus", type: "PASSIVE", category: "Combat", level: 2, exp: 10, expToNext: 80, equipped: true, equippedSlot: 1, acquiredAt: "2026-08-02T00:00:00Z" },
  { id: 3, skillCode: "SLASH", skillName: "Arc Slash", type: "ACTIVE", category: "Combat", level: 4, exp: 90, expToNext: 160, equipped: true, equippedSlot: 2, acquiredAt: "2026-08-03T00:00:00Z" },
];
const catalog: SkillCatalogInfo[] = [
  { code: "GUARD", name: "Shield Mastery", type: "PASSIVE", category: "Defense", maxLevel: 10, descriptionMd: "Improves guard strength.", statsPerLevel: { defense: 2 } },
  { code: "FOCUS", name: "Battle Focus", type: "PASSIVE", category: "Combat", maxLevel: 8, descriptionMd: "Improves concentration.", statsPerLevel: {} },
  { code: "SLASH", name: "Arc Slash", type: "ACTIVE", category: "Combat", maxLevel: 12, descriptionMd: "A sweeping attack.", statsPerLevel: { power: 3 } },
];

describe("canonical Skills surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    api.getPlayerSkillsApi.mockResolvedValue(skills);
    api.getSkillCatalogApi.mockResolvedValue(catalog);
  });

  it("filters backend-owned Skills and keeps the detail frame stable during replacement", async () => {
    const view = render(<SkillsShell surface="passive" onBack={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Shield Mastery/ }));
    const detail = document.querySelector('[data-stage-key="skills-stage-2"]');
    expect(screen.getByText("Improves guard strength.")).toBeInTheDocument();
    expect(screen.getByText("EXP: 40 / 100")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Arc Slash/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Battle Focus/ }));
    expect(document.querySelector('[data-stage-key="skills-stage-2"]')).toBe(detail);
    expect(screen.getByText("Improves concentration.")).toBeInTheDocument();
    expect(api.getPlayerSkillsApi).toHaveBeenCalledTimes(1);
    expect(api.getSkillCatalogApi).toHaveBeenCalledTimes(1);

    const list = document.querySelector('[data-stage-key="skills-stage-1"]');
    view.rerender(<SkillsShell surface="active" onBack={vi.fn()} />);
    expect(document.querySelector('[data-stage-key="skills-stage-1"]')).toBe(list);
    expect(await screen.findByRole("button", { name: /Arc Slash/ })).toBeInTheDocument();
    view.rerender(<SkillsShell surface="passive" onBack={vi.fn()} />);
    expect(document.querySelector('[data-stage-key="skills-stage-2"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Back to Passive Skills" })).not.toBeInTheDocument();
  });

  it("renders query failure with retry and sends Back only from real spatial navigation", async () => {
    api.getPlayerSkillsApi.mockRejectedValueOnce(new Error("Skills unavailable"));
    render(<SkillsShell surface="passive" onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Skills unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: /Shield Mastery/ });

    fireEvent.click(screen.getByRole("button", { name: /Shield Mastery/ }));
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    fireEvent.click(screen.getByRole("button", { name: "Back to Passive Skills" }));

    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
    expect(focus.mock.calls[0][0]).toMatchObject({ detail: { key: "skills-stage-1", align: "back" } });
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });
});
