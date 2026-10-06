import { apiDelete, apiGet, apiPatch, apiPost, USE_MOCK } from "@/shared/api/client";

export type CategoryKind = "CERTIFICATION" | "HOBBY";
export type PersonalCategory = { id: number | null; code: string | null; name: string; source: "SYSTEM" | "PERSONAL" | "OFFICIAL"; kind: CategoryKind };
export const SYSTEM_CODES: Record<CategoryKind, readonly string[]> = {
  CERTIFICATION: ["PROGRAMMING", "CLOUD", "DATABASE", "SECURITY", "DATA", "NETWORK", "LANGUAGE", "MANAGEMENT", "FINANCE", "DESIGN", "OTHER"],
  HOBBY: ["FITNESS", "SPORTS", "OUTDOORS", "MUSIC", "ARTS", "CRAFTS", "GAMING", "BOARD_GAMES", "TECH", "COOKING", "BAKING", "PHOTOGRAPHY", "READING", "WRITING", "LANGUAGE", "TRAVEL", "WELLNESS", "VOLUNTEERING"],
};
export const systemCategories = (kind: CategoryKind): PersonalCategory[] => SYSTEM_CODES[kind].map((code) => ({ id: null, code, name: code, source: "SYSTEM", kind }));
const path = (kind: CategoryKind) => "/api/v1/players/categories/" + kind;
export const categoryKey = (category: PersonalCategory) => category.source === "PERSONAL" ? "personal:" + category.id : "system:" + category.code;
export const listPersonalCategoriesApi = (kind: CategoryKind) => USE_MOCK ? Promise.resolve(systemCategories(kind)) : apiGet<PersonalCategory[]>(path(kind));
export const createPersonalCategoryApi = (kind: CategoryKind, name: string) => apiPost<PersonalCategory>(path(kind), { name });
export const renamePersonalCategoryApi = (kind: CategoryKind, id: number, name: string) => apiPatch<PersonalCategory>(path(kind) + "/" + id, { name });
export const deletePersonalCategoryApi = (kind: CategoryKind, id: number) => apiDelete<void>(path(kind) + "/" + id);
export const assignPersonalCategoryApi = (kind: CategoryKind, itemId: number, personalCategoryId: number | null) =>
  apiPatch<{ itemId: number; personalCategoryId: number | null }>(path(kind) + "/items/" + itemId + "/personal-category", { personalCategoryId });
