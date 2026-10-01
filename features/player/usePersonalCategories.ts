"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPersonalCategoryApi, deletePersonalCategoryApi, listPersonalCategoriesApi, renamePersonalCategoryApi, systemCategories, type CategoryKind, type PersonalCategory } from "./personalCategories";

export function usePersonalCategories(kind: CategoryKind) {
  const [categories, setCategories] = useState<PersonalCategory[]>(() => systemCategories(kind));
  const [loading, setLoading] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null), [mutationError, setMutationError] = useState<string | null>(null);
  const request = useRef(0), locked = useRef(false);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError(null);
    try {
      const next = await listPersonalCategoriesApi(kind);
      if (id === request.current) setCategories(next);
      return next;
    } catch (caught) {
      if (id === request.current) { setCategories(systemCategories(kind)); setError(caught instanceof Error ? caught.message : "개인 분류를 조회하지 못했습니다."); }
      return null;
    } finally { if (id === request.current) setLoading(false); }
  }, [kind]);
  useEffect(() => { const counter = request; void reload(); return () => { counter.current++; }; }, [reload]);
  const mutate = async (operation: () => Promise<unknown>) => {
    if (locked.current) return false;
    locked.current = true; setPending(true); setMutationError(null);
    try {
      await operation();
      const next = await reload();
      if (!next) { setMutationError("분류가 변경됐지만 다시 조회하지 못했습니다. 서버 상태를 확인해 주세요."); return false; }
      return true;
    } catch (caught) {
      setMutationError(caught instanceof Error ? caught.message : "개인 분류를 변경하지 못했습니다.");
      return false;
    } finally { locked.current = false; setPending(false); }
  };
  const validName = (name: string) => { const trimmed = name.trim(); if (!trimmed || trimmed.length > 80) { setMutationError("분류 이름은 1~80자로 입력해주세요."); return null; } return trimmed; };
  return {
    categories, loading, pending, error, mutationError, reload,
    clearMutationError: () => setMutationError(null),
    create: (name: string) => { const value = validName(name); return value ? mutate(() => createPersonalCategoryApi(kind, value)) : Promise.resolve(false); },
    rename: (id: number, name: string) => { const value = validName(name); return value ? mutate(() => renamePersonalCategoryApi(kind, id, value)) : Promise.resolve(false); },
    remove: (id: number) => mutate(() => deletePersonalCategoryApi(kind, id)),
  };
}
