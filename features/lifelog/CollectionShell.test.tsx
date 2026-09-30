import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COLLECTION_CATEGORIES } from "@/shared/api/types";
import type { CollectionInfo } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import CollectionShell from "./CollectionShell";

const api = vi.hoisted(() => ({
  createCollectionApi: vi.fn(),
  deleteCollectionApi: vi.fn(),
  getCollectionApi: vi.fn(),
  searchCollectionsApi: vi.fn(),
  updateCollectionApi: vi.fn(),
}));

vi.mock("./api", () => api);


const item: CollectionInfo = {
  id: 31,
  playerId: 7,
  category: "BOOK",
  title: "Architecture Notes",
  originalTitle: null,
  quantity: 1,
  conditionNote: "Annotated",
  acquiredFrom: "Local bookstore",
  tags: ["architecture"],
  createdAt: "2026-08-12T09:00:00Z",
  updatedAt: "2026-08-12T09:00:00Z",
};

describe("수집 기록 source surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    Element.prototype.scrollIntoView = vi.fn();
    api.searchCollectionsApi.mockResolvedValue([item]);
    api.getCollectionApi.mockResolvedValue(item);
    api.createCollectionApi.mockResolvedValue({ id: 99 });
    api.updateCollectionApi.mockResolvedValue({ ...item, quantity: 2, conditionNote: "Used", acquiredFrom: "Gift" });
    api.deleteCollectionApi.mockResolvedValue(undefined);
  });

  describe("canonical create/update controls를 제출하면", () => {
    it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.searchCollectionsApi.mockReset().mockResolvedValue([]);
    render(<CollectionShell />);
    await screen.findByText("수집 기록이 없습니다.");
    const category = screen.getByRole("button", { name: "수집 기록" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("수집 기록이 없습니다.")).toBeVisible());
  });

  it("handles SAO delete cancellation and a bodyless success without an error banner", async () => {
      api.searchCollectionsApi.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
      render(<CollectionShell />);
      fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes.*수량/ }));
      await screen.findByText("수집 기록 #31");
      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog(false);
      expect(api.deleteCollectionApi).not.toHaveBeenCalled();
      expect(screen.getByText("수집 기록 #31")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
      await waitFor(() => expect(api.deleteCollectionApi).toHaveBeenCalledWith(item.id));
      await waitFor(() => expect(screen.queryByRole("button", { name: /Architecture Notes.*수량/ })).not.toBeInTheDocument());
      await waitFor(() => expect(screen.queryByText("수집 기록 #31")).not.toBeInTheDocument());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(api.searchCollectionsApi).toHaveBeenCalledTimes(2);
    });

    it("opens and cancels create without sending a command", async () => {
      render(<CollectionShell />);
      await screen.findByRole("button", { name: /Architecture Notes.*수량/ });
      fireEvent.keyDown(screen.getByRole("button", { name: "수집 기록" }), { key: "Enter", altKey: true });
      expect(screen.getByLabelText("등록할 분류")).toHaveFocus();
      fireEvent.click(screen.getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByLabelText("등록할 분류")).not.toBeInTheDocument());
      expect(api.createCollectionApi).not.toHaveBeenCalled();
    });

    it("returns to the list while detail is pending without a late response refocusing it", async () => {
      let resolveDetail: (value: CollectionInfo) => void = () => {};
      api.getCollectionApi.mockImplementationOnce(() => new Promise<CollectionInfo>((resolve) => { resolveDetail = resolve; }));
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      try {
        render(<CollectionShell />);
        fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes.*수량/ }));
        expect(screen.getByText("수집 기록을 불러오는 중…")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "수집 기록 목록으로" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });
        const callsAfterReturn = focus.mock.calls.length;

        await act(async () => { resolveDetail(item); });
        expect(screen.queryByText("수집 기록 #31")).not.toBeInTheDocument();
        expect(focus).toHaveBeenCalledTimes(callsAfterReturn);
      } finally {
        window.removeEventListener(STAGE_FOCUS_EVENT, focus);
      }
    });

    it("returns from a failed detail request and reopens the same item after recovery", async () => {
      api.getCollectionApi.mockRejectedValueOnce(new Error("설명 unavailable"));
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      try {
        render(<CollectionShell />);
        fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes.*수량/ }));
        expect(await screen.findByRole("alert", { name: "" })).toHaveTextContent("설명 unavailable");
        expect(screen.getByRole("button", { name: "상세 다시 조회" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "수집 기록 목록으로" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });

        fireEvent.click(screen.getByRole("button", { name: /Architecture Notes.*수량/ }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-detail", align: "forward" });
        expect(await screen.findByText("수집 기록 #31")).toBeInTheDocument();
        expect(screen.queryByText("설명 unavailable")).not.toBeInTheDocument();
      } finally {
        window.removeEventListener(STAGE_FOCUS_EVENT, focus);
      }
    });

    it("weekly reflection을 full 수집 기록 create 계약으로 전송한다", async () => {
      render(<CollectionShell />);
      await screen.findByRole("button", { name: /Architecture Notes.*수량/ });
      fireEvent.keyDown(screen.getByRole("button", { name: "수집 기록" }), { key: "Enter", altKey: true });
      fireEvent.change(screen.getByLabelText("등록할 분류"), { target: { value: "BOOK" } });
      fireEvent.change(screen.getByLabelText("제목"), { target: { value: "Weekly notes" } });
      fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
      fireEvent.click(screen.getByLabelText("주간 회고"));
      fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));

      await waitFor(() => expect(api.createCollectionApi).toHaveBeenCalledWith({
        category: "BOOK",
        title: "Weekly notes",
        quantity: 1,
        lifeLogSubtype: "REFLECTION",
        reflectionScope: "WEEKLY_LOOKBACK",
      }));
    });

    it("exact categories와 backend-supported fields만 전송한다", async () => {
      render(<CollectionShell />);
      await screen.findByRole("button", { name: /Architecture Notes.*수량/ });

      const filter = screen.getByLabelText("분류 필터") as HTMLSelectElement;
      expect(Array.from(filter.options, ({ value }) => value).slice(1)).toEqual([...COLLECTION_CATEGORIES]);
      fireEvent.keyDown(screen.getByRole("button", { name: "수집 기록" }), { key: "Enter", altKey: true });
      expect(screen.queryByLabelText(/rarity|acquired date|item name/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText("등록할 분류")).toBeRequired();
      expect(screen.getByLabelText("제목")).toBeRequired();
      expect(screen.getByLabelText("수량")).toBeRequired();
      fireEvent.change(screen.getByLabelText("등록할 분류"), { target: { value: "CARD" } });
      fireEvent.change(screen.getByLabelText("제목"), { target: { value: "Rare card" } });
      fireEvent.change(screen.getByLabelText("원제"), { target: { value: "Original" } });
      fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText("상태 메모"), { target: { value: "Sleeved" } });
      fireEvent.change(screen.getByLabelText("입수처"), { target: { value: "Trade" } });
      fireEvent.change(screen.getByLabelText("태그 (쉼표로 구분)"), { target: { value: "rare, card" } });
      fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));

      await waitFor(() => expect(api.createCollectionApi).toHaveBeenCalledWith({
        category: "CARD",
        title: "Rare card",
        originalTitle: "Original",
        quantity: 1,
        conditionNote: "Sleeved",
        acquiredFrom: "Trade",
        tags: ["rare", "card"],
      }));

      fireEvent.click(screen.getByRole("button", { name: /Architecture Notes.*수량/ }));
      await screen.findByText("수집 기록 #31");
      fireEvent.click(screen.getByRole("button", { name: "수집 기록 수정" }));
      fireEvent.change(screen.getByLabelText("변경할 수량"), { target: { value: "2" } });
      fireEvent.change(screen.getByLabelText("변경할 상태 메모"), { target: { value: "Used" } });
      fireEvent.change(screen.getByLabelText("변경할 입수처"), { target: { value: "Gift" } });
      fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));

      await waitFor(() => expect(api.updateCollectionApi).toHaveBeenCalledWith(31, {
        quantity: 2,
        conditionNote: "Used",
        acquiredFrom: "Gift",
      }));
      expect(api.updateCollectionApi.mock.calls[0][1]).not.toEqual(expect.objectContaining({
        title: expect.anything(),
        category: expect.anything(),
        originalTitle: expect.anything(),
        tags: expect.anything(),
      }));
    });
  });
  it("keeps a new create draft when an earlier save completes after Back", async () => {
    let finish: (value: { id: number }) => void = () => {};
    api.createCollectionApi.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<CollectionShell />);
    await screen.findByRole("button", { name: /Architecture Notes.*수량/ });
    fireEvent.keyDown(screen.getByRole("button", { name: "수집 기록" }), { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("등록할 분류"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "Old draft" } });
    fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
    expect(await screen.findByRole("status")).toHaveTextContent("변경 사항 저장 중");
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    await waitFor(() => expect(screen.queryByLabelText("등록할 분류")).not.toBeInTheDocument());
    fireEvent.keyDown(screen.getByRole("button", { name: "수집 기록" }), { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "New draft" } });
    await act(async () => { finish({ id: 99 }); });
    expect(screen.getByLabelText("제목")).toHaveValue("New draft");
    expect(screen.getByRole("button", { name: "수집 기록 저장" })).toBeEnabled();
    expect(screen.queryByText("수집 기록을 저장했습니다.")).not.toBeInTheDocument();
    expect(api.createCollectionApi).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the remounted Edit caller on cancellation", async () => {
    render(<CollectionShell />);
    fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes.*수량/ }));
    fireEvent.click(await screen.findByRole("button", { name: "수집 기록 수정" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "수집 기록 수정" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "수집 기록 수정" })).toHaveFocus());
    expect(api.updateCollectionApi).not.toHaveBeenCalled();
  });

});
