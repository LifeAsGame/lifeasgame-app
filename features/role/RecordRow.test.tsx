import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RecordRow } from "./RecordRow";

function pointer(target: HTMLElement, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true }, pointerType: { value: "mouse" } });
  fireEvent(target, event);
}
it("드래그는 기준과 방향을 구분해 선택지만 열며 click 중복과 키보드 취소를 처리한다", () => {
  const onSelect = vi.fn(), onEdit = vi.fn(), onArchive = vi.fn();
  render(<RecordRow title="Alex" onSelect={onSelect} onEdit={onEdit} onArchive={onArchive} />);
  const row = screen.getByRole("button", { name: "Alex" });
  for (const [dx, dy] of [[-40, 0], [-90, 140]]) {
    pointer(row, "pointerdown", 200, 100); pointer(row, "pointermove", 200 + dx, 100 + dy); pointer(row, "pointerup", 200 + dx, 100 + dy);
    fireEvent.click(row, { detail: 1 });
    expect(screen.queryByRole("button", { name: "보관" })).not.toBeInTheDocument();
    expect(row.style.transform).toBe("translateX(0px)");
  }
  pointer(row, "pointerdown", 200, 100); pointer(row, "pointermove", 100, 100); pointer(row, "pointerup", 100, 100); fireEvent.click(row, { detail: 1 });
  expect(screen.getByRole("button", { name: "보관" })).toBeInTheDocument();
  expect(onSelect).not.toHaveBeenCalled(); expect(onEdit).not.toHaveBeenCalled(); expect(onArchive).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "수정" })); expect(onEdit).toHaveBeenCalledOnce();
  fireEvent.keyDown(screen.getByRole("button", { name: "보관" }), { key: "Escape" });
  expect(screen.queryByRole("button", { name: "보관" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Alex 작업" }), { detail: 0 });
  fireEvent.click(screen.getByRole("button", { name: "보관" }), { detail: 0 }); expect(onArchive).toHaveBeenCalledOnce();
  fireEvent.click(row, { detail: 0 }); expect(onSelect).toHaveBeenCalledOnce();
});
