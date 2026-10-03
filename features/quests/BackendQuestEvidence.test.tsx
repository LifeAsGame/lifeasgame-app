import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalEntry, QuestAcceptance } from "@/shared/api/types";
import BackendQuestEvidence, { safeEvidenceUrl } from "./BackendQuestEvidence";
import { journeyMock } from "./mock";

const api = vi.hoisted(() => ({
  completeQuestApi: vi.fn(), getQuestEvidenceApi: vi.fn(), linkQuestEvidenceApi: vi.fn(), unlinkQuestEvidenceApi: vi.fn(),
}));
const journal = vi.hoisted(() => ({ listJournalApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/features/lifelog/api", () => journal);
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false }));

const base = journeyMock.acceptances()[0];
const quest = (code: string, status: QuestAcceptance["status"] = "IN_PROGRESS"): QuestAcceptance => ({ ...base, id: 500, code, status });
const entry = (id: number, category: "PROJECT" | "BOOK", primaryRoleId: number | null): JournalEntry => ({
  lifeLogId: id, sourceId: id, sourceType: "COLLECTION", subtype: "PROJECT", entryMode: "FULL",
  reflectionScope: null, periodKey: null, primaryRoleId, roleEventId: null, recordedAt: "2026-10-01T00:00:00Z",
  preview: { category, title: `Record ${id}`, quantity: 1 },
});

describe("backend journey evidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getQuestEvidenceApi.mockResolvedValue(null);
    api.linkQuestEvidenceApi.mockResolvedValue({});
    api.unlinkQuestEvidenceApi.mockResolvedValue({});
    api.completeQuestApi.mockResolvedValue({});
    journal.listJournalApi.mockResolvedValue({ content: [], page: 0, size: 25, totalElements: 0, totalPages: 0 });
  });

  it("목표 근거 연결 후 자동 완료하지 않고 사용자 완료 명령을 기다린다", async () => {
    api.getQuestEvidenceApi.mockResolvedValueOnce(null).mockResolvedValue({ memo: "Small service" });
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const view = render(<BackendQuestEvidence quest={quest("Q_DEV_DEFINE_BACKEND_GOAL")} roleId={12} onChanged={onChanged} />);
    fireEvent.change(await screen.findByRole("textbox", { name: "목표 메모" }), { target: { value: "  Small service  " } });
    fireEvent.click(screen.getByRole("button", { name: "근거 연결" }));
    await waitFor(() => expect(api.linkQuestEvidenceApi).toHaveBeenCalledWith("Q_DEV_DEFINE_BACKEND_GOAL", { memo: "Small service" }));
    expect(api.completeQuestApi).not.toHaveBeenCalled();
    view.rerender(<BackendQuestEvidence quest={quest("Q_DEV_DEFINE_BACKEND_GOAL", "GOAL_REACHED")} roleId={12} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("button", { name: "퀘스트 완료" }));
    await waitFor(() => expect(api.completeQuestApi).toHaveBeenCalledTimes(1));
  });

  it("PROJECT 기록과 선택 Role의 소유 기록만 제안하고 예전 기록도 명시적으로 연결한다", async () => {
    journal.listJournalApi.mockResolvedValue({ content: [entry(11, "PROJECT", null), entry(12, "PROJECT", 99), entry(13, "BOOK", 12)], page: 0, size: 25, totalElements: 3, totalPages: 1 });
    render(<BackendQuestEvidence quest={quest("Q_DEV_BUILD_SPRING_CRUD")} roleId={12} onChanged={vi.fn().mockResolvedValue(undefined)} />);
    const select = await screen.findByRole("combobox", { name: "내 기록" });
    await waitFor(() => expect(select).toHaveTextContent("Record 11"));
    expect(select).not.toHaveTextContent("Record 12");
    expect(select).not.toHaveTextContent("Record 13");
    fireEvent.change(select, { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "근거 연결" }));
    await waitFor(() => expect(api.linkQuestEvidenceApi).toHaveBeenCalledWith("Q_DEV_BUILD_SPRING_CRUD", { lifeLogId: 11 }));
  });

  it("배포 URL은 안전한 http/https만 열고 실패 시 입력을 유지한다", async () => {
    expect(safeEvidenceUrl("javascript:alert(1)")).toBeNull();
    expect(safeEvidenceUrl("https://user:pass@example.org/path")).toBeNull();
    api.linkQuestEvidenceApi.mockRejectedValue(new Error("Conflict"));
    render(<BackendQuestEvidence quest={quest("Q_DEV_DEPLOY_SERVICE")} roleId={12} onChanged={vi.fn().mockResolvedValue(undefined)} />);
    const url = await screen.findByRole("textbox", { name: "배포 URL" });
    fireEvent.change(url, { target: { value: "javascript:alert(1)" } });
    fireEvent.change(screen.getByRole("textbox", { name: "설명" }), { target: { value: "Demo" } });
    fireEvent.click(screen.getByRole("button", { name: "근거 연결" }));
    expect(api.linkQuestEvidenceApi).not.toHaveBeenCalled();
    fireEvent.change(url, { target: { value: "https://example.org/demo" } });
    fireEvent.click(screen.getByRole("button", { name: "근거 연결" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Conflict");
    expect(url).toHaveValue("https://example.org/demo");
  });
});
