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
      const next = await searchExercisesApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setItems(next);
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "Unable to load Exercises."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, []);

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
      if (requestId === detailRequestId.current) setDetailError(message(caught, "Unable to load Exercise."));
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

  const search = (category?: ExerciseCategory, from?: string, to?: string) => {
    listRequestId.current += 1;
    paramsRef.current = { page: 0, size: paramsRef.current.size, category, from: from || undefined, to: to || undefined };
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
    onReload?: (result: T) => void,
  ): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setPendingMutation(key);
    setMutationError(null);
    try {
      const result = await request();
      onResponse?.(result);
      if (await reload()) onReload?.(result);
      else setMutationError("Exercise changed, but the authoritative list could not be reloaded.");
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

  const create = (body: ExerciseCreateRequest) => mutate(
    "create",
    () => createExerciseApi(body),
    undefined,
    ({ id }) => select(id),
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
    ({ id: deletedId }) => {
      if (selectedIdRef.current === deletedId) clearSelection();
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
