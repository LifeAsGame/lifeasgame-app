import { expect, it, vi } from "vitest";
import { apiGet } from "@/shared/api/client";
import { scheduleKey, schedulePath } from "./scheduleApi";

vi.mock("@/shared/api/client", () => ({ apiGet: vi.fn() }));

it("requests the selected local month as an exclusive UTC instant range", () => {
  const path = schedulePath(12, { month: "2026-10", unscheduled: false, source: "ALL", status: "PLANNED", page: 1 });
  const query = new URLSearchParams(path.split("?")[1]);
  const from = new Date(query.get("from")!);
  const to = new Date(query.get("to")!);
  expect(path).toContain("/api/v1/roles/12/schedule?");
  expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getHours()]).toEqual([2026, 9, 1, 0]);
  expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getHours()]).toEqual([2026, 10, 1, 0]);
  expect(query.get("page")).toBe("1");
  expect(query.get("size")).toBe("20");
  expect(apiGet).not.toHaveBeenCalled();
});

it("keeps RSVP and unscheduled requests within the BE's valid combinations", () => {
  const rsvp = new URLSearchParams(schedulePath(1, { month: "2026-10", unscheduled: false, source: "PARTICIPATING", status: "ALL", page: 0 }).split("?")[1]);
  expect(rsvp.get("source")).toBe("GUILD"); expect(rsvp.get("participating")).toBe("true");
  const undated = new URLSearchParams(schedulePath(1, { month: "2026-10", unscheduled: true, source: "PARTICIPATING", status: "ALL", page: 0 }).split("?")[1]);
  expect(undated.get("time")).toBe("UNSCHEDULED"); expect(undated.get("source")).toBe("PERSONAL");
  expect(undated.has("participating")).toBe(false); expect(undated.has("from")).toBe(false); expect(undated.has("to")).toBe(false);
  expect(scheduleKey({ sourceType: "ROLE_EVENT", sourceId: 9 })).not.toBe(scheduleKey({ sourceType: "GUILD_EVENT", sourceId: 9 }));
});
