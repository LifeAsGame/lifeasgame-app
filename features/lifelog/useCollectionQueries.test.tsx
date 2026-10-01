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
    vi.resetAllMocks();
    api.searchCollectionsApi.mockResolvedValue([first]);
    api.getCollectionApi.mockImplementation(async (id: number) => id === created.id ? created : first);
    api.createCollectionApi.mockResolvedValue({ id: created.id });
    api.updateCollectionApi.mockResolvedValue({ ...created, quantity: 3, conditionNote: "Updated" });
    api.deleteCollectionApi.mockResolvedValue(undefined);
  });

  describe("search와 server page를 변경하면", () => {
    it("clears rows when the title or page query key changes", async () => {
      let finishTitle: (items: CollectionInfo[]) => void = () => {};
      let finishPage: (items: CollectionInfo[]) => void = () => {};
      api.searchCollectionsApi.mockImplementation(({ titleLike, page }: { titleLike?: string; page: number }) =>
        page === 1 ? new Promise<CollectionInfo[]>((resolve) => { finishPage = resolve; })
          : titleLike ? new Promise<CollectionInfo[]>((resolve) => { finishTitle = resolve; }) : Promise.resolve([first]));
      const { result } = renderHook(() => useCollectionQueries(true));
      act(() => result.current.search("BOOK"));
      await waitFor(() => expect(result.current.list.items).toEqual([first]));
      act(() => result.current.search("BOOK", "Architecture"));
      expect(result.current.list.items).toEqual([]);
      await act(async () => { finishTitle([first]); });
      act(() => result.current.changePage(1));
      expect(result.current.list.items).toEqual([]);
      await act(async () => { finishPage([]); });
      expect(result.current.list.items).toEqual([]);
    });

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
      expect(result.current.selectedId).toBeNull();
      act(() => result.current.select(created.id));
      await waitFor(() => expect(result.current.detail.data?.id).toBe(created.id));
      expect(api.getCollectionApi).toHaveBeenCalledWith(created.id);

      await act(async () => {
        await result.current.update(created.id, { quantity: 3, conditionNote: "Updated", acquiredFrom: "Gift" });
      });
      expect(api.updateCollectionApi).toHaveBeenCalledWith(created.id, { quantity: 3, conditionNote: "Updated", acquiredFrom: "Gift" });
      expect(result.current.detail.data).toEqual(expect.objectContaining({ quantity: 3, conditionNote: "Updated" }));

      await act(async () => { expect(await result.current.remove(created.id)).toBe(true); });
      expect(api.deleteCollectionApi).toHaveBeenCalledWith(created.id);
      expect(result.current.selectedId).toBeNull();
      expect(result.current.detail.data).toBeNull();
      expect(result.current.list.items).toEqual([first]);
      expect(result.current.mutationError).toBeNull();
      expect(api.searchCollectionsApi).toHaveBeenCalledTimes(6);
      expect(api.searchCollectionsApi.mock.calls.slice(3)).toEqual([
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
        [{ category: "BOOK", titleLike: "Architecture", page: 2, size: 20 }],
      ]);
    });

    it("keeps a confirmed deletion when only the list reload fails", async () => {
      api.searchCollectionsApi.mockResolvedValueOnce([first]).mockRejectedValueOnce(new Error("List unavailable"));
      const { result } = renderHook(() => useCollectionQueries());
      await waitFor(() => expect(result.current.list.items).toEqual([first]));
      act(() => result.current.select(first.id));
      await waitFor(() => expect(result.current.detail.data).toEqual(first));

      await act(async () => { expect(await result.current.remove(first.id)).toBe(true); });

      expect(result.current.selectedId).toBeNull();
      expect(result.current.list.items).toEqual([]);
      expect(result.current.list.error).toBe("List unavailable");
      expect(result.current.mutationSuccess).toBe("수집 기록을 삭제했습니다.");
      expect(result.current.refreshError).toMatch(/변경은 저장됐지만/);
      expect(result.current.mutationError).toBeNull();
    });

    it("does not clear the selection or claim success when DELETE fails", async () => {
      api.deleteCollectionApi.mockRejectedValueOnce(new Error("Delete failed"));
      const { result } = renderHook(() => useCollectionQueries());
      await waitFor(() => expect(result.current.list.items).toEqual([first]));
      act(() => result.current.select(first.id));
      await waitFor(() => expect(result.current.detail.data).toEqual(first));

      await act(async () => { expect(await result.current.remove(first.id)).toBe(false); });

      expect(result.current.selectedId).toBe(first.id);
      expect(result.current.list.items).toEqual([first]);
      expect(result.current.mutationError).toMatch(/요청 결과가 확정되지 않았습니다.*Delete failed/);
    });
  });
  it.each(["create", "update", "remove"] as const)("ignores late %s completion after leaving and starting a new draft", async (command) => {
    let finish: (value: CollectionInfo) => void = () => {};
    const fn = command === "create" ? api.createCollectionApi : command === "update" ? api.updateCollectionApi : api.deleteCollectionApi;
    fn.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useCollectionQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    act(() => result.current.select(first.id));
    await waitFor(() => expect(result.current.detail.data).toEqual(first));
    let request: Promise<boolean>;
    act(() => { request = command === "create" ? result.current.create({ category: "BOOK", title: "Old", quantity: 1 }) : command === "update" ? result.current.update(first.id, { quantity: 3 }) : result.current.remove(first.id); });
    act(() => { result.current.resetMutation(); result.current.clearSelection(); });
    const reads = api.searchCollectionsApi.mock.calls.length;
    await act(async () => { finish(created); expect(await request!).toBe(false); });
    expect(result.current.selectedId).toBeNull();
    expect(result.current.pendingMutation).toBeNull();
    expect(result.current.mutationSuccess).toBeNull();
    expect(result.current.mutationError).toBeNull();
    expect(api.searchCollectionsApi).toHaveBeenCalledTimes(reads);
  });

  it("does not unlock a newer command or resend an unconfirmed command", async () => {
    let oldFail: (error: Error) => void = () => {}, finish: (value: { id: number }) => void = () => {};
    api.createCollectionApi.mockImplementationOnce(() => new Promise((_, reject) => { oldFail = reject; })).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useCollectionQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    let old: Promise<boolean>, next: Promise<boolean>;
    act(() => { old = result.current.create({ category: "BOOK", title: "Old", quantity: 1 }); });
    act(() => result.current.resetMutation());
    act(() => { next = result.current.create({ category: "BOOK", title: "New", quantity: 1 }); });
    await act(async () => { oldFail(new Error("Late failure")); await old; });
    expect(result.current.pendingMutation).toBe("create");
    expect(result.current.mutationError).toBeNull();
    await act(async () => { expect(await result.current.create({ category: "BOOK", title: "Duplicate", quantity: 1 })).toBe(false); });
    expect(api.createCollectionApi).toHaveBeenCalledTimes(2);
    await act(async () => { finish({ id: 99 }); await next; });
    expect(result.current.pendingMutation).toBeNull();
  });

  it("keeps confirmed success through lookup failure and retries only GET", async () => {
    api.searchCollectionsApi.mockResolvedValueOnce([first]).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce([created, first]);
    const { result } = renderHook(() => useCollectionQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    await act(async () => { expect(await result.current.create({ category: "BOOK", title: "New", quantity: 1 })).toBe(true); });
    expect(result.current.mutationSuccess).toBe("수집 기록을 저장했습니다.");
    expect(result.current.mutationError).toBeNull();
    expect(result.current.refreshError).toMatch(/변경은 저장됐지만/);
    await act(async () => { await result.current.list.reload(); });
    expect(result.current.mutationSuccess).toBe("수집 기록을 저장했습니다.");
    expect(result.current.refreshError).toBeNull();
    expect(api.createCollectionApi).toHaveBeenCalledTimes(1);
  });

  it("does not replace a newer detail when the post-create list completes late", async () => {
    let finish: (items: CollectionInfo[]) => void = () => {};
    api.searchCollectionsApi.mockResolvedValueOnce([first]).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useCollectionQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    let save: Promise<boolean>;
    act(() => { save = result.current.create({ category: "BOOK", title: "New", quantity: 1 }); });
    await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenCalledTimes(2));
    act(() => result.current.select(first.id));
    await waitFor(() => expect(result.current.detail.data).toEqual(first));
    await act(async () => { finish([created]); expect(await save).toBe(false); });
    expect(result.current.selectedId).toBe(first.id);
    expect(result.current.detail.data).toEqual(first);
    expect(api.getCollectionApi).not.toHaveBeenCalledWith(created.id);
  });

  it("does not perform follow-up reads after unmount", async () => {
    let finish: (value: { id: number }) => void = () => {};
    api.createCollectionApi.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, unmount } = renderHook(() => useCollectionQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    let request: Promise<boolean>;
    act(() => { request = result.current.create({ category: "BOOK", title: "Old", quantity: 1 }); });
    unmount();
    await act(async () => { finish({ id: 99 }); expect(await request).toBe(false); });
    expect(api.searchCollectionsApi).toHaveBeenCalledTimes(1);
  });

});
