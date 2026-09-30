"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CertificationCatalogInfo,
  PlayerCertificationDatesRequest,
  PlayerCertificationInfo,
} from "@/shared/api/types";
import {
  deletePlayerCertificationApi,
  getCertificationCatalogApi,
  getPlayerCertificationsApi,
  registerPlayerCertificationApi,
  updatePlayerCertificationApi,
} from "./api";

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useCertificationQueries() {
  const [catalog, setCatalog] = useState<CertificationCatalogInfo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [owned, setOwned] = useState<PlayerCertificationInfo[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null);
  const clearMutationError = useCallback(() => { setMutationError(null); setMutationErrorKey(null); }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const next = await getCertificationCatalogApi();
      setCatalog(next);
      return next;
    } catch (caught) {
      setCatalogError(message(caught, "자격증 카탈로그를 조회하지 못했습니다."));
      return undefined;
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const reloadOwned = useCallback(async () => {
    setOwnedLoading(true);
    setOwnedError(null);
    try {
      const next = await getPlayerCertificationsApi();
      setOwned(next);
      if (selectedIdRef.current !== null && !next.some((item) => item.certificationId === selectedIdRef.current)) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
      return next;
    } catch (caught) {
      setOwnedError(message(caught, "내 자격증을 조회하지 못했습니다."));
      return undefined;
    } finally {
      setOwnedLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.all([loadCatalog(), reloadOwned()]); }, [loadCatalog, reloadOwned]);

  const select = (certificationId: number) => {
    clearMutationError();
    selectedIdRef.current = certificationId;
    setSelectedId(certificationId);
  };

  const clearSelection = useCallback(() => {
    selectedIdRef.current = null;
    setSelectedId(null);
  }, []);

  const mutate = async <T,>(
    key: string,
    request: () => Promise<T>,
    onResponse?: (result: T) => void,
    onReload?: (result: T, next: PlayerCertificationInfo[]) => void,
  ): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setPendingMutation(key);
    setMutationError(null);
    setMutationErrorKey(null);
    try {
      const result = await request();
      onResponse?.(result);
      const next = await reloadOwned();
      if (next) onReload?.(result, next);
      else { setMutationErrorKey(key); setMutationError("자격증 변경 후 목록을 다시 조회하지 못했습니다. 서버 상태를 확인해 주세요."); }
      return Boolean(next);
    } catch (caught) {
      await reloadOwned();
      setMutationErrorKey(key);
      setMutationError(`요청 결과가 확정되지 않았습니다. 다시 조회한 서버 상태를 확인하세요. ${message(caught, "")}`.trim());
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingMutation(null);
    }
  };

  const register = (certificationId: number, body: PlayerCertificationDatesRequest) => mutate(
    "register",
    () => registerPlayerCertificationApi(certificationId, body),
    undefined,
    (_, next) => {
      if (next.some((item) => item.certificationId === certificationId)) select(certificationId);
    },
  );

  const update = (certificationId: number, body: PlayerCertificationDatesRequest) => {
    if (Object.keys(body).length === 0) return Promise.resolve(false);
    return mutate(`update-${certificationId}`, () => updatePlayerCertificationApi(certificationId, body));
  };

  const remove = (certificationId: number) => mutate(
    `delete-${certificationId}`,
    () => deletePlayerCertificationApi(certificationId),
    () => {
      if (selectedIdRef.current === certificationId) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
    },
  );

  return {
    catalog: { items: catalog, loading: catalogLoading, error: catalogError, retry: loadCatalog },
    owned: { items: owned, loading: ownedLoading, error: ownedError, reload: reloadOwned },
    selectedId,
    selected: owned.find((item) => item.certificationId === selectedId) ?? null,
    select,
    clearSelection,
    pendingMutation,
    mutationError,
    mutationErrorKey,
    clearMutationError,
    register,
    update,
    remove,
  };
}
