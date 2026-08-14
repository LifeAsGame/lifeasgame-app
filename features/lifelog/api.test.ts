import { beforeEach, describe, expect, it, vi } from "vitest";

import { COLLECTION_CATEGORIES, EXERCISE_CATEGORIES } from "@/shared/api/types";
import type { CollectionCreateRequest, CollectionInfo, CollectionUpdateRequest, ExerciseCreateRequest, ExerciseInfo, ExerciseUpdateRequest, JournalPage, JournalSubtype, QuickRecordRequest } from "@/shared/api/types";
import {
  createCollectionApi,
  createExerciseApi,
  deleteCollectionApi,
  deleteExerciseApi,
  getCollectionApi,
  getExerciseApi,
  getJournalDetailApi,
  listJournalApi,
  quickRecordApi,
  recentCollectionsApi,
  recentExercisesApi,
  searchCollectionsApi,
  searchExercisesApi,
  updateCollectionApi,
  updateExerciseApi,
} from "./api";
import { collectionMock, exerciseMock, journalMock, MOCK_JOURNAL_ENTRIES, resetJournalMock } from "./mock";

const client = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiGetRaw: vi.fn(),
  apiPost: vi.fn(),
  apiPostRaw: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

const emptyPage: JournalPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
const collection: CollectionInfo = {
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
const exercise: ExerciseInfo = {
  id: 41,
  playerId: 7,
  category: "RUNNING",
  durationMinutes: 30,
  distanceKm: 5,
  calories: 250,
  exercisedOn: "2026-08-14",
  memo: "Morning run",
  createdAt: "2026-08-14T00:00:00Z",
  updatedAt: "2026-08-14T00:00:00Z",
};

describe("Exercise source API를 호출할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJournalMock();
  });

  it("exact six paths에서 recent/search/create/update는 raw, get/delete는 envelope client를 사용한다", async () => {
    client.apiGetRaw.mockResolvedValue([exercise]);
    client.apiGet.mockResolvedValue(exercise);
    client.apiPostRaw.mockResolvedValueOnce({ id: 41 }).mockResolvedValueOnce(exercise);
    client.apiDelete.mockResolvedValue({ id: 41 });
    const create: ExerciseCreateRequest = { category: "RUNNING", durationMinutes: 30, distanceKm: 5, calories: 250, exercisedOn: "2026-08-14", memo: "Morning run" };
    const update: ExerciseUpdateRequest = { category: "YOGA", durationMinutes: 45, exercisedOn: "2026-08-15", memo: "" };

    await recentExercisesApi(12);
    const search = await searchExercisesApi({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 });
    await getExerciseApi(41);
    await createExerciseApi(create);
    await updateExerciseApi(41, update);
    await deleteExerciseApi(41);

    expect(client.apiGetRaw).toHaveBeenNthCalledWith(1, "/api/v1/players/exercises/recent?limit=12");
    expect(client.apiGetRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/exercises/search?category=RUNNING&from=2026-08-01&to=2026-08-14&page=2&size=20");
    expect(client.apiGet).toHaveBeenCalledWith("/api/v1/players/exercises/41");
    expect(client.apiPostRaw).toHaveBeenNthCalledWith(1, "/api/v1/players/exercises", create);
    expect(client.apiPostRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/exercises/41", update);
    expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/exercises/41");
    expect(search).toEqual([exercise]);
    expect(search).not.toHaveProperty("totalElements");
  });

  it("canonical request fields와 partial/null mock semantics를 한 authority에서 유지한다", () => {
    const journalIds = journalMock.page({ page: 0, size: 20 }).content.map(({ lifeLogId }) => lifeLogId);
    const create: ExerciseCreateRequest = { category: "CYCLING", durationMinutes: 60, distanceKm: 0, calories: 0, exercisedOn: "2026-08-14", memo: "Ride" };
    const created = exerciseMock.create(create);
    const updated = exerciseMock.update(created.id, { durationMinutes: 75, distanceKm: null, calories: null, memo: "" });

    expect(EXERCISE_CATEGORIES).toEqual(["RUNNING", "WALKING", "CYCLING", "SWIMMING", "GYM", "YOGA", "OTHER"]);
    for (const unsupported of ["playerId", "userId", "ownerPlayerId", "intensity", "duration", "caloriesBurned", "notes"]) expect(create).not.toHaveProperty(unsupported);
    expect(updated).toEqual(expect.objectContaining({ durationMinutes: 75, distanceKm: 0, calories: 0, memo: null }));
    expect(exerciseMock.search({ category: "CYCLING", from: "2026-08-14", to: "2026-08-14", page: 0, size: 1 }).map(({ id }) => id)).toEqual([created.id]);
    expect(exerciseMock.delete(created.id)).toEqual({ id: created.id });
    expect(journalMock.page({ page: 0, size: 20 }).content.map(({ lifeLogId }) => lifeLogId)).toEqual(journalIds);
  });
});

