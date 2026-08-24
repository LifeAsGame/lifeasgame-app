import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminShell } from "./AdminShell";

const apiSource = { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" } as const;
const mockSource = { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", eventLabel: "Local Admin Mock" } as const;

describe("Admin Phase A1 shell", () => {
  it("keeps the locked navigation visible with only Admin Audit supported", () => {
    render(<AdminShell operator="operator@lag" audit={<div>Canonical Audit Screen</div>} source={apiSource} />);

    expect(screen.getByRole("navigation", { name: "Admin operations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System, SUPPORTED" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Admin Audit")).toBeInTheDocument();
    expect(screen.getByText("Canonical Audit Screen")).toBeInTheDocument();
    expect(screen.queryByText("OrbNav")).not.toBeInTheDocument();
  });

  it("shows explicit non-A1 capability boundaries without unsupported commands", () => {
    render(<AdminShell operator="operator@lag" audit={<div>Canonical Audit Screen</div>} source={apiSource} />);

    fireEvent.click(screen.getByRole("button", { name: "Dashboard, DEFERRED" }));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("BACKEND_READ_MODEL_REQUIRED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Players, GATED" }));
    expect(screen.getByText("Player administration is not enabled in Phase A1.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grant|revoke|adjust|delete|override|deliver/i })).not.toBeInTheDocument();
  });

  it.each([
    [apiSource, "API", "/admin/v1", "Session", "Authority enforced by server"],
    [mockSource, "MOCK DATA", "Local Admin Mock", "Mock session", "Server Admin authority not evaluated"],
  ] as const)("shows the %s source without changing A1 shell anatomy", (source, badge, label, session, authority) => {
    render(<AdminShell operator="operator@lag" audit={<div>Audit Screen</div>} source={source} />);

    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(session)).toBeInTheDocument();
    expect(screen.getByText(authority)).toBeInTheDocument();
    if (source.mode === "mock") expect(screen.queryByText("Authority enforced by server")).not.toBeInTheDocument();
    expect(screen.getByText("Audit Screen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grant|revoke|adjust|delete|override|deliver/i })).not.toBeInTheDocument();
  });
});
