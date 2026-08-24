import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPage from "./page";

const auth = vi.hoisted(() => ({ currentUser: { email: "operator@lag" }, isAuthenticated: true, isLoading: false }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const api = vi.hoisted(() => ({ getAdminAuditEvents: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/features/admin/api/audit", () => api);

describe("/admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAdminAuditEvents.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("composes the canonical shell and Audit screen without legacy Admin authority", async () => {
    render(<AdminPage />);

    expect(screen.getByText("operator@lag")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin Audit Explorer" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No audit events" })).toBeInTheDocument();

    const source = readFileSync("app/admin/page.tsx", "utf8");
    expect(source).not.toMatch(/admin\.api|OrbNav|adjustWallet|grant|revoke|deleteUser/i);
    expect(source.split("\n").length).toBeLessThan(40);
  });
});
