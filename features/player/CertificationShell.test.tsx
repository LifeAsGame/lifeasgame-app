import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CertificationCatalogInfo, PlayerCertificationInfo } from "@/shared/api/types";
import CertificationShell from "./CertificationShell";

const api = vi.hoisted(() => ({
  deletePlayerCertificationApi: vi.fn(),
  getCertificationCatalogApi: vi.fn(),
  getPlayerCertificationsApi: vi.fn(),
  registerPlayerCertificationApi: vi.fn(),
  updatePlayerCertificationApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) => <button type="button" data-testid="certification-entry" onClick={onClick}>{label} · {subtitle}</button>,
}));

const catalog: CertificationCatalogInfo[] = [
  { certificationId: 1, name: "AWS", issuer: "Amazon", category: "Cloud" },
  { certificationId: 3, name: "Kubernetes", issuer: "CNCF", category: "DevOps" },
];
const owned: PlayerCertificationInfo = { ...catalog[0], acquiredDate: null, expiresDate: null, grantedAt: "2026-08-01T00:00:00Z" };
const reloaded = { ...owned, expiresDate: "2027-08-01" };

describe("Certification management surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCertificationCatalogApi.mockResolvedValue(catalog);
    api.getPlayerCertificationsApi.mockResolvedValueOnce([owned]).mockResolvedValue([reloaded]);
    api.registerPlayerCertificationApi.mockResolvedValue({ certificationId: 3, acquiredDate: null, expiresDate: null });
    api.updatePlayerCertificationApi.mockResolvedValue({ certificationId: 1, acquiredDate: null, expiresDate: "2027-08-01" });
    api.deletePlayerCertificationApi.mockResolvedValue(1);
  });

  it("nullable owned dates, catalog-only selector와 blank-preserving edit controls만 렌더한다", async () => {
    render(<CertificationShell />);
    const entry = await screen.findByTestId("certification-entry");
    expect(entry).toHaveTextContent("Acquired: Not recorded");
    const selector = screen.getByLabelText("Certification") as HTMLSelectElement;
    expect(Array.from(selector.options, ({ text }) => text)).toEqual(["Select...", "Kubernetes · CNCF"]);
    expect(screen.queryByText("React Developer Certification")).not.toBeInTheDocument();

    fireEvent.click(entry);
    expect(screen.getByText("Acquired: Not recorded", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Expires: Not recorded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Update Dates" }));
    expect(api.updatePlayerCertificationApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("New expires date"), { target: { value: "2027-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Dates" }));

    await waitFor(() => expect(api.updatePlayerCertificationApi).toHaveBeenCalledWith(1, { expiresDate: "2027-08-01" }));
    expect(api.updatePlayerCertificationApi.mock.calls[0][1]).not.toHaveProperty("acquiredDate");
    expect(api.updatePlayerCertificationApi.mock.calls[0][1]).not.toEqual(expect.objectContaining({ expiresDate: "" }));
    expect(screen.getByText("Blank dates preserve current values; dates cannot be cleared.")).toBeInTheDocument();
  });

  it("uses v7 semantic control tokens instead of the legacy input palette", () => {
    const source = readFileSync("features/player/CertificationShell.tsx", "utf8");
    expect(source).toContain("SEMANTIC_CONTROL_STYLE");
    expect(source).toContain("var(--lag-control-bg)");
    expect(source).not.toContain("INPUT_STYLE");
  });
});
