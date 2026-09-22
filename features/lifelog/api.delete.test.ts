import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("treats a real bodyless 204 Collection DELETE as void and preserves HTTP failures", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
  vi.resetModules();
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: false, code: "COLLECTION_DELETE_FAILED", message: "Delete failed" }), { status: 500 }));
  vi.stubGlobal("fetch", fetchMock);
  const { deleteCollectionApi } = await import("./api");

  await expect(deleteCollectionApi(31)).resolves.toBeUndefined();
  await expect(deleteCollectionApi(32)).rejects.toMatchObject({ status: 500, code: "COLLECTION_DELETE_FAILED" });
  expect(fetchMock.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: init?.body }))).toEqual([
    { url: expect.stringMatching(/\/api\/v1\/players\/collections\/31$/), method: "DELETE", body: undefined },
    { url: expect.stringMatching(/\/api\/v1\/players\/collections\/32$/), method: "DELETE", body: undefined },
  ]);
});
