import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GrowthShell from "@/features/player/GrowthShell";
import { BackButton } from "@/widgets/right-panels/ui/PanelFrame";
import ConsumerShell from "./ConsumerShell";

vi.mock("./SelectionConnections", () => ({ default: () => null }));
vi.mock("@/features/player/api", () => ({ getPlayerGrowthApi: async () => ({
  current: { level: 2, exp: 25, str: 1, agi: 1, dex: 1, intel: 1, vit: 1, luc: 1, extraStats: {}, representativeTitleId: null },
  recentExpChanges: [{ changeId: 1, requestedExp: 25, appliedExp: 25, leftoverExp: 0, beforeLevel: 1, afterLevel: 2, beforeTotalExp: 0, afterTotalExp: 25, occurredAt: "2026-09-29", sourceType: "QUEST", sourceId: 3 }],
}) }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
  // jsdom has no layout; actual visibility and rectangles are checked in the browser.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("returns detail → history → growth → Player → menus → Home using Korean back actions and restores callers", async () => {
  function Flow() {
    const [open, setOpen] = useState(false);
    const [player, setPlayer] = useState(false);
    const [growth, setGrowth] = useState(false);
    return <ConsumerShell open={open} main={player ? "player" : null} home={<p>홈 요약</p>} utilities={null}
      onOpen={() => setOpen(true)} onClose={() => setOpen(false)} onMenu={() => setPlayer(false)}>
      <button data-menu-id="player" onClick={() => setPlayer(true)}>플레이어</button>
      {player && (growth ? <GrowthShell onBack={() => setGrowth(false)} /> : <button onClick={() => setGrowth(true)}>성장</button>)}
    </ConsumerShell>;
  }
  render(<Flow />);
  const menu = screen.getByRole("button", { name: /시스템 메뉴/ });
  menu.focus(); fireEvent.click(menu);
  fireEvent.click(screen.getByRole("button", { name: "플레이어" }));
  fireEvent.click(screen.getByRole("button", { name: "성장" }));
  const history = await screen.findByRole("button", { name: /경험치 이력 보기/ });
  expect(screen.queryByRole("button", { name: /\+25 EXP/ })).not.toBeInTheDocument();
  fireEvent.click(history);
  const change = screen.getByRole("button", { name: /\+25 EXP/ });
  fireEvent.click(change);
  expect(screen.getByText("경험치 변동 상세")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: "경험치 이력으로" }), { key: "Escape" });
  await waitFor(() => expect(change).toHaveFocus());
  fireEvent.keyDown(change, { key: "Escape" });
  await waitFor(() => expect(history).toHaveFocus());
  fireEvent.keyDown(history, { key: "Escape" });
  expect(screen.getByRole("button", { name: "성장" })).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.queryByRole("button", { name: "성장" })).not.toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(menu).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("ignores inactive/exiting stages and preserves a draft when the existing back confirmation is canceled", async () => {
  const parent = vi.fn(), stale = vi.fn(), close = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  function Draft() {
    const [text, setText] = useState("");
    return <><input aria-label="초안" value={text} onChange={e => setText(e.target.value)} />
      <BackButton label="기록 목록으로" onClick={() => { if (window.confirm("초안을 버릴까요?")) close(); }} /></>;
  }
  render(<ConsumerShell open main="lifelog" home={null} utilities={null} onOpen={vi.fn()} onClose={parent} onMenu={parent}>
    <BackButton label="상위 화면으로" onClick={parent} /><Draft />
    <div inert aria-hidden="true"><BackButton label="닫히는 화면으로" onClick={stale} /></div>
  </ConsumerShell>);
  const input = screen.getByRole("textbox", { name: "초안" });
  fireEvent.change(input, { target: { value: "보존할 입력" } }); input.focus();
  await act(async () => { fireEvent.keyDown(input, { key: "Escape" }); });
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled(); expect(parent).not.toHaveBeenCalled(); expect(stale).not.toHaveBeenCalled();
  expect(input).toHaveValue("보존할 입력"); expect(input).toHaveFocus();
});

it("Escape cancels only the nested confirmation and restores focus without closing the draft", async () => {
  const { default: SaoAlert } = await import("@/shared/ui/SaoAlert");
  const back = vi.fn(), submit = vi.fn();
  function Confirmation() {
    const [confirm, setConfirm] = useState(false);
    return <ConsumerShell open main="lifelog" home={null} utilities={null} onOpen={vi.fn()} onMenu={back} onClose={back}>
      <input aria-label="작성 중인 기록" defaultValue="확인 취소 후에도 남는 입력" />
      <BackButton label="목록으로" onClick={back} />
      <button onClick={() => setConfirm(true)}>저장 확인</button>
      <SaoAlert isOpen={confirm} title="저장할까요?" onCancel={() => setConfirm(false)} onConfirm={submit} />
    </ConsumerShell>;
  }
  render(<Confirmation />);
  const caller = screen.getByRole("button", { name: "저장 확인" }); caller.focus(); fireEvent.click(caller);
  const dialog = screen.getByRole("dialog", { name: "저장할까요?" }); await waitFor(() => expect(screen.getByRole("button", { name: "취소" })).toHaveFocus());
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(caller).toHaveFocus());
  expect(back).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox")).toHaveValue("확인 취소 후에도 남는 입력");
});
