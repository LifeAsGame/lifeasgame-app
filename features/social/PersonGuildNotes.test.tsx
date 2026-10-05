import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PersonGuildNotes from "./PersonGuildNotes";
const api = vi.hoisted(() => ({ personGuildNotes: vi.fn(), deleteGuildNote: vi.fn() }));
vi.mock("./memberPersonApi", () => api);
const row = { id: 1, personId: 7, guildId: 10, targetMemberPlayerId: 50, text: "A만의 메모", version: 1, availability: "CURRENT", guildName: "비공개 길드 A" };
const page = (contents = [row]) => ({ contents, page: 0, size: 20, totalElements: contents.length, totalPages: 1 });
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); api.personGuildNotes.mockResolvedValue(page()); });
it("shows historical notes with only a minimal Guild label and no live detail lookup", async () => {
  api.personGuildNotes.mockResolvedValue(page([{ ...row, availability: "HISTORY", guildName: "stale private title" }]));
  render(<PersonGuildNotes personId={7} onBack={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: /이전 길드 #10/ }));
  expect(await screen.findByText("A만의 메모")).toBeInTheDocument(); expect(screen.queryByText("stale private title")).not.toBeInTheDocument();
});
it("evicts selected names before revalidating when window focus returns", async () => {
  render(<PersonGuildNotes personId={7} onBack={vi.fn()} />); fireEvent.click(await screen.findByRole("button", { name: /비공개 길드 A/ }));
  let resolve!: (value: ReturnType<typeof page>) => void; api.personGuildNotes.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  fireEvent(window, new Event("focus")); expect(screen.queryByText("A만의 메모")).not.toBeInTheDocument(); expect(screen.queryByText("비공개 길드 A")).not.toBeInTheDocument();
  await act(async () => resolve(page([{ ...row, availability: "HISTORY", guildName: "" }]))); expect(await screen.findByRole("button", { name: /이전 길드 #10/ })).toBeInTheDocument();
});
