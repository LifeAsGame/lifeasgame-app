"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { JournalDetail, JournalListParams, JournalPage, JournalSubtype } from "@/shared/api/types";
import { getJournalDetailApi, listJournalApi } from "./api";

const INITIAL_PARAMS: JournalListParams = { page: 0, size: 20 };
const EMPTY_PAGE: JournalPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

type DetailState = {
  data: JournalDetail | null;
  loading: boolean;
  error: string | null;
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
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const selectedLifeLogIdRef = useRef<number | null>(null);

  const clearSelection = useCallback(() => {
    selectedLifeLogIdRef.current = null;
    detailRequestId.current += 1;
    setSelectedLifeLogId(null);
    setDetail({ data: null, loading: false, error: null });
  }, []);

  const reloadList = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError(null);
    try {
      const next = await listJournalApi(params);
      if (requestId !== listRequestId.current) return next;
      setPageData(next);
      const selectedId = selectedLifeLogIdRef.current;
      if (selectedId !== null && !next.content.some(({ lifeLogId }) => lifeLogId === selectedId)) clearSelection();
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setListError(message(caught, "Unable to load Journal."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, [clearSelection, params]);

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
        setDetail((previous) => ({ ...previous, loading: false, error: message(caught, "Unable to load Journal detail.") }));
      }
      return undefined;
    }
  }, []);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  const selectEntry = useCallback((lifeLogId: number) => {
    selectedLifeLogIdRef.current = lifeLogId;
    setSelectedLifeLogId(lifeLogId);
    void loadDetail(lifeLogId);
  }, [loadDetail]);

  const changeRoleFilter = (primaryRoleId?: number) => {
    listRequestId.current += 1;
    setParams((current) => ({ ...current, primaryRoleId, page: 0 }));
  };

  const changeSubtypeFilter = (subtype?: JournalSubtype) => {
    listRequestId.current += 1;
    setParams((current) => ({ ...current, subtype, page: 0 }));
  };

  const changePage = (page: number) => {
    listRequestId.current += 1;
    setParams((current) => ({ ...current, page }));
  };

  const retryDetail = () => {
    if (selectedLifeLogIdRef.current !== null) void loadDetail(selectedLifeLogIdRef.current, true);
  };

  return {
    params,
    list: { data: pageData, loading: listLoading, error: listError, reload: reloadList },
    detail: { ...detail, retry: retryDetail },
    selectedLifeLogId,
    selectEntry,
    changeRoleFilter,
    changeSubtypeFilter,
    changePage,
  };
}
