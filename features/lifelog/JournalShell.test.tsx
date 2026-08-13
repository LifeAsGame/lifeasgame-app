import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalPage, QuickRecordResult, RoleDetail } from "@/shared/api/types";
import JournalShell from "./JournalShell";
import { journalMock, MOCK_JOURNAL_ENTRIES } from "./mock";

const api = vi.hoisted(() => ({
  getJournalDetailApi: vi.fn(),
  listJournalApi: vi.fn(),
  quickRecordApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, slotLabel, subtitle, onClick }: { label: string; slotLabel: string; subtitle?: string; onClick?: () => void }) => (
    <button type="button" data-testid="journal-entry" onClick={onClick}>{label} · {slotLabel} · {subtitle}</button>
  ),
}));

const roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present", status: "ACTIVE", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", version: 0 },
];
const mixedPage = journalMock.page({ page: 0, size: 20 });
const quickResult: QuickRecordResult = {
  sourceType: "COLLECTION",
  sourceId: 999,
  recordedAt: "2026-08-14T00:00:00Z",
  replay: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("LifeLog Journal surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listJournalApi.mockResolvedValue(mixedPage);
    api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => journalMock.detail(lifeLogId));
    api.quickRecordApi.mockResolvedValue(quickResult);
  });

  describe("Quick Record form을 제출하면", () => {
    it("Collection payload 하나와 optional top-level metadata만 전송한다", async () => {
      render(<JournalShell roles={roles} />);
      fireEvent.click(screen.getByText("Quick Record"));

      const type = screen.getByLabelText("Quick Record type") as HTMLSelectElement;
      expect(Array.from(type.options, ({ value }) => value)).toEqual(["COLLECTION", "EXERCISE", "MEDIA"]);
      expect(screen.queryByLabelText(/event/i)).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Quick Record subtype"), { target: { value: "PROJECT" } });
      fireEvent.change(screen.getByLabelText("Quick Record role"), { target: { value: "2" } });
      fireEvent.change(screen.getByLabelText("Collection category"), { target: { value: "BOOK" } });
      fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "The Pragmatic Programmer" } });
      fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

      await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
      expect(api.quickRecordApi).toHaveBeenCalledWith({
        type: "COLLECTION",
        lifeLogSubtype: "PROJECT",
        primaryRoleId: 2,
        collection: { category: "BOOK", title: "The Pragmatic Programmer", quantity: 1 },
      }, expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
      expect(screen.queryByLabelText(/rating|player|user/i)).not.toBeInTheDocument();
    });

    it("Exercise optional zero를 보존하고 비어 있는 optional field는 생략한다", async () => {
      render(<JournalShell roles={roles} />);
      fireEvent.click(screen.getByText("Quick Record"));
      fireEvent.change(screen.getByLabelText("Quick Record type"), { target: { value: "EXERCISE" } });
      fireEvent.change(screen.getByLabelText("Exercise category"), { target: { value: "RUNNING" } });
      fireEvent.change(screen.getByLabelText("Duration minutes"), { target: { value: "30" } });
      fireEvent.change(screen.getByLabelText("Exercised on"), { target: { value: "2026-08-14" } });
      fireEvent.change(screen.getByLabelText("Distance km"), { target: { value: "0" } });
      fireEvent.change(screen.getByLabelText("Calories"), { target: { value: "0" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

      await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
      expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
        type: "EXERCISE",
        exercise: {
          category: "RUNNING",
          durationMinutes: 30,
          exercisedOn: "2026-08-14",
          distanceKm: 0,
          calories: 0,
        },
      });
    });

    it("Media currentEpisode zero를 보존하고 partial episode payload를 허용한다", async () => {
      render(<JournalShell roles={roles} />);
      fireEvent.click(screen.getByText("Quick Record"));
      fireEvent.change(screen.getByLabelText("Quick Record type"), { target: { value: "MEDIA" } });
      fireEvent.change(screen.getByLabelText("Media category"), { target: { value: "ANIME" } });
      fireEvent.change(screen.getByLabelText("Media title"), { target: { value: "Frieren" } });
      fireEvent.change(screen.getByLabelText("Media status"), { target: { value: "WATCHING" } });
      fireEvent.change(screen.getByLabelText("Current episode"), { target: { value: "0" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

      await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
      expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
        type: "MEDIA",
        media: { category: "ANIME", title: "Frieren", status: "WATCHING", currentEpisode: 0 },
      });
    });

    it("Media episode input을 비워 두면 request에서도 둘 다 생략한다", async () => {
      render(<JournalShell roles={roles} />);
      fireEvent.click(screen.getByText("Quick Record"));
      fireEvent.change(screen.getByLabelText("Quick Record type"), { target: { value: "MEDIA" } });
      fireEvent.change(screen.getByLabelText("Media category"), { target: { value: "ANIME" } });
      fireEvent.change(screen.getByLabelText("Media title"), { target: { value: "Frieren" } });
      fireEvent.change(screen.getByLabelText("Media status"), { target: { value: "WATCHING" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

      await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
      expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
        type: "MEDIA",
        media: { category: "ANIME", title: "Frieren", status: "WATCHING" },
      });
    });

    it("ambiguous failure 뒤 edit 전에는 Retry만 노출하고 edit 후 새 logical Submit을 만든다", async () => {
      api.quickRecordApi.mockRejectedValueOnce(new Error("Outcome unknown")).mockResolvedValueOnce(quickResult);
      render(<JournalShell roles={roles} />);
      fireEvent.click(screen.getByText("Quick Record"));
      fireEvent.change(screen.getByLabelText("Collection category"), { target: { value: "BOOK" } });
      fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "Retry me" } });
      fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

      await screen.findByRole("button", { name: "Retry same record" });
      expect(screen.queryByRole("button", { name: "Save Quick Record" })).not.toBeInTheDocument();
      const firstCall = api.quickRecordApi.mock.calls[0];
      fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "Edited retry" } });

      expect(screen.queryByRole("button", { name: "Retry same record" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));
      await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledTimes(2));
      expect(api.quickRecordApi.mock.calls[1][0]).toEqual({
        type: "COLLECTION",
        collection: { category: "BOOK", title: "Edited retry", quantity: 1 },
      });
      expect(api.quickRecordApi.mock.calls[1][1]).not.toBe(firstCall[1]);
    });
  });

  describe("mixed physical source 목록을 읽으면", () => {
    it("server order와 source/QUICK/Role/Event context를 그대로 표시한다", async () => {
      render(<JournalShell roles={roles} />);

      const entries = await screen.findAllByTestId("journal-entry");
      expect(entries.map((entry) => entry.textContent?.split(" · ")[0])).toEqual([
        "Architecture Notes",
        "RUNNING",
        "Designing Data-Intensive Applications",
        "Legacy Collection",
      ]);
      expect(entries[0]).toHaveTextContent("COLLECTION");
      expect(entries[0]).toHaveTextContent("Role context: Backend Engineer");
      expect(entries[0]).toHaveTextContent("Event context #11");
      expect(entries[1]).toHaveTextContent("EXERCISE");
      expect(entries[1]).toHaveTextContent("QUICK");
      expect(entries[2]).toHaveTextContent("MEDIA");
    });

    it("nullable Exercise metric은 생략하고 실제 zero/non-null 값은 보존한다", async () => {
      api.listJournalApi.mockResolvedValue({
        content: [{
          ...MOCK_JOURNAL_ENTRIES[1],
          preview: {
            ...MOCK_JOURNAL_ENTRIES[1].preview,
            durationMinutes: 0,
            distanceKm: null,
            calories: 240,
          },
        }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      } satisfies JournalPage);
      render(<JournalShell roles={roles} />);

      const entry = await screen.findByTestId("journal-entry");
      expect(entry).toHaveTextContent("EXERCISE · RUNNING · 0 min · 240 kcal · ACTIVITY · QUICK");
      expect(entry).not.toHaveTextContent("— min");
      expect(entry).not.toHaveTextContent("— km");
      expect(entry).not.toHaveTextContent("— kcal");
    });
  });

  describe("Role/subtype filter와 server page를 변경하면", () => {
    it("filter를 보존하고 filter 변경마다 page를 0으로 reset하며 pagination bounds를 적용한다", async () => {
      api.listJournalApi.mockImplementation(async (params: { primaryRoleId?: number; subtype?: string; page: number; size: number }): Promise<JournalPage> => ({
        content: MOCK_JOURNAL_ENTRIES.filter((entry) =>
          (params.primaryRoleId === undefined || entry.primaryRoleId === params.primaryRoleId)
          && (params.subtype === undefined || entry.subtype === params.subtype)
        ),
        page: params.page,
        size: params.size,
        totalElements: 40,
        totalPages: 2,
      }));
      render(<JournalShell roles={roles} />);

      expect(await screen.findByText("Page 1 / 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Role filter"), { target: { value: "2" } });
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 0, size: 20 }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 1, size: 20 }));
      expect(await screen.findByText("Page 2 / 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

      fireEvent.change(screen.getByLabelText("Subtype filter"), { target: { value: "REFLECTION" } });
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, subtype: "REFLECTION", page: 0, size: 20 }));
    });
  });

  describe("목록 request가 실패하거나 비어 있으면", () => {
    it("loading과 error/retry를 거쳐 authoritative empty state를 표시한다", async () => {
      const first = deferred<JournalPage>();
      api.listJournalApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ ...mixedPage, content: [], totalElements: 0, totalPages: 0 });
      render(<JournalShell roles={roles} />);

      expect(screen.getByText("Loading Journal...")).toBeInTheDocument();
      await act(async () => {
        first.reject(new Error("Journal unavailable"));
        await first.promise.catch(() => undefined);
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Journal unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("No Journal entries.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    });
  });

  describe("lifeLogId로 Journal detail을 선택하면", () => {
    it("Collection/Exercise/Media source를 명시적으로 렌더하고 mutation action을 노출하지 않는다", async () => {
      render(<JournalShell roles={roles} />);
      const entries = await screen.findAllByTestId("journal-entry");

      fireEvent.click(entries[0]);
      expect(await screen.findByText("Condition: Annotated")).toBeInTheDocument();
      expect(api.getJournalDetailApi).toHaveBeenLastCalledWith(104);

      fireEvent.click(entries[1]);
      expect(await screen.findByText("Memo: Morning run")).toBeInTheDocument();
      expect(screen.getByText("Entry mode: QUICK")).toBeInTheDocument();

      fireEvent.click(entries[2]);
      expect(await screen.findByText("Rewatch count: 0")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /edit|delete|complete event/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Created by this RoleEvent|Completed event record/)).not.toBeInTheDocument();
    });

    it("legacy Collection nullable detail을 Not recorded로 표시한다", async () => {
      render(<JournalShell roles={roles} />);
      fireEvent.click((await screen.findAllByTestId("journal-entry"))[3]);

      expect(await screen.findByText("Original title: Not recorded")).toBeInTheDocument();
      expect(screen.getByText("Quantity: Not recorded")).toBeInTheDocument();
      expect(screen.getByText("Condition: Not recorded")).toBeInTheDocument();
      expect(screen.getByText("Acquired from: Not recorded")).toBeInTheDocument();
      expect(screen.getByText("Tags: Not recorded")).toBeInTheDocument();
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });

    it("detail loading/error를 표시하고 같은 lifeLogId로 retry한다", async () => {
      const first = deferred<ReturnType<typeof journalMock.detail>>();
      api.getJournalDetailApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce(journalMock.detail(104));
      render(<JournalShell roles={roles} />);
      fireEvent.click((await screen.findAllByTestId("journal-entry"))[0]);
      expect(screen.getByText("Loading Journal detail...")).toBeInTheDocument();

      await act(async () => {
        first.reject(new Error("Detail unavailable"));
        await first.promise.catch(() => undefined);
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Detail unavailable");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("Condition: Annotated")).toBeInTheDocument();
      expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(1, 104);
      expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(2, 104);
    });
  });
});
