import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COLLECTION_CATEGORIES } from "@/shared/api/types";
import type { CollectionInfo } from "@/shared/api/types";
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
    api.deleteCollectionApi.mockResolvedValue({ id: item.id });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  describe("canonical create/update controls를 제출하면", () => {
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
