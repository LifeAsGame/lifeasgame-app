import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalPage, RoleDetail } from "@/shared/api/types";
import JournalShell from "./JournalShell";
import { journalMock, MOCK_JOURNAL_ENTRIES } from "./mock";

const api = vi.hoisted(() => ({
  getJournalDetailApi: vi.fn(),
  listJournalApi: vi.fn(),
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
