"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CollectionCategory,
  CollectionCreateRequest,
  CollectionInfo,
  CollectionSearchParams,
  CollectionUpdateRequest,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
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
  const mutationRequestId = useRef(0);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const resetMutation = useCallback(() => {
    mutationRequestId.current += 1;
    mutationLocked.current = false;
    setPendingMutation(null);
    setMutationError(null);
    setMutationSuccess(null);
    setRefreshError(null);
  }, []);

  useEffect(() => () => {
    listRequestId.current += 1;
    detailRequestId.current += 1;
    mutationRequestId.current += 1;
  }, []);

  const clearSelection = useCallback(() => {
    selectedIdRef.current = null;
    detailRequestId.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  }, []);

  const reload = useCallback(async (preserveSelection = false) => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const next = await searchCollectionsApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setItems(next);
      setRefreshError(null);
      if (!preserveSelection && selectedIdRef.current !== null && !next.some(({ id }) => id === selectedIdRef.current)) clearSelection();
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "수집 기록 목록을 조회하지 못했습니다."));
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
      if (requestId === detailRequestId.current) setDetailError(message(caught, "수집 기록을 조회하지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const select = useCallback((id: number, preserveMutation = false) => {
    if (!preserveMutation) resetMutation();
    selectedIdRef.current = id;
    setSelectedId(id);
    setDetail(null);
    void loadDetail(id);
    requestStageFocus("lifelog-collection-detail", "forward");
  }, [loadDetail, resetMutation]);

  const search = (category?: CollectionCategory, titleLike?: string) => {
    resetMutation();
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { page: 0, size: paramsRef.current.size, category, titleLike: titleLike?.trim() || undefined };
    setParams(paramsRef.current);
  };

  const changePage = (page: number) => {
    resetMutation();
    clearSelection();
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
    const requestId = ++mutationRequestId.current;
    const selectionId = detailRequestId.current;
    setPendingMutation(key);
    setMutationError(null);
    setMutationSuccess(null);
    setRefreshError(null);
    try {
      const result = await request();
      if (requestId !== mutationRequestId.current) return false;
      onResponse?.(result);
      setMutationSuccess(key === "create" ? "Collection created." : key.startsWith("delete") ? "Collection deleted." : "Collection updated.");
      const next = await reload(true);
      if (requestId !== mutationRequestId.current) return false;
      if (next && selectionId === detailRequestId.current) onReload?.(result, next);
      if (!next) setRefreshError("변경은 저장됐지만 목록을 다시 조회하지 못했습니다. 저장을 반복하지 말고 조회를 다시 시도하세요.");
      return true;
    } catch (caught) {
      if (requestId !== mutationRequestId.current) return false;
      const next = await reload(true);
      if (requestId !== mutationRequestId.current) return false;
      setMutationError(`요청 결과가 확정되지 않았습니다. ${next ? "목록을 다시 조회했습니다." : "목록을 다시 조회하지 못했습니다."} 다시 저장하기 전에 현재 기록을 확인하세요. ${message(caught, "")}`.trim());
      return false;
    } finally {
      if (requestId === mutationRequestId.current) {
        mutationLocked.current = false;
        setPendingMutation(null);
      }
    }
  };

  const create = (body: CollectionCreateRequest) => mutate(
    "create",
    () => createCollectionApi(body),
    undefined,
    (created, next) => {
      if (next.some(({ id }) => id === created.id)) select(created.id, true);
    },
  );

  const update = (id: number, body: CollectionUpdateRequest) => mutate(
    `update-${id}`,
    () => updateCollectionApi(id, body),
    (updated) => {
      if (selectedIdRef.current === id) {
        detailRequestId.current += 1;
        setDetailLoading(false);
        setDetailError(null);
        setDetail(updated);
      }
    },
  );

  const remove = (id: number) => mutate(
    `delete-${id}`,
    () => deleteCollectionApi(id),
    () => {
      if (selectedIdRef.current === id) clearSelection();
      setItems((current) => current.filter((item) => item.id !== id));
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
    mutationSuccess,
    refreshError,
    resetMutation,
    clearSelection,
    create,
    update,
    remove,
  };
}
