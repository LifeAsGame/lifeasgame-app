import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import EquipmentArtwork from "./EquipmentArtwork";

const items = vi.hoisted(() => ({ getItemApi: vi.fn() }));
vi.mock("@/shared/api/items", () => items);
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false }));

it("maps the server item code to the approved preview path and keeps a missing-image fallback", async () => {
  items.getItemApi.mockResolvedValue({ id: 42, code: "IT_RECORD_KEEPER_HAT" });
  const { container } = render(<EquipmentArtwork itemId={42} kind="preview" name="기록자의 모자" />);
  await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toMatch(/\/content\/equipment\/IT_RECORD_KEEPER_HAT\/preview\.webp$/));
  fireEvent.error(container.querySelector("img") as HTMLImageElement);
  expect(screen.getByText("이미지 준비 중")).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});
