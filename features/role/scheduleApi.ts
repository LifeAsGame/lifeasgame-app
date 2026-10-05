import { apiGet } from "@/shared/api/client";
import type { ConnectionPage } from "@/shared/api/types";

export type ScheduleRow = {
  sourceType: "ROLE_EVENT" | "GUILD_EVENT";
  sourceId: number;
  roleId: number | null;
  guildId: number | null;
  guildName: string | null;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  myRsvp: boolean | null;
};
export type ScheduleSource = "ALL" | "PERSONAL" | "GUILD" | "PARTICIPATING";
export type ScheduleStatus = ScheduleRow["status"] | "ALL";
export const scheduleKey = (row: Pick<ScheduleRow, "sourceType" | "sourceId">) => `${row.sourceType}:${row.sourceId}`;

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function schedulePath(roleId: number, options: { month: string; unscheduled: boolean; source: ScheduleSource; status: ScheduleStatus; page: number }) {
  const query = new URLSearchParams({
    time: options.unscheduled ? "UNSCHEDULED" : "DATED",
    source: options.unscheduled ? "PERSONAL" : options.source === "PARTICIPATING" ? "GUILD" : options.source,
    status: options.status,
    page: String(options.page),
    size: "20",
  });
  if (!options.unscheduled && options.source === "PARTICIPATING") query.set("participating", "true");
  if (!options.unscheduled) {
    const [year, month] = options.month.split("-").map(Number);
    if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("조회할 월을 확인해주세요.");
    // The selected month is local in the UI; UTC ISO carries the same instants to the API.
    query.set("from", new Date(year, month - 1, 1).toISOString());
    query.set("to", new Date(year, month, 1).toISOString());
  }
  return `/api/v1/roles/${roleId}/schedule?${query}`;
}

export const roleSchedule = (roleId: number, options: Parameters<typeof schedulePath>[1]) =>
  apiGet<ConnectionPage<ScheduleRow>>(schedulePath(roleId, options));
