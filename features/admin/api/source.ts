export type AdminDataSourceMode = "api" | "mock";

export type AdminDataSourceDescriptor = {
  mode: AdminDataSourceMode;
  badge: "API" | "MOCK DATA";
  label: string;
};

export function resolveAdminDataSourceMode(value: unknown): AdminDataSourceMode {
  return value === "mock" ? "mock" : "api";
}
