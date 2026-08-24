import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EquipmentSlotInfo, PlayerInfo } from "@/shared/api/types";
import { usePlayerContext } from "./usePlayerContext";

const api = vi.hoisted(() => ({ getCurrentPlayerApi: vi.fn(), getEquippedGearApi: vi.fn() }));
vi.mock("./api", () => ({ getCurrentPlayerApi: api.getCurrentPlayerApi }));
vi.mock("@/lib/api/endpoints/equipment.api", () => ({ getEquippedGearApi: api.getEquippedGearApi }));

const player = { playerId: 7, name: "Player", level: 8 } as PlayerInfo;
const equipments: EquipmentSlotInfo[] = [
  { slotId: 1, slotCode: "MAIN", slotName: "Main Hand", slotCategory: "WEAPON", slotRole: "PRIMARY", itemInstanceId: 99 },
];

describe("proven Player context query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentPlayerApi.mockResolvedValue(player);
    api.getEquippedGearApi.mockResolvedValue(equipments);
  });

  it("loads Current Player and Equipment only when enabled and exposes retry", async () => {
    api.getCurrentPlayerApi.mockRejectedValueOnce(new Error("Player unavailable"));
    const view = renderHook(({ enabled }) => usePlayerContext(enabled), { initialProps: { enabled: false } });
    expect(api.getCurrentPlayerApi).not.toHaveBeenCalled();
    expect(api.getEquippedGearApi).not.toHaveBeenCalled();

    view.rerender({ enabled: true });
    await waitFor(() => expect(view.result.current.error).toBe("Player unavailable"));
    await act(async () => { await view.result.current.reload(); });

    expect(view.result.current.data).toEqual({ player, equipments });
    expect(api.getCurrentPlayerApi).toHaveBeenCalledTimes(2);
    expect(api.getEquippedGearApi).toHaveBeenCalledTimes(2);
  });

  it("keeps canonical Player identity when secondary Equipment fails", async () => {
    api.getEquippedGearApi.mockRejectedValue(new Error("Equipment unavailable"));
    const view = renderHook(() => usePlayerContext(true));

    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.data).toEqual({ player, equipments: [] });
    expect(view.result.current.error).toBe("Equipment unavailable");
  });

  it("does not publish late data after the Player context closes", async () => {
    let resolvePlayer!: (value: PlayerInfo) => void;
    api.getCurrentPlayerApi.mockReturnValue(new Promise((resolve) => { resolvePlayer = resolve; }));
    const view = renderHook(({ enabled }) => usePlayerContext(enabled), { initialProps: { enabled: true } });

    view.rerender({ enabled: false });
    await act(async () => resolvePlayer(player));

    expect(view.result.current.data).toBeNull();
    expect(view.result.current.loading).toBe(false);
  });
});
