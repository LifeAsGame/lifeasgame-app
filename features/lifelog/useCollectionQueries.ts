"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CollectionCategory,
  CollectionCreateRequest,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
} from "@/shared/api/types";
import {
  createCollectionApi,
  deleteCollectionApi,
  getCollectionApi,
  searchCollectionsApi,
  updateCollectionApi,
} from "./api";

const INITIAL_PARAMS: CollectionSearchParams = { page: 0, size: 20 };

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useCollectionQueries() {
  const [params, setParams] = useState<CollectionSearchParams>(INITIAL_PARAMS);
  const paramsRef = useRef(INITIAL_PARAMS);
  const [items, setItems] = useState<CollectionInfo[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<CollectionInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    selectedIdRef.current = null;
    detailRequestId.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  }, []);

  const reload = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const next = await searchCollectionsApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setItems(next);
      if (selectedIdRef.current !== null && !next.some(({ id }) => id === selectedIdRef.current)) clearSelection();
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "Unable to load Collections."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, [clearSelection]);

  useEffect(() => { void reload(); }, [params, reload]);

  const loadDetail = useCallback(async (id: number) => {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const next = await getCollectionApi(id);
      if (requestId === detailRequestId.current) setDetail(next);
      return next;
    } catch (caught) {
      if (requestId === detailRequestId.current) setDetailError(message(caught, "Unable to load Collection."));
      return undefined;
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const select = useCallback((id: number) => {
    selectedIdRef.current = id;
    setSelectedId(id);
    setDetail(null);
    void loadDetail(id);
  }, [loadDetail]);

  const search = (category?: CollectionCategory, titleLike?: string) => {
    listRequestId.current += 1;
    paramsRef.current = { page: 0, size: paramsRef.current.size, category, titleLike: titleLike?.trim() || undefined };
    setParams(paramsRef.current);
  };

  const changePage = (page: number) => {
    listRequestId.current += 1;
    paramsRef.current = { ...paramsRef.current, page: Math.max(0, page) };
    setParams(paramsRef.current);
  };

  const mutate = async <T,>(
    key: string,
    request: () => Promise<T>,
    onResponse?: (result: T) => void,
    onReload?: (result: T, next: CollectionInfo[]) => void,
  ): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setPendingMutation(key);
    setMutationError(null);
    try {
      const result = await request();
      onResponse?.(result);
      const next = await reload();
      if (next) onReload?.(result, next);
      else setMutationError("Collection changed, but the authoritative list could not be reloaded.");
      return true;
    } catch (caught) {
      await reload();
      setMutationError(`Request outcome was not confirmed. Server state was reloaded. ${message(caught, "")}`.trim());
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingMutation(null);
    }
  };

  const create = (body: CollectionCreateRequest) => mutate(
    "create",
    () => createCollectionApi(body),
    undefined,
    (created, next) => {
      if (next.some(({ id }) => id === created.id)) select(created.id);
    },
  );

  const update = (id: number, body: CollectionUpdateRequest) => mutate(
    `update-${id}`,
    () => updateCollectionApi(id, body),
    (updated) => {
      if (selectedIdRef.current === id) setDetail(updated);
    },
  );

  const remove = (id: number) => mutate(
    `delete-${id}`,
    () => deleteCollectionApi(id),
    (deleted) => {
      if (selectedIdRef.current === deleted.id) clearSelection();
    },
  );

  return {
    params,
    list: { items, loading: listLoading, error: listError, reload },
    detail: { data: detail, loading: detailLoading, error: detailError, retry: () => selectedIdRef.current === null ? Promise.resolve(undefined) : loadDetail(selectedIdRef.current) },
    selectedId,
    select,
    search,
    changePage,
    pendingMutation,
    mutationError,
    create,
    update,
    remove,
  };
}