describe("Collection source API를 호출할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJournalMock();
  });

  describe("backend의 mixed response contract를 따르면", () => {
    it("recent/search/create/update는 raw, get/delete는 envelope client를 exact endpoint로 사용한다", async () => {
      client.apiGetRaw.mockResolvedValue([collection]);
      client.apiGet.mockResolvedValue(collection);
      client.apiPostRaw.mockResolvedValueOnce({ id: 31 }).mockResolvedValueOnce(collection);
      client.apiDelete.mockResolvedValue({ id: 31 });
      const create: CollectionCreateRequest = { category: "BOOK", title: "Architecture Notes", quantity: 1 };
      const update: CollectionUpdateRequest = { quantity: 2, conditionNote: "Used", acquiredFrom: "Gift" };

      await recentCollectionsApi(12);
      const search = await searchCollectionsApi({ category: "BOOK", titleLike: "A/B ?", page: 2, size: 20 });
      await getCollectionApi(31);
      await createCollectionApi(create);
      await updateCollectionApi(31, update);
      await deleteCollectionApi(31);

      expect(client.apiGetRaw).toHaveBeenNthCalledWith(1, "/api/v1/players/collections/recent?limit=12");
      expect(client.apiGetRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/collections/search?category=BOOK&titleLike=A%2FB+%3F&page=2&size=20");
      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/players/collections/31");
      expect(client.apiPostRaw).toHaveBeenNthCalledWith(1, "/api/v1/players/collections", create);
      expect(client.apiPostRaw).toHaveBeenNthCalledWith(2, "/api/v1/players/collections/31", update);
      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/players/collections/31");
      expect(search).toEqual([collection]);
      expect(search).not.toHaveProperty("totalElements");
      expect(search).not.toHaveProperty("totalPages");
    });
  });

  describe("source request semantics를 유지하면", () => {
    it("canonical categories와 exact create/update fields만 허용하고 caller identity를 보내지 않는다", () => {
      const create: CollectionCreateRequest = { category: "CARD", title: "Rare card", quantity: 1 };
      const update: CollectionUpdateRequest = { quantity: 2, conditionNote: "Sleeved", acquiredFrom: "Trade" };

      expect(COLLECTION_CATEGORIES).toEqual(["FIGURE", "CARD", "BOOK", "GAME", "STAMP", "COIN", "OTHER"]);
      expect(create).toEqual({ category: "CARD", title: "Rare card", quantity: 1 });
      expect(update).toEqual({ quantity: 2, conditionNote: "Sleeved", acquiredFrom: "Trade" });
      expect(create).not.toHaveProperty("playerId");
      expect(create).not.toHaveProperty("userId");
      for (const unsupported of ["title", "category", "originalTitle", "tags"]) expect(update).not.toHaveProperty(unsupported);
    });

    it("mock recent/search/get/create/update/delete가 한 source authority를 사용하고 Journal을 조작하지 않는다", () => {
      const journalIds = journalMock.page({ page: 0, size: 20 }).content.map(({ lifeLogId }) => lifeLogId);
      expect(collectionMock.recent(1).map(({ id }) => id)).toEqual([204]);
      expect(collectionMock.search({ category: "BOOK", titleLike: "architecture", page: 0, size: 1 }).map(({ id }) => id)).toEqual([204]);

      const created = collectionMock.create({ category: "CARD", title: "New card", quantity: 1 });
      expect(collectionMock.get(created.id)).toEqual(expect.objectContaining({ title: "New card", category: "CARD", quantity: 1 }));
      const updated = collectionMock.update(created.id, { quantity: 2, conditionNote: "Sleeved", acquiredFrom: "Trade" });
      expect(updated).toEqual(expect.objectContaining({ title: "New card", category: "CARD", quantity: 2, conditionNote: "Sleeved", acquiredFrom: "Trade" }));
      expect(collectionMock.delete(created.id)).toEqual({ id: created.id });
      expect(() => collectionMock.get(created.id)).toThrow("Collection not found.");
      expect(journalMock.page({ page: 0, size: 20 }).content.map(({ lifeLogId }) => lifeLogId)).toEqual(journalIds);
    });
  });
});

