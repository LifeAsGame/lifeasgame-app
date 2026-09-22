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
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" data-testid="collection-entry" onClick={onClick}>{label}</button>,
}));

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

describe("Collection source surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchCollectionsApi.mockResolvedValue([item]);
    api.getCollectionApi.mockResolvedValue(item);
    api.createCollectionApi.mockResolvedValue({ id: 99 });
    api.updateCollectionApi.mockResolvedValue({ ...item, quantity: 2, conditionNote: "Used", acquiredFrom: "Gift" });
    api.deleteCollectionApi.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  describe("canonical create/update controls를 제출하면", () => {
    it("handles native delete cancellation and a bodyless success without an error banner", async () => {
      api.searchCollectionsApi.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
      const confirm = vi.mocked(window.confirm);
      render(<CollectionShell />);
      fireEvent.click(await screen.findByTestId("collection-entry"));
      await screen.findByText("Collection source #31");

      confirm.mockReturnValueOnce(false);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(api.deleteCollectionApi).not.toHaveBeenCalled();
      expect(screen.getByText("Collection source #31")).toBeInTheDocument();

      confirm.mockReturnValueOnce(true);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(api.deleteCollectionApi).toHaveBeenCalledWith(item.id));
      await waitFor(() => expect(screen.queryByTestId("collection-entry")).not.toBeInTheDocument());
      await waitFor(() => expect(screen.queryByText("Collection source #31")).not.toBeInTheDocument());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(api.searchCollectionsApi).toHaveBeenCalledTimes(2);
    });

    it("lets mobile users reach the search and create panel", async () => {
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      try {
        render(<CollectionShell />);
        await screen.findByTestId("collection-entry");

        fireEvent.click(screen.getByRole("button", { name: "Search or Add Collection" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-search", align: "back" });

        fireEvent.click(screen.getByRole("button", { name: "Back to Collections" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "forward" });

        fireEvent.click(screen.getByTestId("collection-entry"));
        await screen.findByText("Collection source #31");
        fireEvent.click(screen.getByRole("button", { name: "Back to Collection list" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });

        fireEvent.click(screen.getByTestId("collection-entry"));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-detail", align: "forward" });
      } finally {
        window.removeEventListener(STAGE_FOCUS_EVENT, focus);
      }
    });

    it("returns to the list while detail is pending without a late response refocusing it", async () => {
      let resolveDetail: (value: CollectionInfo) => void = () => {};
      api.getCollectionApi.mockImplementationOnce(() => new Promise<CollectionInfo>((resolve) => { resolveDetail = resolve; }));
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      try {
        render(<CollectionShell />);
        fireEvent.click(await screen.findByTestId("collection-entry"));
        expect(screen.getByText("Loading Collection...")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Back to Collection list" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });
        const callsAfterReturn = focus.mock.calls.length;

        await act(async () => { resolveDetail(item); });
        expect(screen.getByText("Collection source #31")).toBeInTheDocument();
        expect(focus).toHaveBeenCalledTimes(callsAfterReturn);
      } finally {
        window.removeEventListener(STAGE_FOCUS_EVENT, focus);
      }
    });

    it("returns from a failed detail request and reopens the same item after recovery", async () => {
      api.getCollectionApi.mockRejectedValueOnce(new Error("Detail unavailable"));
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      try {
        render(<CollectionShell />);
        fireEvent.click(await screen.findByTestId("collection-entry"));
        expect(await screen.findByRole("alert", { name: "" })).toHaveTextContent("Detail unavailable");
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Back to Collection list" }));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });

        fireEvent.click(screen.getByTestId("collection-entry"));
        expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-detail", align: "forward" });
        expect(await screen.findByText("Collection source #31")).toBeInTheDocument();
        expect(screen.queryByText("Detail unavailable")).not.toBeInTheDocument();
      } finally {
        window.removeEventListener(STAGE_FOCUS_EVENT, focus);
      }
    });

    it("weekly reflection을 full Collection create 계약으로 전송한다", async () => {
      render(<CollectionShell />);
      await screen.findByTestId("collection-entry");
      fireEvent.click(screen.getByText("Add Collection"));
      fireEvent.change(screen.getByLabelText("Create category"), { target: { value: "BOOK" } });
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Weekly notes" } });
      fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
      fireEvent.click(screen.getByLabelText("Weekly reflection"));
      fireEvent.click(screen.getByRole("button", { name: "Create Collection" }));

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
      await screen.findByTestId("collection-entry");

      const filter = screen.getByLabelText("Category filter") as HTMLSelectElement;
      expect(Array.from(filter.options, ({ value }) => value).slice(1)).toEqual([...COLLECTION_CATEGORIES]);
      fireEvent.click(screen.getByText("Add Collection"));
      expect(screen.queryByLabelText(/rarity|acquired date|item name/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Create category")).toBeRequired();
      expect(screen.getByLabelText("Title")).toBeRequired();
      expect(screen.getByLabelText("Quantity")).toBeRequired();
      fireEvent.change(screen.getByLabelText("Create category"), { target: { value: "CARD" } });
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Rare card" } });
      fireEvent.change(screen.getByLabelText("Original title"), { target: { value: "Original" } });
      fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText("Condition note"), { target: { value: "Sleeved" } });
      fireEvent.change(screen.getByLabelText("Acquired from"), { target: { value: "Trade" } });
      fireEvent.change(screen.getByLabelText("Tags, comma separated"), { target: { value: "rare, card" } });
      fireEvent.click(screen.getByRole("button", { name: "Create Collection" }));

      await waitFor(() => expect(api.createCollectionApi).toHaveBeenCalledWith({
        category: "CARD",
        title: "Rare card",
        originalTitle: "Original",
        quantity: 1,
        conditionNote: "Sleeved",
        acquiredFrom: "Trade",
        tags: ["rare", "card"],
      }));

      fireEvent.click(screen.getByTestId("collection-entry"));
      await screen.findByText("Collection source #31");
      fireEvent.change(screen.getByLabelText("Update quantity"), { target: { value: "2" } });
      fireEvent.change(screen.getByLabelText("Update condition note"), { target: { value: "Used" } });
      fireEvent.change(screen.getByLabelText("Update acquired from"), { target: { value: "Gift" } });
      fireEvent.click(screen.getByRole("button", { name: "Update Collection" }));

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
});
