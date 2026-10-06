"use client";

import { useIsPresent } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { RoleDetail } from "@/shared/api/types";
import { createRoleApi, updateRoleApi } from "./api";

export function formValue(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
export function formNullable(form: FormData, key: string) { return formValue(form, key) || null; }

export function RoleForm({ role, roles = [], templateType, onSaved, onCancel }: { role?: RoleDetail; roles?: RoleDetail[]; templateType?: "ROLE_BACKEND_DEVELOPER" | "ROLE_JOB_SEEKER"; onSaved: (saved: RoleDetail) => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const knownTypes = [...new Set(roles.filter((item) => item.status === "ACTIVE").map((item) => item.roleType))];
  const [typeChoice, setTypeChoice] = useState(templateType ?? (role && knownTypes.includes(role.roleType) ? role.roleType : "custom"));
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
      const saved = role ? await updateRoleApi(role.id, body) : await createRoleApi(body);
      if (active.current) await onSaved(saved);
    } catch (caught) { if (active.current) setError(caught instanceof Error ? caught.message : "역할을 저장하지 못했습니다."); }
    finally { locked.current = false; if (active.current) setPending(false); }
  }}>
    <label>역할 유형<select className="lag-role-control" autoFocus value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)}>
      <option value="custom">직접 입력</option>{templateType && !knownTypes.includes(templateType) ? <option value={templateType}>{templateType}</option> : null}
      {knownTypes.map((type) => <option key={type} value={type}>{type}</option>)}
    </select></label>
    {templateType ? <p>여정 전용 공식 역할 유형입니다. 저장할 때 {templateType} 코드를 유지합니다.</p> : null}
    {typeChoice === "custom" ? <label>직접 입력할 유형<input className="lag-role-control" name="roleType" required maxLength={40} defaultValue={role?.roleType ?? ""} /></label> : null}
    <label>역할 이름<input className="lag-role-control" name="name" required maxLength={80} defaultValue={role?.name ?? ""} /></label>
    <label>역할 설명<textarea className="lag-role-control" name="description" required maxLength={500} defaultValue={role?.description ?? ""} rows={4} /></label>
    {error ? <p role="alert" className="lag-role-feedback" data-state="error">{error}</p> : null}
    <div className="lag-role-actions">
      <button type="submit" disabled={pending} className="lag-role-action">{pending ? "저장 중…" : "역할 저장"}</button>
      {role ? <button type="button" className="lag-role-button" onClick={() => { active.current = false; onCancel(); }}>취소</button> : null}
    </div>
  </form>;
}
