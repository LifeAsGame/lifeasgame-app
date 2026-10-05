import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/api/client";
import type { HobbyStatus } from "@/shared/api/types";
import type { CategoryKind, PersonalCategory } from "./personalCategories";

export type CatalogGroup = {
  majorCode: string;
  majorName: string;
  minorCode: string | null;
  minorName: string | null;
  source: string;
};

export type CatalogItem = {
  catalogItemId: number;
  name: string;
  category: string;
  source: string;
  sourceCode: string | null;
  majorCode: string | null;
  majorName: string | null;
  minorCode: string | null;
  minorName: string | null;
  issuer: string | null;
  administeringAgency: string | null;
  detail: string | null;
  detailStatus: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  owned: boolean;
};

export type CatalogPage = {
  items: CatalogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PrivateHobby = {
  ownedItemId: number;
  catalogItemId: null;
  source: "PRIVATE";
  name: string;
  detail: string | null;
  proficiency: number;
  status: HobbyStatus;
  startedOn: string | null;
  personalCategoryId: number | null;
};

export type PrivateHobbyInput = {
  name?: string;
  detail?: string;
  proficiency?: number;
  status?: HobbyStatus;
  startedOn?: string;
  personalCategoryId?: number | null;
};

const base = (kind: CategoryKind) => `/api/v1/catalog/${kind}`;

export const getOwnedCategoriesApi = (kind: CategoryKind) =>
  apiGet<PersonalCategory[]>(`/api/v1/players/categories/${kind}/owned`);
export const getCatalogGroupsApi = (kind: CategoryKind) => apiGet<CatalogGroup[]>(`${base(kind)}/categories`);
export const getCatalogItemsApi = (kind: CategoryKind, filters: { q?: string; majorCode?: string; minorCode?: string; page: number }) => {
  const search = new URLSearchParams({ page: String(filters.page), size: "20" });
  if (filters.q) search.set("q", filters.q);
  if (filters.majorCode) search.set("majorCode", filters.majorCode);
  if (filters.minorCode) search.set("minorCode", filters.minorCode);
  return apiGet<CatalogPage>(`${base(kind)}/items?${search}`);
};
export const getCatalogItemApi = (kind: CategoryKind, id: number) => apiGet<CatalogItem>(`${base(kind)}/items/${id}`);

const privatePath = "/api/v1/players/hobbies/private";
export const getPrivateHobbiesApi = () => apiGet<PrivateHobby[]>(privatePath);
export const createPrivateHobbyApi = (body: PrivateHobbyInput) => apiPost<PrivateHobby>(privatePath, body);
export const updatePrivateHobbyApi = (id: number, body: PrivateHobbyInput) => apiPatch<PrivateHobby>(`${privatePath}/${id}`, body);
export const deletePrivateHobbyApi = (id: number) => apiDelete<void>(`${privatePath}/${id}`);
