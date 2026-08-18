import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSettingsApi, updateSettingsApi } from "./settings.api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPatch: vi.fn(), apiPost: vi.fn() }));

vi.mock("../client", () => ({ USE_MOCK: false, ...client }));

describe("Current User Settings API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({});
    client.apiPatch.mockResolvedValue({});
  });

  it("uses canonical GET and PATCH with the supplied transport body", async () => {
    const request = { volume: 64, flagsJson: JSON.stringify({ graphicsQuality: "LOW" }) };
    await getSettingsApi();
    await updateSettingsApi(request);

    expect(client.apiGet).toHaveBeenCalledWith("/api/v1/users/me/settings");
    expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/users/me/settings", request);
    expect(client.apiPost).not.toHaveBeenCalled();
  });
});
