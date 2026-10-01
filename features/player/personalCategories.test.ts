import { expect, it, vi } from "vitest";
import { assignPersonalCategoryApi, createPersonalCategoryApi, deletePersonalCategoryApi, listPersonalCategoriesApi, renamePersonalCategoryApi, SYSTEM_CODES } from "./personalCategories";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiDelete: vi.fn(), USE_MOCK: false }));
vi.mock("@/shared/api/client", () => client);

it("uses the owner-scoped contract routes and explicit null assignment", async () => {
  client.apiGet.mockResolvedValue([]); client.apiPost.mockResolvedValue({}); client.apiPatch.mockResolvedValue({}); client.apiDelete.mockResolvedValue(undefined);
  await listPersonalCategoriesApi("CERTIFICATION");
  await createPersonalCategoryApi("HOBBY", "Weekend");
  await renamePersonalCategoryApi("HOBBY", 7, "Study");
  await assignPersonalCategoryApi("HOBBY", 42, null);
  await deletePersonalCategoryApi("HOBBY", 7);
  expect(client.apiGet).toHaveBeenCalledWith("/api/v1/players/categories/CERTIFICATION");
  expect(client.apiPost).toHaveBeenCalledWith("/api/v1/players/categories/HOBBY", { name: "Weekend" });
  expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/categories/HOBBY/7", { name: "Study" });
  expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/categories/HOBBY/items/42/personal-category", { personalCategoryId: null });
  expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/categories/HOBBY/7");
  expect(SYSTEM_CODES.CERTIFICATION).toHaveLength(11);
  expect(SYSTEM_CODES.HOBBY).toHaveLength(18);
});
