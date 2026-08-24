import { describe, expect, it } from "vitest";

import { getAdminAuditDataSource, resolveAdminDataSourceMode } from "./audit.source";

describe("Admin Audit data-source selector", () => {
  it.each([
    [undefined, "api"],
    ["api", "api"],
    ["mock", "mock"],
    ["invalid", "api"],
  ] as const)("resolves %s to %s", (value, expected) => {
    expect(resolveAdminDataSourceMode(value)).toBe(expected);
    expect(getAdminAuditDataSource(value).descriptor.mode).toBe(expected);
  });

  it("exposes truthful source labels for both modes", () => {
    expect(getAdminAuditDataSource("api").descriptor).toEqual({ mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" });
    expect(getAdminAuditDataSource("mock").descriptor).toEqual({ mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", eventLabel: "Local Admin Mock" });
  });
});
