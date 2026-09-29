"use client";

import { useIsPresent } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { RoleDetail } from "@/shared/api/types";
import { createRoleApi, updateRoleApi } from "./api";

export function formValue(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
export function formNullable(form: FormData, key: string) { return formValue(form, key) || null; }

export function RoleForm({ role, onSaved, onCancel }: { role?: RoleDetail; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const present = useIsPresent();
  const active = useRef(true), locked = useRef(false);
  useEffect(() => { active.current = present; return () => { active.current = false; }; }, [present]);
  return <form className="lag-role-form" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); active.current = false; onCancel(); } }} onSubmit={async (event) => {
    event.preventDefault(); if (locked.current) return;
    const form = new FormData(event.currentTarget);
    const body = { roleType: formValue(form, "roleType"), name: formValue(form, "name"), description: formValue(form, "description") };
    if (!body.roleType || !body.name || !body.description) { setError("역할 유형·이름·설명을 입력해주세요."); return; }
    locked.current = true; setPending(true); setError(null);
    try {
      if (role) await updateRoleApi(role.id, body); else await createRoleApi(body);
      if (active.current) await onSaved();
    } catch (caught) { if (active.current) setError(caught instanceof Error ? caught.message : "역할을 저장하지 못했습니다."); }
    finally { locked.current = false; if (active.current) setPending(false); }
  }}>
    <label>역할 유형<input className="lag-role-control" name="roleType" autoFocus required defaultValue={role?.roleType ?? ""} /></label>
    <label>역할 이름<input className="lag-role-control" name="name" required defaultValue={role?.name ?? ""} /></label>
    <label>역할 설명<textarea className="lag-role-control" name="description" required defaultValue={role?.description ?? ""} rows={4} /></label>
    {error ? <p role="alert" className="lag-role-feedback" data-state="error">{error}</p> : null}
    <div className="lag-role-actions">
      <button type="submit" disabled={pending} className="lag-role-action">{pending ? "저장 중…" : role ? "역할 저장" : "역할 등록"}</button>
      <button type="button" className="lag-role-button" onClick={() => { active.current = false; onCancel(); }}>취소</button>
    </div>
  </form>;
}
