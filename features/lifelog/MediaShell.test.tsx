import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaInfo } from "@/shared/api/types";
import MediaShell from "./MediaShell";

const api = vi.hoisted(() => ({ advanceMediaApi: vi.fn(), createMediaApi: vi.fn(), deleteMediaApi: vi.fn(), markMediaStatusApi: vi.fn(), rateMediaApi: vi.fn(), rewatchMediaApi: vi.fn(), searchMediaApi: vi.fn(), updateMediaApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" data-testid="media-entry" onClick={onClick}>{label}</button> }));

const item: MediaInfo = { id: 51, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 10, totalEpisode: 28, status: "WATCHING", rating: 4.5, tags: ["fantasy"], rewatchCount: 1, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" };
const completed: MediaInfo = { ...item, id: 52, title: "Complete", currentEpisode: 28, status: "COMPLETED" };

describe("Media source surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchMediaApi.mockResolvedValue([item, completed]);
    api.updateMediaApi.mockImplementation(async (_id: number, body: object) => ({ ...item, ...body }));
    api.rateMediaApi.mockResolvedValue({ ...item, rating: 5 });
    api.advanceMediaApi.mockResolvedValue({ ...item, currentEpisode: 11 });
    api.markMediaStatusApi.mockResolvedValue({ ...item, status: "ON_HOLD" });
    api.rewatchMediaApi.mockResolvedValue({ ...item, rewatchCount: 2 });
  });

  it("exact selected commands와 CRUD controls를 노출하고 completed advance를 막는다", async () => {
    render(<MediaShell />);
    const [entry, completeEntry] = await screen.findAllByTestId("media-entry");
    expect(Array.from((screen.getByLabelText("Category filter") as HTMLSelectElement).options, ({ value }) => value).slice(1)).toEqual([...MEDIA_CATEGORIES]);
    expect(Array.from((screen.getByLabelText("Status filter") as HTMLSelectElement).options, ({ value }) => value).slice(1)).toEqual([...MEDIA_STATUSES]);
    expect(screen.queryByText(/PLANNING|READING|PLAN_TO_WATCH/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Add Media"));
    expect(screen.getByLabelText("Create category")).toBeRequired();
    expect(screen.getByLabelText("Create status")).toBeRequired();
    expect(screen.queryByLabelText(/rating|lifeLogSubtype|reflectionScope|primaryRoleId|roleEventId/i)).not.toBeInTheDocument();

    fireEvent.click(entry);
    expect(screen.getByText("Media source #51")).toBeInTheDocument();
    expect(screen.getByText("Rating: 4.5")).toBeInTheDocument();
    expect(screen.getByText("Rewatch count: 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rating score"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Rate" }));
    await waitFor(() => expect(api.rateMediaApi).toHaveBeenCalledWith(51, { score: 5 }));
    fireEvent.click(screen.getByRole("button", { name: "Advance +1" }));
    await waitFor(() => expect(api.advanceMediaApi).toHaveBeenCalledWith(51, { step: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Mark Status" }));
    expect(api.markMediaStatusApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Command status"), { target: { value: "ON_HOLD" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark Status" }));
    await waitFor(() => expect(api.markMediaStatusApi).toHaveBeenCalledWith(51, { status: "ON_HOLD" }));
    fireEvent.click(screen.getByRole("button", { name: "Rewatch" }));
    await waitFor(() => expect(api.rewatchMediaApi).toHaveBeenCalledWith(51));

    fireEvent.click(screen.getByRole("button", { name: "Clear Original Title" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenCalledWith(51, { originalTitle: "" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Tags" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenLastCalledWith(51, { tags: [] }));
    fireEvent.click(completeEntry);
    expect(screen.getByRole("button", { name: "Advance +1" })).toBeDisabled();
  });
});
