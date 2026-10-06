import { expect, it, vi } from "vitest";
import { linkRoleGroup, personRoleContexts, roleGroupCandidates, roleGroupLinks, unlinkRoleGroup } from "./contextApi";
const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }));
vi.mock("@/shared/api/client", () => client);
it("uses the shared owner-scoped paths, contents pages and exact group identity", async () => {
  const page = { contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
  client.apiGet.mockResolvedValue(page);
  await expect(personRoleContexts(7, 0, true, "역할 & 팀")).resolves.toBe(page);
  expect(client.apiGet).toHaveBeenLastCalledWith("/api/v1/persons/7/role-contexts?page=0&size=20&includeArchived=true&keyword=%EC%97%AD%ED%95%A0+%26+%ED%8C%80");
  await roleGroupCandidates(2, "ROLE_PARTY", 1, "내 모임");
  expect(client.apiGet).toHaveBeenLastCalledWith("/api/v1/roles/2/group-link-candidates?groupType=ROLE_PARTY&page=1&size=20&keyword=%EB%82%B4+%EB%AA%A8%EC%9E%84");
  await roleGroupLinks(2);
  expect(client.apiGet).toHaveBeenLastCalledWith("/api/v1/roles/2/group-links?page=0&size=20");
  await linkRoleGroup(2, { groupType: "GUILD", groupId: 7 });
  expect(client.apiPost).toHaveBeenCalledWith("/api/v1/roles/2/group-links", { groupType: "GUILD", groupId: 7 });
  await unlinkRoleGroup(2, 13);
  expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/roles/2/group-links/13");
});
