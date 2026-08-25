import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPage from "./page";

const auth = vi.hoisted(() => ({ currentUser: { email: "operator@lag" }, isAuthenticated: true, isLoading: false }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const source = vi.hoisted(() => ({
  descriptor: { mode: "api" as const, badge: "API" as const, label: "/admin/v1", eventLabel: "/admin/v1/audit-events" },
  getEvents: vi.fn(),
}));
const playerSource = vi.hoisted(() => ({
  descriptor: { mode: "api" as const, badge: "API" as const, label: "/admin/v1", playerLabel: "/admin/v1/players" },
  lookupByUserId: vi.fn(),
  getByPlayerId: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/features/admin/api/audit.source", () => ({ adminAuditDataSource: source }));
vi.mock("@/features/admin/api/player.source", () => ({ adminPlayerDataSource: playerSource }));

describe("/admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    source.getEvents.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("composes Player Lookup and preserves the supported Audit route", async () => {
    render(<AdminPage />);

    expect(screen.getByText("operator@lag")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("/admin/v1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Player Lookup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready for exact lookup" })).toBeInTheDocument();
    expect(playerSource.lookupByUserId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "System, SUPPORTED" }));
    expect(screen.getByRole("heading", { name: "Admin Audit Explorer" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No audit events" })).toBeInTheDocument();
    expect(source.getEvents).toHaveBeenCalledWith({ size: 50 });

    const pageSource = readFileSync("app/admin/page.tsx", "utf8");
    expect(pageSource).not.toMatch(/admin\.api|OrbNav|adjustWallet|grant|revoke|deleteUser/i);
    expect(pageSource.split("\n").length).toBeLessThan(50);

    const css = readFileSync("features/admin/admin.module.css", "utf8");
    expect(css).toMatch(/\.auditLayout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(320px, 390px\)/);
    expect(css).toMatch(/\.playerLayout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(320px, 390px\)/);
    expect(css).toMatch(/\.tableWrap\s*\{[^}]*overflow:\s*auto/);
  });
});
