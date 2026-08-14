"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HobbyCatalogInfo, PlayerHobbyInfo, PlayerHobbyMutationRequest } from "@/shared/api/types";
import { deletePlayerHobbyApi, getHobbyCatalogApi, getPlayerHobbiesApi, registerPlayerHobbyApi, updatePlayerHobbyApi } from "./api";

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function validProficiency(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

export function useHobbyQueries() {
  const [catalog, setCatalog] = useState<HobbyCatalogInfo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [owned, setOwned] = useState<PlayerHobbyInfo[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const next = await getHobbyCatalogApi();
      setCatalog(next);
      return next;
    } catch (caught) {
      setCatalogError(message(caught, "Unable to load Hobby catalog."));
      return undefined;
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const reloadOwned = useCallback(async () => {
    setOwnedLoading(true);
    setOwnedError(null);
    try {
      const next = await getPlayerHobbiesApi();
      setOwned(next);
      if (selectedIdRef.current !== null && !next.some(({ hobbyId }) => hobbyId === selectedIdRef.current)) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
      return next;
    } catch (caught) {
      setOwnedError(message(caught, "Unable to load owned Hobbies."));
      return undefined;
    } finally {
      setOwnedLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.all([loadCatalog(), reloadOwned()]); }, [loadCatalog, reloadOwned]);

  const select = (hobbyId: number) => {
    selectedIdRef.current = hobbyId;
    setSelectedId(hobbyId);
  };

  const mutate = async (key: string, request: () => Promise<unknown>, afterReload?: (next: PlayerHobbyInfo[]) => void): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setPendingMutation(key);
    setMutationError(null);
    try {
      await request();
      const next = await reloadOwned();
      if (!next) {
        setMutationError("Hobby changed, but the authoritative owned list could not be reloaded.");
        return false;
      }
      afterReload?.(next);
      return true;
    } catch (caught) {
      await reloadOwned();
      setMutationError(`Request outcome was not confirmed. Server state was reloaded. ${message(caught, "")}`.trim());
      return false;
    } finally {
      mutationLocked.current = false;
      setPendingMutation(null);
    }
  };

  const register = (hobbyId: number, body: PlayerHobbyMutationRequest) => {
    const customName = body.customName?.trim();
    if (!customName || body.proficiency === undefined || !validProficiency(body.proficiency) || !body.status) return Promise.resolve(false);
    const detail = body.detail?.trim();
    const startedOn = body.startedOn?.trim();
    const request = { customName, proficiency: body.proficiency, status: body.status, ...(detail ? { detail } : {}), ...(startedOn ? { startedOn } : {}) };
    return mutate("register", () => registerPlayerHobbyApi(hobbyId, request), (next) => {
      if (next.some((item) => item.hobbyId === hobbyId)) select(hobbyId);
    });
  };

  const update = (hobbyId: number, body: PlayerHobbyMutationRequest) => {
    const current = owned.find((item) => item.hobbyId === hobbyId);
    if (!current) return Promise.resolve(false);
    const customName = body.customName?.trim();
    const detail = body.detail?.trim();
    const startedOn = body.startedOn?.trim();
    const changed: PlayerHobbyMutationRequest = {
      ...(customName && customName !== current.customName ? { customName } : {}),
      ...(detail && detail !== current.detail ? { detail } : {}),
      ...(body.proficiency !== undefined && body.proficiency !== current.proficiency ? { proficiency: body.proficiency } : {}),
      ...(body.status && body.status !== current.status ? { status: body.status } : {}),
      ...(startedOn && startedOn !== current.startedOn ? { startedOn } : {}),
    };
    if (Object.keys(changed).length === 0 || (changed.proficiency !== undefined && !validProficiency(changed.proficiency))) return Promise.resolve(false);
    return mutate(`update-${hobbyId}`, () => updatePlayerHobbyApi(hobbyId, changed));
  };

  const remove = (hobbyId: number) => mutate(`delete-${hobbyId}`, () => deletePlayerHobbyApi(hobbyId), () => {
    if (selectedIdRef.current === hobbyId) {
      selectedIdRef.current = null;
      setSelectedId(null);
    }
  });

  return {
    catalog: { items: catalog, loading: catalogLoading, error: catalogError, retry: loadCatalog },
    owned: { items: owned, loading: ownedLoading, error: ownedError, reload: reloadOwned },
    selectedId,
    selected: owned.find((item) => item.hobbyId === selectedId) ?? null,
    select,
    pendingMutation,
    mutationError,
    register,
    update,
    remove,
  };
}
