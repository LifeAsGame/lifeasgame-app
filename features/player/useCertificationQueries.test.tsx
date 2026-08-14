import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CertificationCatalogInfo, PlayerCertificationInfo } from "@/shared/api/types";
import { useCertificationQueries } from "./useCertificationQueries";

const api = vi.hoisted(() => ({
  deletePlayerCertificationApi: vi.fn(),
  getCertificationCatalogApi: vi.fn(),
  getPlayerCertificationsApi: vi.fn(),
  registerPlayerCertificationApi: vi.fn(),
  updatePlayerCertificationApi: vi.fn(),
}));

vi.mock("./api", () => api);

const catalog: CertificationCatalogInfo[] = [
  { certificationId: 1, name: "AWS", issuer: "Amazon", category: "Cloud" },
  { certificationId: 3, name: "Kubernetes", issuer: "CNCF", category: "DevOps" },
];
const first: PlayerCertificationInfo = { ...catalog[0], acquiredDate: null, expiresDate: null, grantedAt: "2026-08-01T00:00:00Z" };
const registered: PlayerCertificationInfo = { ...catalog[1], acquiredDate: null, expiresDate: null, grantedAt: "2026-08-14T00:00:00Z" };
const updated = { ...registered, acquiredDate: "2026-08-10" };

describe("Certification query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCertificationCatalogApi.mockResolvedValue(catalog);
    api.getPlayerCertificationsApi
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([first, registered])
      .mockResolvedValueOnce([first, updated])
      .mockResolvedValueOnce([first]);
    api.registerPlayerCertificationApi.mockResolvedValue({ certificationId: 3, acquiredDate: null, expiresDate: null });
    api.updatePlayerCertificationApi.mockResolvedValue({ certificationId: 3, acquiredDate: "2026-08-10", expiresDate: null });
    api.deletePlayerCertificationApi.mockResolvedValue(3);
  });

  it("initial load와 register/update/delete authoritative reload 및 blank no-op을 유지한다", async () => {
    const { result } = renderHook(() => useCertificationQueries());
    await waitFor(() => expect(result.current.catalog.items).toEqual(catalog));
    await waitFor(() => expect(result.current.owned.items).toEqual([first]));

    await act(async () => { await result.current.register(3, {}); });
    expect(result.current.selectedId).toBe(3);
    expect(result.current.selected).toEqual(registered);

    await act(async () => { await result.current.update(3, {}); });
    expect(api.updatePlayerCertificationApi).not.toHaveBeenCalled();
    await act(async () => { await result.current.update(3, { acquiredDate: "2026-08-10" }); });
    expect(api.updatePlayerCertificationApi).toHaveBeenCalledWith(3, { acquiredDate: "2026-08-10" });
    expect(result.current.selectedId).toBe(3);
    expect(result.current.selected).toEqual(updated);

    await act(async () => { await result.current.remove(3); });
    expect(result.current.selectedId).toBeNull();
    expect(result.current.selected).toBeNull();
    expect(api.getPlayerCertificationsApi).toHaveBeenCalledTimes(4);
  });
});
