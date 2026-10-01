import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import GroupDrawer from "./GroupDrawer";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/api/client")>(),
  USE_MOCK: false,
  apiGet: api.get,
  apiPost: api.post,
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((path: string) => path.includes("/search")
    ? Promise.resolve({ contents: [{ id: 12, name: "산책 모임", code: "WALK", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 20 }], page: 0, totalPages: 1, totalElements: 1 })
    : Promise.resolve({ id: 12, name: "산책 모임", code: "WALK", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 20, descriptionMd: "함께 걷습니다.", tags: [] }));
});

it("opens the real Party list and detail, then returns to the list", async () => {
  render(<GroupDrawer kind="parties" />);
  fireEvent.click(screen.getByRole("button", { name: "파티" }));
  const row = await screen.findByRole("button", { name: /산책 모임/ });
  fireEvent.click(row);
  expect(await screen.findByText("함께 걷습니다.")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/api/v1/parties/12");
  fireEvent.click(screen.getByRole("button", { name: /목록으로/ }));
  expect(screen.queryByText("함께 걷습니다.")).not.toBeInTheDocument();
});

it("sends only the supported Guild create fields and selects the returned record", async () => {
  api.post.mockResolvedValue({ id: 12 });
  render(<GroupDrawer kind="guilds" />);
  fireEvent.click(screen.getByRole("button", { name: "길드" }));
  fireEvent.click(screen.getByRole("button", { name: "새 길드" }));
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "산책 길드" } });
  fireEvent.change(screen.getByRole("textbox", { name: "코드" }), { target: { value: "WALK" } });
  fireEvent.click(screen.getByRole("button", { name: "생성" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/guilds", expect.objectContaining({ name: "산책 길드", code: "WALK", visibility: "PUBLIC", joinPolicy: "OPEN", maxMembers: 20 })));
  expect(await screen.findByText("함께 걷습니다.")).toBeInTheDocument();
});
