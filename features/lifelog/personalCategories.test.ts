import { beforeEach, expect, it, vi } from "vitest";
import {
  addSystemLifeLogCategory, assignLifeLogRecordCategory, createPersonalLifeLogCategory,
  deletePersonalLifeLogCategory, getMyLifeLogCategories, getSystemLifeLogCategories,
  hideSystemLifeLogCategory, renamePersonalLifeLogCategory,
} from "./personalCategories";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiDelete: vi.fn(), apiPut: vi.fn() }));
vi.mock("@/shared/api/client", () => client);
beforeEach(() => vi.clearAllMocks());

it("uses owner-scoped category routes and keeps original record IDs distinct", async () => {
  client.apiGet.mockResolvedValueOnce([{ code: "PROJECT", name: "PROJECT" }]).mockResolvedValueOnce([{ id: 7, source: "PERSONAL", name: "계획", systemCode: null }]);
  await expect(getSystemLifeLogCategories("COLLECTION")).resolves.toEqual([{ code: "PROJECT", name: "PROJECT" }]);
  await expect(getMyLifeLogCategories("COLLECTION")).resolves.toEqual([{ id: 7, kind: "COLLECTION", source: "PERSONAL", name: "계획", systemCode: null }]);
  await addSystemLifeLogCategory("COLLECTION", "PROJECT");
  await hideSystemLifeLogCategory("COLLECTION", "PROJECT");
  await createPersonalLifeLogCategory("EXERCISE", "주말 운동");
  await renamePersonalLifeLogCategory(7, "평일 운동");
  await deletePersonalLifeLogCategory(7);
  await assignLifeLogRecordCategory("MEDIA", 51, null);
  expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/players/lifelog/categories/system", { kind: "COLLECTION", systemCode: "PROJECT" });
  expect(client.apiDelete).toHaveBeenNthCalledWith(1, "/api/v1/players/lifelog/categories/system/COLLECTION/PROJECT");
  expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/players/lifelog/categories/personal", { kind: "EXERCISE", name: "주말 운동" });
  expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/players/lifelog/categories/personal/7", { name: "평일 운동" });
  expect(client.apiPut).toHaveBeenCalledWith("/api/v1/players/lifelog/categories/records/MEDIA/51/personal-category", { categoryId: null });
});
