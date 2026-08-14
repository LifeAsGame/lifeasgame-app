"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaCategory, MediaCreateRequest, MediaInfo, MediaSearchParams, MediaStatus, MediaUpdateRequest } from "@/shared/api/types";
import { createMediaApi, deleteMediaApi, searchMediaApi, updateMediaApi } from "./api";

const INITIAL_PARAMS: MediaSearchParams = { page: 0, size: 20 };

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function sameTags(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((tag) => right.includes(tag));
}

export function changedMediaFields(current: MediaInfo, candidate: MediaUpdateRequest): MediaUpdateRequest {
  const title = candidate.title?.trim();
  const originalTitle = candidate.originalTitle?.trim();
  const tags = candidate.tags ? [...new Set(candidate.tags.map((tag) => tag.trim()).filter(Boolean))] : undefined;
  return {
    ...(candidate.category && candidate.category !== current.category ? { category: candidate.category } : {}),
    ...(title && title !== current.title ? { title } : {}),
    ...(candidate.originalTitle === "" && current.originalTitle ? { originalTitle: "" } : originalTitle && originalTitle !== current.originalTitle ? { originalTitle } : {}),
    ...(candidate.currentEpisode != null && candidate.currentEpisode !== current.currentEpisode ? { currentEpisode: candidate.currentEpisode } : {}),
    ...(candidate.totalEpisode != null && candidate.totalEpisode !== current.totalEpisode ? { totalEpisode: candidate.totalEpisode } : {}),
    ...(candidate.status && candidate.status !== current.status ? { status: candidate.status } : {}),
    ...(tags && !sameTags(tags, current.tags) ? { tags } : {}),
  };
}

export function useMediaQueries() {
  const [params, setParams] = useState<MediaSearchParams>(INITIAL_PARAMS);
  const paramsRef = useRef(INITIAL_PARAMS);
  const [items, setItems] = useState<MediaInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<MediaInfo | null>(null);
  const listRequestId = useRef(0);
  const mutationLocked = useRef(false);
  const [pendingMutation, setPendingMutation] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    selectedIdRef.current = null;
    setSelectedId(null);
    setDetail(null);
  }, []);

  const reload = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await searchMediaApi(paramsRef.current);
      if (requestId !== listRequestId.current) return undefined;
      setItems(next);
      if (selectedIdRef.current !== null) {
        const selected = next.find(({ id }) => id === selectedIdRef.current);
        if (selected) setDetail(selected);
        else clearSelection();
      }
      return next;
    } catch (caught) {
      if (requestId === listRequestId.current) setError(message(caught, "Unable to load Media."));
      return undefined;
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [clearSelection]);

  useEffect(() => { void reload(); }, [params, reload]);

  const select = (id: number) => {
    const selected = items.find((item) => item.id === id);
    if (!selected) return;
    selectedIdRef.current = id;
    setSelectedId(id);
    setDetail(selected);
  };

  const search = (category?: MediaCategory, status?: MediaStatus, titleLike?: string) => {
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { page: 0, size: paramsRef.current.size, category, status, titleLike: titleLike?.trim() || undefined };
    setParams(paramsRef.current);
  };

  const changePage = (page: number) => {
    clearSelection();
    listRequestId.current += 1;
    paramsRef.current = { ...paramsRef.current, page: Math.max(0, page) };
    setParams(paramsRef.current);
  };

  const mutate = async <T,>(key: string, request: () => Promise<T>, onResponse?: (result: T) => void, onReload?: (result: T, next: MediaInfo[]) => void): Promise<boolean> => {
    if (mutationLocked.current) return false;
    mutationLocked.current = true;
    setPendingMutation(key);
    setMutationError(null);
    try {
      const result = await request();
      onResponse?.(result);
      const next = await reload();
      if (!next) {
        setMutationError("Media changed, but the authoritative list could not be refreshed.");
        return false;
      }
      onReload?.(result, next);
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

  const create = (body: MediaCreateRequest) => mutate("create", () => createMediaApi(body), undefined, (created, next) => {
    const found = next.find(({ id }) => id === created.id);
    if (found) {
      selectedIdRef.current = found.id;
      setSelectedId(found.id);
      setDetail(found);
    }
  });

  const update = (id: number, candidate: MediaUpdateRequest) => {
    if (!detail || detail.id !== id) return Promise.resolve(false);
    const body = changedMediaFields(detail, candidate);
    if (Object.keys(body).length === 0) return Promise.resolve(false);
    return mutate(`update-${id}`, () => updateMediaApi(id, body), (updated) => {
      if (selectedIdRef.current === id) setDetail(updated);
    });
  };

  const remove = (id: number) => mutate(`delete-${id}`, () => deleteMediaApi(id), (deleted) => {
    if (selectedIdRef.current === deleted.id) clearSelection();
  });

  return { params, list: { items, loading, error, reload }, detail, selectedId, select, search, changePage, pendingMutation, mutationError, create, update, remove };
}