describe("Journal을 실제 backend에서 읽을 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJournalMock();
    client.apiGet.mockResolvedValue(emptyPage);
    client.apiPost.mockResolvedValue({ sourceType: "COLLECTION", sourceId: 31, recordedAt: "2026-08-14T00:00:00Z", replay: false });
  });

  describe("목록 filter와 server page를 요청하면", () => {
    it("self endpoint에 Role/subtype/page/size만 안전하게 encode하고 ApiResponse result를 사용한다", async () => {
      const result = await listJournalApi({ primaryRoleId: 31, subtype: "MEMORY/NOTE" as JournalSubtype, page: 2, size: 5 });

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs?primaryRoleId=31&subtype=MEMORY%2FNOTE&page=2&size=5");
      expect(client.apiGet.mock.calls[0][0]).not.toContain("playerId");
      expect(result).toBe(emptyPage);
    });

    it("All filters에서는 identity query 없이 page/size만 전송한다", async () => {
      await listJournalApi({ page: 0, size: 20 });

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs?page=0&size=20");
    });
  });

  describe("Journal detail을 선택하면", () => {
    it("sourceId가 아니라 lifeLogId로 canonical detail endpoint를 호출한다", async () => {
      client.apiGet.mockResolvedValueOnce({ lifeLogId: 104 });

      await getJournalDetailApi(104);

      expect(client.apiGet).toHaveBeenCalledWith("/api/v1/lifelogs/104");
    });
  });

  describe("Quick Record를 저장하면", () => {
    it("self endpoint에 exact payload와 Idempotency-Key만 전달한다", async () => {
      const body: QuickRecordRequest = {
        type: "COLLECTION",
        lifeLogSubtype: "MEMORY",
        primaryRoleId: 31,
        collection: { category: "BOOK", title: "Private title", quantity: 1 },
      };

      await quickRecordApi(body, "quick-key-31");

      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/lifelogs/quick-record", body, {
        headers: { "Idempotency-Key": "quick-key-31" },
      });
      expect(body).not.toHaveProperty("playerId");
      expect(body).not.toHaveProperty("userId");
      expect(body.collection).not.toHaveProperty("lifeLogSubtype");
      expect(body.collection).not.toHaveProperty("primaryRoleId");
      expect(body.collection).not.toHaveProperty("roleEventId");
      expect(body).not.toHaveProperty("reflectionScope");
      expect(body).not.toHaveProperty("roleEventId");
    });

    it("Media progress를 생략한 request를 invent하지 않고 그대로 전달한다", async () => {
      const body: QuickRecordRequest = {
        type: "MEDIA",
        media: { category: "ANIME", title: "Frieren", status: "WATCHING" },
      };

      await quickRecordApi(body, "media-key");

      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/lifelogs/quick-record", body, {
        headers: { "Idempotency-Key": "media-key" },
      });
      expect(body.media).not.toHaveProperty("currentEpisode");
      expect(body.media).not.toHaveProperty("totalEpisode");
    });
  });

  describe("mock mode contract를 사용하면", () => {
    it("세 physical source와 QUICK entryMode, nullable legacy metadata만 제공한다", () => {
      const sourceTypes = MOCK_JOURNAL_ENTRIES.map(({ sourceType }) => sourceType as string);
      const quick = MOCK_JOURNAL_ENTRIES.find(({ entryMode }) => entryMode === "QUICK")!;
      const legacy = MOCK_JOURNAL_ENTRIES.find(({ entryMode }) => entryMode === null)!;

      expect(new Set(sourceTypes)).toEqual(new Set(["COLLECTION", "EXERCISE", "MEDIA"]));
      expect(sourceTypes).not.toContain("QUICK");
      expect(quick.sourceType).toBe("EXERCISE");
      expect(legacy).toEqual(expect.objectContaining({ subtype: null, entryMode: null, reflectionScope: null, primaryRoleId: null, roleEventId: null }));
    });

    it("filter와 paging 후에도 server mock order와 lifeLogId detail identity를 유지한다", () => {
      const firstPage = journalMock.page({ page: 0, size: 2 });
      const rolePage = journalMock.page({ primaryRoleId: 2, page: 0, size: 20 });

      expect(firstPage.content.map(({ lifeLogId }) => lifeLogId)).toEqual([104, 103]);
      expect(firstPage).toEqual(expect.objectContaining({ page: 0, size: 2, totalElements: 4, totalPages: 2 }));
      expect(rolePage.content.map(({ lifeLogId }) => lifeLogId)).toEqual([102]);
      expect(journalMock.detail(103)).toEqual(expect.objectContaining({ lifeLogId: 103, sourceType: "EXERCISE", entryMode: "QUICK" }));
    });

    it("같은 key/payload는 같은 Source를 replay하고 Journal authority에 한 번만 기록한다", () => {
      const body: QuickRecordRequest = {
        type: "EXERCISE",
        lifeLogSubtype: "ACTIVITY",
        exercise: { category: "RUNNING", durationMinutes: 1, exercisedOn: "2026-08-14", distanceKm: 0, calories: 0 },
      };

      const first = journalMock.quickRecord(body, "same-key");
      const replay = journalMock.quickRecord(body, "same-key");
      const page = journalMock.page({ page: 0, size: 20 });
      const matches = page.content.filter((entry) => entry.sourceType === first.sourceType && entry.sourceId === first.sourceId);

      expect(first.replay).toBe(false);
      expect(replay).toEqual({ ...first, replay: true });
      expect(matches).toHaveLength(1);
      expect(matches[0].entryMode).toBe("QUICK");
      expect(matches[0].lifeLogId).not.toBe(first.sourceId);
      expect(matches[0].preview).toEqual(expect.objectContaining({ distanceKm: 0, calories: 0 }));
      expect(journalMock.detail(matches[0].lifeLogId)).toEqual(expect.objectContaining({ sourceId: first.sourceId }));
    });

    describe("Media progress를 canonical Journal state로 materialize하면", () => {
      it.each([
        ["둘 다 생략", undefined, undefined, 0, 1],
        ["current zero만 제공", 0, undefined, 0, 1],
        ["current 5만 제공", 5, undefined, 5, 5],
        ["total 12만 제공", undefined, 12, 0, 12],
        ["둘 다 제공", 5, 12, 5, 12],
      ])("%s이면 preview/detail에 normalized pair를 함께 사용한다", (_case, currentEpisode, totalEpisode, current, total) => {
        const body: QuickRecordRequest = {
          type: "MEDIA",
          media: {
            category: "ANIME",
            title: "Progress case",
            status: "WATCHING",
            ...(currentEpisode === undefined ? {} : { currentEpisode }),
            ...(totalEpisode === undefined ? {} : { totalEpisode }),
          },
        };

        const result = journalMock.quickRecord(body, `progress-${_case}`);
        const entry = journalMock.page({ page: 0, size: 20 }).content.find(({ sourceType, sourceId }) =>
          sourceType === result.sourceType && sourceId === result.sourceId
        );
        if (!entry || entry.sourceType !== "MEDIA") throw new Error("Media Journal entry not found.");
        const detail = journalMock.detail(entry.lifeLogId);
        if (detail.sourceType !== "MEDIA") throw new Error("Media Journal detail not found.");

        expect(entry.preview).toEqual(expect.objectContaining({ currentEpisode: current, totalEpisode: total }));
        expect(detail.source).toEqual(expect.objectContaining({ currentEpisode: current, totalEpisode: total }));
      });

      it("same-key replay는 normalized row를 중복 생성하지 않는다", () => {
        const body: QuickRecordRequest = {
          type: "MEDIA",
          media: { category: "ANIME", title: "Replay", status: "WATCHING", currentEpisode: 5 },
        };

        const first = journalMock.quickRecord(body, "media-replay");
        const replay = journalMock.quickRecord(body, "media-replay");
        const matches = journalMock.page({ page: 0, size: 20 }).content.filter(({ sourceType, sourceId }) =>
          sourceType === first.sourceType && sourceId === first.sourceId
        );

        expect(replay).toEqual({ ...first, replay: true });
        expect(matches).toHaveLength(1);
        expect(matches[0].preview).toEqual(expect.objectContaining({ currentEpisode: 5, totalEpisode: 5 }));
      });
    });
  });
});
