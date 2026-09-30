"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { JournalDetail, JournalListParams, JournalPage, JournalSubtype, QuickRecordRequest, QuickRecordResult } from "@/shared/api/types";
import { getJournalDetailApi, listJournalApi, quickRecordApi } from "./api";

const INITIAL_PARAMS: JournalListParams = { page: 0, size: 20 };
const EMPTY_PAGE: JournalPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

type DetailState = {
  data: JournalDetail | null;
  loading: boolean;
  error: string | null;
};

type QuickRecordState = {
  pending: boolean;
  error: string | null;
  result: QuickRecordResult | null;
  refreshError: string | null;
  canRetry: boolean;
};

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useJournalQueries() {
  const [params, setParams] = useState<JournalListParams>(INITIAL_PARAMS);
  const [pageData, setPageData] = useState<JournalPage>(EMPTY_PAGE);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedLifeLogId, setSelectedLifeLogId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailState>({ data: null, loading: false, error: null });
  const paramsRef = useRef<JournalListParams>(INITIAL_PARAMS);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const selectedLifeLogIdRef = useRef<number | null>(null);
  const quickRecordLocked = useRef(false);
  const quickRecordRequestId = useRef(0);
  const failedQuickRecord = useRef<{ body: QuickRecordRequest; key: string } | null>(null);
  const [quickRecord, setQuickRecord] = useState<QuickRecordState>({
    pending: false,
    error: null,
    result: null,
    refreshError: null,
    canRetry: false,
  });

  const clearSelection = useCallback(() => {
    selectedLifeLogIdRef.current = null;
    detailRequestId.current += 1;
    setSelectedLifeLogId(null);
    setDetail({ data: null, loading: false, error: null });
  }, []);

  const reloadList = useCallback(async (preserveSelection = false) => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const next = await listJournalApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setPageData(next);
      setQuickRecord((current) => current.refreshError ? { ...current, refreshError: null } : current);
      const selectedId = selectedLifeLogIdRef.current;
      if (!preserveSelection && selectedId !== null && !next.content.some(({ lifeLogId }) => lifeLogId === selectedId)) clearSelection();
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "일상 기록을 조회하지 못했습니다."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, [clearSelection]);

  const loadDetail = useCallback(async (lifeLogId: number, preserve = false) => {
    const requestId = ++detailRequestId.current;
    setDetail((previous) => ({
      data: preserve && previous.data?.lifeLogId === lifeLogId ? previous.data : null,
      loading: true,
      error: null,
    }));
    try {
      const data = await getJournalDetailApi(lifeLogId);
      if (requestId === detailRequestId.current) setDetail({ data, loading: false, error: null });
      return data;
    } catch (caught) {
      if (requestId === detailRequestId.current) {
        setDetail((previous) => ({ ...previous, loading: false, error: message(caught, "일상 기록 상세를 조회하지 못했습니다.") }));
      }
      return undefined;
    }
  }, []);

  useEffect(() => {
    void reloadList();
  }, [params, reloadList]);

  useEffect(() => () => {
    listRequestId.current += 1;
    detailRequestId.current += 1;
    quickRecordRequestId.current += 1;
  }, []);

  const resetQuickRecord = useCallback(() => {
    quickRecordRequestId.current += 1;
    quickRecordLocked.current = false;
    failedQuickRecord.current = null;
    setQuickRecord({ pending: false, error: null, result: null, refreshError: null, canRetry: false });
  }, []);

  const selectEntry = useCallback((lifeLogId: number) => {
    selectedLifeLogIdRef.current = lifeLogId;
    setSelectedLifeLogId(lifeLogId);
    void loadDetail(lifeLogId);
  }, [loadDetail]);

  const runQuickRecord = useCallback(async (body: QuickRecordRequest, key: string) => {
    if (quickRecordLocked.current) return undefined;
    quickRecordLocked.current = true;
    const requestId = ++quickRecordRequestId.current;
    const selectionId = detailRequestId.current;
    setQuickRecord({ pending: true, error: null, result: null, refreshError: null, canRetry: false });
    try {
      const result = await quickRecordApi(body, key);
      if (requestId !== quickRecordRequestId.current) return undefined;
      failedQuickRecord.current = null;
      setQuickRecord({ pending: true, error: null, result, refreshError: null, canRetry: false });

      const nextPage = await reloadList(true);
      if (requestId !== quickRecordRequestId.current) return undefined;
      if (!nextPage) {
        setQuickRecord((current) => ({
          ...current,
          refreshError: "기록은 저장됐지만 목록을 다시 조회하지 못했습니다. 목록을 다시 조회하세요.",
        }));
      } else {
        const matching = nextPage.content.find((entry) =>
          entry.sourceType === result.sourceType && entry.sourceId === result.sourceId
        );
        if (matching && selectionId === detailRequestId.current) selectEntry(matching.lifeLogId);
      }
      return result;
    } catch (caught) {
      if (requestId !== quickRecordRequestId.current) return undefined;
      failedQuickRecord.current = { body, key };
      setQuickRecord({
        pending: false,
        error: message(caught, "간편 기록을 저장하지 못했습니다."),
        result: null,
        refreshError: null,
        canRetry: true,
      });
      return undefined;
    } finally {
      if (requestId === quickRecordRequestId.current) {
        quickRecordLocked.current = false;
        setQuickRecord((current) => ({ ...current, pending: false }));
      }
    }
  }, [reloadList, selectEntry]);

  const submitQuickRecord = useCallback((body: QuickRecordRequest) => {
    const failed = failedQuickRecord.current;
    return failed
      ? runQuickRecord(failed.body, failed.key)
      : runQuickRecord(structuredClone(body), globalThis.crypto.randomUUID());
  }, [runQuickRecord]);

  const retryQuickRecord = useCallback(() => {
    const failed = failedQuickRecord.current;
    return failed ? runQuickRecord(failed.body, failed.key) : Promise.resolve(undefined);
  }, [runQuickRecord]);

  const invalidateQuickRecordRetry = () => {
    if (quickRecordLocked.current) return;
    failedQuickRecord.current = null;
    setQuickRecord((current) => ({ ...current, error: null, result: null, refreshError: null, canRetry: false }));
  };

  const changeRoleFilter = (primaryRoleId?: number) => {
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { ...paramsRef.current, primaryRoleId, page: 0 };
    setParams(paramsRef.current);
  };

  const changeSubtypeFilter = (subtype?: JournalSubtype) => {
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { ...paramsRef.current, subtype, page: 0 };
    setParams(paramsRef.current);
  };

  const changePage = (page: number) => {
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { ...paramsRef.current, page };
    setParams(paramsRef.current);
  };

  const retryDetail = () => {
    if (selectedLifeLogIdRef.current !== null) void loadDetail(selectedLifeLogIdRef.current, true);
  };

  return {
    params,
    list: { data: pageData, loading: listLoading, error: listError, reload: reloadList },
    detail: { ...detail, retry: retryDetail },
    quickRecord: {
      ...quickRecord,
      submit: submitQuickRecord,
      retry: retryQuickRecord,
      invalidateRetry: invalidateQuickRecordRetry,
      reset: resetQuickRecord,
    },
    selectedLifeLogId,
    selectEntry,
    clearSelection,
    changeRoleFilter,
    changeSubtypeFilter,
    changePage,
  };
}
