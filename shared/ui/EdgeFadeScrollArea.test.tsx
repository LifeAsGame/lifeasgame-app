import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EdgeFadeScrollArea from "./EdgeFadeScrollArea";

afterEach(() => vi.unstubAllGlobals());

it("선택 항목을 가운데 놓는 여백을 크기 변경에 맞추되 React를 다시 렌더하지 않는다", () => {
  const notifyResize: Array<() => void> = [];
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { notifyResize.push(callback); }
    observe() {}
    disconnect() {}
  });
  const Content = vi.fn(() => <button data-scroll-center-target="true">선택 기록</button>);

  render(<EdgeFadeScrollArea centerSelected centerTargetKey="selected" centerTargetSelector='[data-scroll-center-target="true"]'><Content /></EdgeFadeScrollArea>);
  const scroll = screen.getByRole("button", { name: "선택 기록" }).parentElement!.parentElement!;
  Object.defineProperty(scroll, "clientHeight", { configurable: true, get: () => 400 });
  act(() => notifyResize.forEach((notify) => notify()));
  expect(scroll.firstElementChild).toHaveStyle({ paddingBlock: "166px" });
  act(() => notifyResize.forEach((notify) => notify()));
  expect(Content).toHaveBeenCalledOnce();
});
