import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/shared/api/client";

export type LifeLogKind = "COLLECTION" | "EXERCISE" | "MEDIA";
export type LifeLogFolder = {
  id: number;
  kind: LifeLogKind;
  source: "SYSTEM" | "PERSONAL";
  name: string;
  systemCode: string | null;
};
export type SystemLifeLogCategory = { code: string; name: string };

const base = "/api/v1/players/lifelog/categories";

type CategoryWire = string | {
  id?: number;
  kind?: LifeLogKind;
  source?: "SYSTEM" | "PERSONAL";
  name?: string;
  code?: string | null;
  systemCode?: string | null;
};

export async function getSystemLifeLogCategories(kind: LifeLogKind): Promise<SystemLifeLogCategory[]> {
  const rows = await apiGet<CategoryWire[]>(`${base}/system?kind=${kind}`);
  return rows.map((row) => typeof row === "string"
    ? { code: row, name: row }
    : { code: row.systemCode ?? row.code ?? "", name: row.name ?? row.systemCode ?? row.code ?? "" })
    .filter((row) => row.code);
}

export async function getMyLifeLogCategories(kind: LifeLogKind): Promise<LifeLogFolder[]> {
  const rows = await apiGet<CategoryWire[]>(`${base}?kind=${kind}`);
  return rows.filter((row): row is Exclude<CategoryWire, string> => typeof row !== "string")
    .filter((row) => typeof row.id === "number")
    .map((row) => ({
      id: row.id!,
      kind: row.kind ?? kind,
      source: row.source ?? (row.systemCode ?? row.code ? "SYSTEM" : "PERSONAL"),
      name: row.name ?? row.systemCode ?? row.code ?? "",
      systemCode: row.systemCode ?? row.code ?? null,
    }));
}

export const addSystemLifeLogCategory = (kind: LifeLogKind, systemCode: string) =>
  apiPost<LifeLogFolder>(`${base}/system`, { kind, systemCode });
export const hideSystemLifeLogCategory = (kind: LifeLogKind, systemCode: string) =>
  apiDelete<void>(`${base}/system/${kind}/${encodeURIComponent(systemCode)}`);
export const createPersonalLifeLogCategory = (kind: LifeLogKind, name: string) =>
  apiPost<LifeLogFolder>(`${base}/personal`, { kind, name });
export const renamePersonalLifeLogCategory = (id: number, name: string) =>
  apiPatch<LifeLogFolder>(`${base}/personal/${id}`, { name });
export const deletePersonalLifeLogCategory = (id: number) =>
  apiDelete<void>(`${base}/personal/${id}`);
export const assignLifeLogRecordCategory = (kind: LifeLogKind, recordId: number, categoryId: number | null) =>
  apiPut<unknown>(`${base}/records/${kind}/${recordId}/personal-category`, { categoryId });
