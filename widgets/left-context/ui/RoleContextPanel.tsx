"use client";

import { useEffect, useRef, useState } from "react";
import type { RoleDetail } from "@/shared/api/types";
import { archiveRoleApi } from "@/features/role/api";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import { RoleForm } from "@/features/role/RoleForm";

const cellStyle = { background: "var(--lag-control-bg)", border: "1px solid var(--lag-control-border)", borderRadius: "var(--lag-radius-sm)" } as const;

export function RoleBadges({ roles, selectedRoleId, onSelect }: { roles: RoleDetail[]; selectedRoleId?: number | null; onSelect?: (roleId: number) => void }) {
  return <div className="flex flex-wrap justify-center gap-2" aria-label="Roles">{roles.map((role) => <button key={role.id} type="button" aria-pressed={selectedRoleId === role.id}
    className="rounded-sm px-2.5 py-1.5 text-xs uppercase transition-opacity hover:opacity-80"
    style={{ ...cellStyle, background: selectedRoleId === role.id ? "var(--lag-selected-surface)" : "var(--lag-control-bg)", borderColor: selectedRoleId === role.id ? "var(--lag-focus)" : "var(--lag-control-border)", color: selectedRoleId === role.id ? "var(--lag-text)" : "var(--lag-text-2)", letterSpacing: "0.08em" }} onClick={() => onSelect?.(role.id)}>{role.name}</button>)}</div>;
}

export type RoleWorkspace = "persons" | "roles" | null;

export function RoleContextPanel({ roles, selectedRoleId, isLoading, error, onRoleSelect, onRetry, workspace = "roles", onWorkspaceChange, onRoleEdit, onRefresh, onRoleArchived }: {
  roles: RoleDetail[]; selectedRoleId: number | null; isLoading?: boolean; error?: string | null;
  onRoleSelect?: (roleId: number) => void; onRetry?: () => void;
  workspace?: RoleWorkspace; onWorkspaceChange?: (workspace: RoleWorkspace, create?: boolean) => void;
  onRoleEdit?: (roleId: number) => void; onRefresh?: () => Promise<void>; onRoleArchived?: (roleId: number) => void;
}) {
  const [creating, setCreating] = useState(false), [pending, setPending] = useState(false), [actionError, setActionError] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null), generation = useRef(0), lock = useRef(false);
  const restore = useRef<{ target: HTMLElement | null; scroll: HTMLElement | null; top: number }>({ target: null, scroll: null, top: 0 });
  useEffect(() => { const counter = generation; counter.current++; return () => { counter.current++; }; }, [workspace]);
  const openCreate = () => {
    const scroll = root.current?.closest<HTMLElement>(".lag-left-context-content") ?? null;
    restore.current = { target: document.activeElement instanceof HTMLElement ? document.activeElement : null, scroll, top: scroll?.scrollTop ?? 0 };
    onWorkspaceChange?.("roles"); setCreating(true); setActionError(null);
  };
  const closeCreate = () => {
    generation.current++; setCreating(false); setActionError(null);
    requestAnimationFrame(() => { const { target, scroll, top } = restore.current; if (scroll) scroll.scrollTop = top; (target?.isConnected ? target : root.current?.querySelector<HTMLElement>('[data-role-menu="roles"]'))?.focus({ preventScroll: true }); });
  };
  const archive = async (role: RoleDetail) => {
    if (lock.current || !window.confirm(`역할 “${role.name}”을 보관할까요? 인물과 다른 역할의 관계는 유지됩니다.`)) return;
    const id = generation.current; lock.current = true; setPending(true); setActionError(null);
    try { await archiveRoleApi(role.id); await onRefresh?.(); if (id === generation.current) onRoleArchived?.(role.id); }
    catch (caught) { if (id === generation.current) setActionError(caught instanceof Error ? caught.message : "역할을 보관하지 못했습니다."); }
    finally { lock.current = false; setPending(false); }
  };
  return <section ref={root} className="lag-role-selector" data-role-selector aria-labelledby="role-selector-title">
    <header><p>인물 · 역할</p><h2 id="role-selector-title">{creating && workspace === "roles" ? "역할 등록" : workspace === "roles" ? "내 역할 목록" : "관리 대상 선택"}</h2></header>
    <div className="lag-role-surface-grid" aria-label="인물 · 역할 선택">
      <SwipeButton className="lag-role-node" data-role-menu="persons" aria-pressed={workspace === "persons"} onClick={() => onWorkspaceChange?.("persons")} onSwipeLeft={() => onWorkspaceChange?.("persons", true)}><span className="lag-role-node-mark" aria-hidden>인</span><strong>인물</strong><span aria-hidden>→</span></SwipeButton>
      <SwipeButton className="lag-role-node" data-role-menu="roles" aria-pressed={workspace === "roles"} onClick={() => { generation.current++; setCreating(false); onWorkspaceChange?.("roles"); }} onSwipeLeft={openCreate}><span className="lag-role-node-mark" aria-hidden>역</span><strong>역할</strong><span aria-hidden>→</span></SwipeButton>
    </div>
    {workspace === "roles" ? <>
      <div hidden={creating}>
        <div className="lag-role-selector-state">
          {isLoading ? <p role="status">역할을 불러오는 중…</p> : null}
          {error ? <div><p role="alert">{error}</p>{onRetry ? <button type="button" className="lag-role-button" onClick={onRetry}>다시 조회</button> : null}</div> : null}
          {!isLoading && !error && roles.length === 0 ? <p>등록된 역할이 없습니다.</p> : null}
          {actionError ? <p role="alert">{actionError}</p> : null}
        </div>
        <div className="lag-role-node-list" aria-label="내 역할 목록">{roles.map((role) => <div key={role.id} data-role-id={role.id}><RecordRow title={role.name} subtitle={`${role.roleType} · ${role.status}`} selected={selectedRoleId === role.id} disabled={pending} onSelect={() => onRoleSelect?.(role.id)} onEdit={() => onRoleEdit?.(role.id)} onArchive={() => void archive(role)} /></div>)}</div>
        <button type="button" className="lag-role-create" onClick={openCreate}>역할 추가</button>
      </div>
      {creating ? <RoleForm onCancel={closeCreate} onSaved={async () => { const id = generation.current; await onRefresh?.(); if (id === generation.current) closeCreate(); }} /> : null}
    </> : null}
  </section>;
}
