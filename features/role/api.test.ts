import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archivePersonApi,
  archiveRoleApi,
  archiveRoleRelationApi,
  createPersonApi,
  createRoleApi,
  createRoleRelationApi,
  getPersonApi,
  getRoleApi,
  getRoleEventApi,
  getRoleRelationApi,
  listPersonsApi,
  listRoleEventsApi,
  listRoleRelationsApi,
  listRolesApi,
  updatePersonApi,
  updateRoleApi,
  updateRoleRelationApi,
} from "./api";
import { roleMock } from "./mock";

const client = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("실제 Role shell API를 호출할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const api of Object.values(client)) api.mockResolvedValue({});
  });

  describe("Role과 Person lifecycle을 수행하면", () => {
    it("backend collection/detail/mutation endpoint와 정확한 method를 사용한다", async () => {
      const role = { roleType: "PROFESSIONAL", name: "Engineer", description: "Build" };
      const person = { displayName: "Alex", notes: null, birthday: null, contact: null };

      await listRolesApi();
      await getRoleApi(3);
      await createRoleApi(role);
      await updateRoleApi(3, role);
      await archiveRoleApi(3);
      await listPersonsApi();
      await getPersonApi(7);
      await createPersonApi(person);
      await updatePersonApi(7, person);
      await archivePersonApi(7);

      expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/roles");
      expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/roles/3");
      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/roles", role);
      expect(client.apiPut).toHaveBeenCalledWith("/api/v1/roles/3", role);
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/roles/3");
      expect(client.apiGet).toHaveBeenNthCalledWith(3, "/api/v1/persons");
      expect(client.apiGet).toHaveBeenNthCalledWith(4, "/api/v1/persons/7");
      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/persons", person);
      expect(client.apiPut).toHaveBeenCalledWith("/api/v1/persons/7", person);
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/persons/7");
      expect(person).not.toHaveProperty("linkedUserId");
    });
  });

  describe("선택된 Role의 Relations를 관리하면", () => {
    it("Person ID만 relation payload로 보내고 linkedUserId를 만들지 않는다", async () => {
      const create = { personId: 7, relationType: "FAMILY", roleNotes: "Call weekly" };
      const update = { relationType: "MENTOR", roleNotes: null };

      await listRoleRelationsApi(3);
      await getRoleRelationApi(3, 9);
      await createRoleRelationApi(3, create);
      await updateRoleRelationApi(3, 9, update);
      await archiveRoleRelationApi(3, 9);

      expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/roles/3/relations");
      expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/roles/3/relations/9");
      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/roles/3/relations", create);
      expect(client.apiPut).toHaveBeenCalledWith("/api/v1/roles/3/relations/9", update);
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/roles/3/relations/9");
      expect(create).not.toHaveProperty("linkedUserId");
    });
  });

  describe("선택된 Role의 Events를 조회하면", () => {
    it("목록과 상세만 GET하고 Event command를 보내지 않는다", async () => {
      await listRoleEventsApi(3);
      await getRoleEventApi(3, 11);

      expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/roles/3/events");
      expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/roles/3/events/11");
      expect(client.apiPost).not.toHaveBeenCalled();
      expect(client.apiPut).not.toHaveBeenCalled();
      expect(client.apiDelete).not.toHaveBeenCalled();
    });
  });

  describe("mock fallback을 사용하면", () => {
    it("real response DTO와 같은 shape만 반환한다", () => {
      const mockRole = roleMock.listRoles()[0];
      const mockRelation = roleMock.listRelations(2)[0];

      expect(mockRole).toEqual(expect.objectContaining({ id: expect.any(Number), roleType: expect.any(String), status: "ACTIVE", version: expect.any(Number) }));
      expect(mockRelation).toEqual(expect.objectContaining({ personId: expect.any(Number), linkedUserId: null, relationType: expect.any(String) }));
      expect(mockRelation).not.toHaveProperty("roleId");
    });
  });
});
