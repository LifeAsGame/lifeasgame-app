import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useState } from "react";
import CreateSlot, { CreateCategory, useCreateMode } from "./CreateSlot";
import { SwipeButton } from "@/features/role/RecordRow";

function pointer(target: HTMLElement, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
  fireEvent(target, event);
}

it("분류 클릭·미달·세로 이동은 생성하지 않고 왼쪽 당김과 Alt+Enter만 같은 이벤트를 실행한다", () => {
  const create = vi.fn(), list = vi.fn();
  render(<SwipeButton creation onClick={list} onSwipeLeft={create}>분류</SwipeButton>);
  const category = screen.getByRole("button", { name: "분류" });
  fireEvent.click(category); expect(list).toHaveBeenCalledOnce();
  for (const [dx, dy] of [[-50, 0], [-90, 120], [-90, 0]]) {
    pointer(category, "pointerdown", 200, 200); pointer(category, "pointermove", 200 + dx, 200 + dy); pointer(category, "pointerup", 200 + dx, 200 + dy); fireEvent.click(category, { detail: 1 });
  }
  expect(list).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce();
  fireEvent.keyDown(category, { key: "Enter", altKey: true }); expect(create).toHaveBeenCalledTimes(2);
  expect(category).toHaveAttribute("aria-keyshortcuts", "Alt+Enter");
});

it("빈 목록도 최초 목록이며 실패 입력·오류를 유지하고 취소/성공은 같은 프레임과 목록 상태로 복귀한다", async () => {
  const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  function Harness() {
    const mode = useCreateMode(); const [error, setError] = useState("");
    return <div className="lag-panel-body" data-testid="frame"><CreateCategory title="취미" onOpen={mode.close} onCreate={mode.open} />
      <CreateSlot creating={mode.creating} onClose={mode.close} list={<><p>빈 목록</p><input aria-label="필터" defaultValue="내 필터" /></>}>
        <form onSubmit={async (event) => { event.preventDefault(); if (!await mode.save(submit)) setError("저장 실패"); }}><input aria-label="등록 이름" defaultValue="" /><button>저장</button>{error ? <p role="alert">{error}</p> : null}</form>
      </CreateSlot></div>;
  }
  render(<Harness />); const frame = screen.getByTestId("frame"), category = screen.getByRole("button", { name: "취미" });
  fireEvent.click(category); expect(screen.queryByLabelText("등록 이름")).not.toBeInTheDocument();
  frame.scrollTop = 72;
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  expect(screen.getByTestId("frame")).toBe(frame); expect(screen.getByLabelText("등록 이름")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("등록 이름"), { target: { value: "초안" } }); fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패"); expect(screen.getByLabelText("등록 이름")).toHaveValue("초안");
  fireEvent.keyDown(screen.getByLabelText("등록 이름"), { key: "Escape" });
  await waitFor(() => expect(category).toHaveFocus()); expect(frame.scrollTop).toBe(72); expect(screen.getByLabelText("필터")).toHaveValue("내 필터");
  fireEvent.keyDown(category, { key: "Enter", altKey: true }); fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(screen.queryByLabelText("등록 이름")).not.toBeInTheDocument()); expect(screen.getByTestId("frame")).toBe(frame);
});

it("이전 저장 성공은 새 생성 초안을 닫지 않는다", async () => {
  let finish!: (saved: boolean) => void;
  const pending = new Promise<boolean>((resolve) => { finish = resolve; });
  function Harness() {
    const mode = useCreateMode();
    return <><CreateCategory title="인물" onOpen={mode.close} onCreate={mode.open} /><CreateSlot creating={mode.creating} onClose={mode.close} list={<p>목록</p>}><input aria-label="이름" /><button onClick={() => void mode.save(() => pending)}>저장</button></CreateSlot></>;
  }
  render(<Harness />);const category = screen.getByRole("button", { name: "인물" });
  fireEvent.keyDown(category, { key: "Enter", altKey: true }); fireEvent.click(screen.getByRole("button", { name: "저장" })); fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.keyDown(category, { key: "Enter", altKey: true }); fireEvent.change(screen.getByLabelText("이름"), { target: { value: "새 초안" } });
  await act(async () => { finish(true); }); expect(screen.getByLabelText("이름")).toHaveValue("새 초안");
});
