import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock("@/shared/api/client", () => api);
import { createMemberPerson, deleteGuildNote, getGuildNote, getMemberPerson, personGuildNotes, saveGuildNote, selectMemberPerson } from "./memberPersonApi";
beforeEach(() => vi.clearAllMocks());
it("keeps group, Player and Person IDs distinct and sends no client owner/User identity", async () => {
  const context = { groupType: "ROLE_PARTY" as const, groupId: 3, memberPlayerId: 17 };
  await getMemberPerson(context); expect(api.apiGet).toHaveBeenCalledWith("/api/v1/member-person-links?groupType=ROLE_PARTY&groupId=3&memberPlayerId=17");
  await selectMemberPerson(context, 92); expect(api.apiPut).toHaveBeenCalledWith("/api/v1/member-person-links", { ...context, personId: 92 });
  await createMemberPerson(context, { displayName: "내 이름", notes: null, contact: null, birthday: null }); expect(api.apiPost).toHaveBeenCalledWith("/api/v1/member-person-links", { ...context, displayName: "내 이름", notes: null, contact: null, birthday: null });
});
it("uses independent Guild note commands, optional create version, history paging and bodyless deletion", async () => {
  await getGuildNote(3, 17); expect(api.apiGet).toHaveBeenCalledWith("/api/v1/guilds/3/members/17/my-note");
  await saveGuildNote(3, 17, { personId: 92, text: "A" }); expect(api.apiPut).toHaveBeenCalledWith("/api/v1/guilds/3/members/17/my-note", { personId: 92, text: "A" });
  await saveGuildNote(4, 17, { personId: 92, text: "B", version: 5 }); expect(api.apiPut).toHaveBeenLastCalledWith("/api/v1/guilds/4/members/17/my-note", { personId: 92, text: "B", version: 5 });
  await personGuildNotes(92, 2); expect(api.apiGet).toHaveBeenCalledWith("/api/v1/persons/92/guild-notes?page=2&size=20&includeHistory=true");
  await deleteGuildNote(61); expect(api.apiDelete).toHaveBeenCalledWith("/api/v1/guild-notes/61");
});
