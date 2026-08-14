import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaInfo } from "@/shared/api/types";
import MediaShell from "./MediaShell";

const api = vi.hoisted(() => ({ createMediaApi: vi.fn(), deleteMediaApi: vi.fn(), searchMediaApi: vi.fn(), updateMediaApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" data-testid="media-entry" onClick={onClick}>{label}</button> }));

const item: MediaInfo = { id: 51, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 10, totalEpisode: 28, status: "WATCHING", rating: 4.5, tags: ["fantasy"], rewatchCount: 1, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" };

describe("Media source surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchMediaApi.mockResolvedValue([item]);
    api.updateMediaApi.mockImplementation(async (_id: number, body: object) => ({ ...item, ...body }));
  });

  it("exact enums와 real detail/explicit clears만 노출하고 stale fields와 commands는 숨긴다", async () => {
    render(<MediaShell />);
    const entry = await screen.findByTestId("media-entry");
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
    fireEvent.click(screen.getByRole("button", { name: "Clear Original Title" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenCalledWith(51, { originalTitle: "" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Tags" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenLastCalledWith(51, { tags: [] }));
    expect(screen.queryByRole("button", { name: /rate|advance|rewatch|mark status/i })).not.toBeInTheDocument();
  });
});
