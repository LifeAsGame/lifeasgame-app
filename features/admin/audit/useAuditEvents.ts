"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminAuditPage, AdminAuditQuery } from "../model";

type AuditLoadError = { status: number | null; message: string };

export function useAuditEvents(enabled: boolean, query: AdminAuditQuery, dataSource: AdminAuditDataSource) {
  const [data, setData] = useState<AdminAuditPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuditLoadError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await dataSource.getEvents(query);
      if (current === requestId.current) {
        setData(next);
        setLoadedAt(new Date());
      }
      return next;
    } catch (caught) {
      if (current === requestId.current) {
        setData(null);
        setLoadedAt(null);
        setError({
          status: caught instanceof ApiError ? caught.status : null,
          message: caught instanceof Error ? caught.message : "Unable to load Admin Audit.",
        });
      }
      return undefined;
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [dataSource, query]);

  useEffect(() => {
    if (enabled) void reload();
    else {
      requestId.current += 1;
      setData(null);
      setLoading(false);
      setError(null);
      setLoadedAt(null);
    }
  }, [enabled, reload]);

  return { data, loading, error, loadedAt, reload };
}
