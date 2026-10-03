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
  const [typeChoice, setTypeChoice] = useState(["ROLE_BACKEND_DEVELOPER", "ROLE_JOB_SEEKER"].includes(role?.roleType ?? "") ? role!.roleType : "custom");
  const present = useIsPresent();
  const active = useRef(true), locked = useRef(false);
  useEffect(() => { active.current = present; return () => { active.current = false; }; }, [present]);
  return <form className="lag-role-form" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); active.current = false; onCancel(); } }} onSubmit={async (event) => {
    event.preventDefault(); if (locked.current) return;
    const form = new FormData(event.currentTarget);
    const body = { roleType: typeChoice === "custom" ? formValue(form, "roleType") : typeChoice, name: formValue(form, "name"), description: formValue(form, "description") };
    if (!body.roleType || !body.name || !body.description) { setError("역할 유형·이름·설명을 입력해주세요."); return; }
    locked.current = true; setPending(true); setError(null);
    try {
      if (role) await updateRoleApi(role.id, body); else await createRoleApi(body);
      if (active.current) await onSaved();
    } catch (caught) { if (active.current) setError(caught instanceof Error ? caught.message : "역할을 저장하지 못했습니다."); }
    finally { locked.current = false; if (active.current) setPending(false); }
  }}>
    <label>역할 유형<select className="lag-role-control" autoFocus value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)}>
      <option value="custom">직접 입력</option><option value="ROLE_BACKEND_DEVELOPER">백엔드 개발자</option><option value="ROLE_JOB_SEEKER">취업 준비</option>
    </select></label>
    {typeChoice === "custom" ? <label>직접 입력할 유형<input className="lag-role-control" name="roleType" required defaultValue={role?.roleType ?? ""} /></label> : null}
    <label>역할 이름<input className="lag-role-control" name="name" required defaultValue={role?.name ?? ""} /></label>
    <label>역할 설명<textarea className="lag-role-control" name="description" required defaultValue={role?.description ?? ""} rows={4} /></label>
    {error ? <p role="alert" className="lag-role-feedback" data-state="error">{error}</p> : null}
    <div className="lag-role-actions">
      <button type="submit" disabled={pending} className="lag-role-action">{pending ? "저장 중…" : "역할 저장"}</button>
      {role ? <button type="button" className="lag-role-button" onClick={() => { active.current = false; onCancel(); }}>취소</button> : null}
    </div>
  </form>;
}
