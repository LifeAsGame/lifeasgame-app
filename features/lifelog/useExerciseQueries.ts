"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ExerciseCategory,
  ExerciseCreateRequest,
  ExerciseInfo,
  ExerciseSearchParams,
  ExerciseUpdateRequest,
} from "@/shared/api/types";
import {
  createExerciseApi,
  deleteExerciseApi,
  getExerciseApi,
  searchExercisesApi,
  updateExerciseApi,
} from "./api";

const INITIAL_PARAMS: ExerciseSearchParams = { page: 0, size: 20 };

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useExerciseQueries() {
  const [params, setParams] = useState<ExerciseSearchParams>(INITIAL_PARAMS);
  const paramsRef = useRef(INITIAL_PARAMS);
  const [items, setItems] = useState<ExerciseInfo[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<ExerciseInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const mutationLocked = useRef(false);
  const selectionVersion = useRef(0);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    selectionVersion.current++;
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
      const next = await searchExercisesApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setItems(next);
      if (selectedIdRef.current !== null && !next.some(({ id }) => id === selectedIdRef.current)) clearSelection();
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "운동 기록 목록을 조회하지 못했습니다."));
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
      const next = await getExerciseApi(id);
      if (requestId === detailRequestId.current) setDetail(next);
      return next;
    } catch (caught) {
      if (requestId === detailRequestId.current) setDetailError(message(caught, "운동 기록을 조회하지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, []);

  const select = useCallback((id: number) => {
    selectionVersion.current++;
    selectedIdRef.current = id;
    setSelectedId(id);
    setDetail(null);
    void loadDetail(id);
  }, [loadDetail]);

  const search = (category?: ExerciseCategory, from?: string, to?: string, folder: Pick<ExerciseSearchParams, "personalCategoryId" | "unclassified"> = {}) => {
    clearSelection();
    listRequestId.current += 1;
    setItems([]);
    paramsRef.current = { page: 0, size: paramsRef.current.size, category, from: from || undefined, to: to || undefined, ...folder };
    setParams(paramsRef.current);
  };

  const changePage = (page: number) => {
    clearSelection();
    listRequestId.current += 1;
    setItems([]);
    paramsRef.current = { ...paramsRef.current, page: Math.max(0, page) };
    setParams(paramsRef.current);
  };

  const mutate = async <T,>(
    key: string,
    request: () => Promise<T>,
    onResponse?: (result: T) => void,
    onReload?: (result: T, next: ExerciseInfo[]) => void,
  ): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    const selection = selectionVersion.current;
    setPendingMutation(key);
    setMutationError(null);
    try {
      const result = await request();
      onResponse?.(result);
      const next = await reload();
      if (next) { if (selection === selectionVersion.current) onReload?.(result, next); }
      else setMutationError("변경은 저장됐지만 목록을 다시 조회하지 못했습니다. 저장을 반복하지 말고 목록을 다시 조회하세요.");
      return true;
    } catch (caught) {
      await reload();
      setMutationError(`요청 결과가 확정되지 않았습니다. 다시 조회한 서버 상태를 확인하세요. ${message(caught, "")}`.trim());
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingMutation(null);
    }
  };

  const create = (body: ExerciseCreateRequest) => mutate(
    "create",
    () => createExerciseApi(body),
    undefined,
    ({ id }, next) => { if (next.some((item) => item.id === id)) select(id); },
  );

  const update = (id: number, body: ExerciseUpdateRequest) => mutate(
    `update-${id}`,
    () => updateExerciseApi(id, body),
    (updated) => {
      if (selectedIdRef.current === id) setDetail(updated);
    },
  );

  const remove = (id: number) => mutate(
    `delete-${id}`,
    () => deleteExerciseApi(id),
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
    clearSelection,
    search,
    changePage,
    pendingMutation,
    mutationError,
    create,
    update,
    remove,
  };
}
