import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CollectionInfo } from "@/shared/api/types";
import { useCollectionQueries } from "./useCollectionQueries";

const api = vi.hoisted(() => ({
  createCollectionApi: vi.fn(),
  deleteCollectionApi: vi.fn(),
  getCollectionApi: vi.fn(),
  searchCollectionsApi: vi.fn(),
  updateCollectionApi: vi.fn(),
}));

vi.mock("./api", () => api);

const first: CollectionInfo = {
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
const created = { ...first, id: 99, title: "Created by server" };

describe("Collection query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchCollectionsApi.mockResolvedValue([first]);
    api.getCollectionApi.mockImplementation(async (id: number) => id === created.id ? created : first);
    api.createCollectionApi.mockResolvedValue({ id: created.id });
    api.updateCollectionApi.mockResolvedValue({ ...created, quantity: 3, conditionNote: "Updated" });
    api.deleteCollectionApi.mockResolvedValue({ id: created.id });
  });

  describe("search와 server page를 변경하면", () => {
    it("category/title/page/size를 authoritative reload마다 보존한다", async () => {
      const { result } = renderHook(() => useCollectionQueries());
      await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenCalledWith({ page: 0, size: 20 }));

      act(() => result.current.search("BOOK", " Architecture "));
      await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 0, size: 20 }));
      act(() => result.current.changePage(2));
      await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }));
      await act(async () => { await result.current.list.reload(); });

      expect(api.searchCollectionsApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 });
      expect(result.current.list.items).toEqual([first]);
    });
  });

  describe("create/update/delete를 수행하면", () => {
    it("각 mutation 뒤 reload하고 returned source ID로 fetch/select하며 selected delete를 clear한다", async () => {
      api.searchCollectionsApi
        .mockResolvedValueOnce([first])
        .mockResolvedValueOnce([first])
        .mockResolvedValueOnce([first])
        .mockResolvedValueOnce([created, first])
        .mockResolvedValueOnce([{ ...created, quantity: 3, conditionNote: "Updated" }, first])
        .mockResolvedValueOnce([first]);
      const { result } = renderHook(() => useCollectionQueries());
      await waitFor(() => expect(result.current.list.items).toEqual([first]));
      act(() => result.current.search("BOOK", "Architecture"));
      await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 0, size: 20 }));
      act(() => result.current.changePage(2));
      await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }));

      await act(async () => {
        await result.current.create({ category: "BOOK", title: "Submitted title", quantity: 1 });
      });
      await waitFor(() => expect(result.current.detail.data?.id).toBe(created.id));
      expect(api.getCollectionApi).toHaveBeenCalledWith(created.id);
      expect(result.current.detail.data?.title).toBe("Created by server");

      await act(async () => {
        await result.current.update(created.id, { quantity: 3, conditionNote: "Updated", acquiredFrom: "Gift" });
      });
      expect(api.updateCollectionApi).toHaveBeenCalledWith(created.id, { quantity: 3, conditionNote: "Updated", acquiredFrom: "Gift" });
      expect(result.current.detail.data).toEqual(expect.objectContaining({ quantity: 3, conditionNote: "Updated" }));

      await act(async () => { await result.current.remove(created.id); });
      expect(api.deleteCollectionApi).toHaveBeenCalledWith(created.id);
      expect(result.current.selectedId).toBeNull();
      expect(result.current.detail.data).toBeNull();
      expect(api.searchCollectionsApi).toHaveBeenCalledTimes(6);
      expect(api.searchCollectionsApi.mock.calls.slice(3)).toEqual([
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
      ]);
    });
  });
});
