import { USE_MOCK, apiGet } from "@/shared/api/client";
import { homeMock } from "./mock";
import type { HomeSummary } from "./model";

export function getHomeApi(): Promise<HomeSummary> {
  return USE_MOCK ? Promise.resolve(homeMock()) : apiGet<HomeSummary>("/api/v1/home");
}
