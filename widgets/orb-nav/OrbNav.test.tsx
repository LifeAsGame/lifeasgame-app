import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MAIN_NAV_ITEMS } from "@/entities/nav";
import { bringToFrontStable } from "@/shared/lib/reorder";
import OrbNav from "./OrbNav";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
it("keeps DOM order and focused ID stable across repeated selections, then resets", () => {
  const select = vi.fn();
  const view = render(<OrbNav items={MAIN_NAV_ITEMS} selectedId={null} onSelect={select} />);
  const journey = screen.getByRole("button", { name: "여정" });
  fireEvent.click(journey);
  view.rerender(<OrbNav items={bringToFrontStable(MAIN_NAV_ITEMS, "quests", x => x.id)} selectedId="quests" onSelect={select} />);
  expect(journey).toHaveFocus();
  const exchange = screen.getByRole("button", { name: "거래소" });
  fireEvent.click(exchange);
  view.rerender(<OrbNav items={bringToFrontStable(MAIN_NAV_ITEMS, "market", x => x.id)} selectedId="market" onSelect={select} />);
  expect(exchange).toHaveFocus();
  expect(screen.getAllByRole("button").map(x => x.getAttribute("aria-label"))).toEqual(["거래소", "플레이어", "소지품", "여정", "인물 · 역할", "생활 기록", "설정"]);
  view.rerender(<OrbNav items={MAIN_NAV_ITEMS} selectedId={null} onSelect={select} />);
  expect(screen.getAllByRole("button")[0]).toHaveAccessibleName("플레이어");
});
