import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminShell } from "./AdminShell";

const apiSource = { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" } as const;
const mockSource = { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", eventLabel: "Local Admin Mock" } as const;

describe("Admin Phase A3 shell", () => {
  it("exposes only Quest Runtime Status under Content while Player and Audit remain supported", () => {
    render(<AdminShell operator="operator@lag" quest={<div>Quest Screen</div>} player={<div>Player Screen</div>} audit={<div>Audit Screen</div>} source={apiSource} />);

    expect(screen.getByRole("navigation", { name: "Admin operations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Content, SUPPORTED" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Quest Runtime Status")).toBeInTheDocument();
    expect(screen.getByText("Quest Screen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Players, SUPPORTED" }));
    expect(screen.getByText("Player Lookup")).toBeInTheDocument();
    expect(screen.getByText("Player Screen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "System, SUPPORTED" }));
    expect(screen.getByText("Admin Audit")).toBeInTheDocument();
    expect(screen.getByText("Audit Screen")).toBeInTheDocument();
    expect(screen.queryByText("OrbNav")).not.toBeInTheDocument();
  });

  it("keeps unrelated capability boundaries without unsupported commands", () => {
    render(<AdminShell operator="operator@lag" quest={<div>Quest Screen</div>} player={<div>Player Screen</div>} audit={<div>Audit Screen</div>} source={apiSource} />);

    fireEvent.click(screen.getByRole("button", { name: "Dashboard, DEFERRED" }));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("BACKEND_READ_MODEL_REQUIRED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Economy, GATED" }));
    expect(screen.getByText("Economy commands are not enabled in the current Admin slice.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grant|revoke|adjust|delete|override|deliver/i })).not.toBeInTheDocument();
  });

  it("lets a completed Quest operation open the normal Audit Explorer area", () => {
    render(<AdminShell operator="operator@lag" quest={(openAudit) => <button type="button" onClick={openAudit}>Open Audit Explorer</button>} player={<div>Player Screen</div>} audit={<div>Audit Screen</div>} source={apiSource} />);

    fireEvent.click(screen.getByRole("button", { name: "Open Audit Explorer" }));
    expect(screen.getByText("Audit Screen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System, SUPPORTED" })).toHaveAttribute("aria-current", "page");
  });

  it("lets a Player entitlement receipt open the normal Audit Explorer area", () => {
    render(<AdminShell operator="operator@lag" quest={<div>Quest Screen</div>} player={(openAudit) => <button type="button" onClick={openAudit}>Open Player Audit</button>} audit={<div>Audit Screen</div>} source={apiSource} />);

    fireEvent.click(screen.getByRole("button", { name: "Players, SUPPORTED" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Player Audit" }));
    expect(screen.getByText("Audit Screen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System, SUPPORTED" })).toHaveAttribute("aria-current", "page");
  });

  it.each([
    [apiSource, "API", "/admin/v1", "Session", "Authority enforced by server"],
    [mockSource, "MOCK DATA", "Local Admin Mock", "Mock session", "Server Admin authority not evaluated"],
  ] as const)("shows the %s source without changing the Admin shell anatomy", (source, badge, label, session, authority) => {
    render(<AdminShell operator="operator@lag" quest={<div>Quest Screen</div>} player={<div>Player Screen</div>} audit={<div>Audit Screen</div>} source={source} />);

    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(session)).toBeInTheDocument();
    expect(screen.getByText(authority)).toBeInTheDocument();
    if (source.mode === "mock") expect(screen.queryByText("Authority enforced by server")).not.toBeInTheDocument();
    expect(screen.getByText("Quest Screen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grant|revoke|adjust|delete|override|deliver/i })).not.toBeInTheDocument();
  });
});
