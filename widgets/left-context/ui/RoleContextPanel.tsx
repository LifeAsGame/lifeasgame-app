"use client";

import type { RoleDetail } from "@/shared/api/types";
import { SwipeButton } from "@/features/role/RecordRow";

const cellStyle = { background: "var(--lag-control-bg)", border: "1px solid var(--lag-control-border)", borderRadius: "var(--lag-radius-sm)" } as const;

export function RoleBadges({ roles, selectedRoleId, onSelect }: { roles: RoleDetail[]; selectedRoleId?: number | null; onSelect?: (roleId: number) => void }) {
  return <div className="flex flex-wrap justify-center gap-2" aria-label="Roles">{roles.map((role) => <button key={role.id} type="button" aria-pressed={selectedRoleId === role.id}
    className="rounded-sm px-2.5 py-1.5 text-xs uppercase transition-opacity hover:opacity-80"
    style={{ ...cellStyle, background: selectedRoleId === role.id ? "var(--lag-selected-surface)" : "var(--lag-control-bg)", borderColor: selectedRoleId === role.id ? "var(--lag-focus)" : "var(--lag-control-border)", color: selectedRoleId === role.id ? "var(--lag-text)" : "var(--lag-text-2)", letterSpacing: "0.08em" }} onClick={() => onSelect?.(role.id)}>{role.name}</button>)}</div>;
}

export type RoleWorkspace = "persons" | "roles" | null;

export function RoleContextPanel({ workspace, onWorkspaceChange }: { workspace?: RoleWorkspace; onWorkspaceChange?: (workspace: RoleWorkspace, create?: boolean) => void }) {
  return <section className="lag-role-selector" data-role-selector aria-labelledby="role-selector-title">
    <header><p>인물 · 역할</p><h2 id="role-selector-title">관리 대상 선택</h2></header>
    <div className="lag-role-surface-grid" aria-label="인물 · 역할 선택">
      <SwipeButton creation className="lag-role-node" data-role-menu="persons" aria-pressed={workspace === "persons"} onClick={() => onWorkspaceChange?.("persons")} onDoubleClick={() => onWorkspaceChange?.("persons", true)}><span className="lag-role-node-mark" aria-hidden>인</span><strong>인물</strong><span aria-hidden>→</span></SwipeButton>
      <SwipeButton creation className="lag-role-node" data-role-menu="roles" aria-pressed={workspace === "roles"} onClick={() => onWorkspaceChange?.("roles")} onDoubleClick={() => onWorkspaceChange?.("roles", true)}><span className="lag-role-node-mark" aria-hidden>역</span><strong>역할</strong><span aria-hidden>→</span></SwipeButton>
    </div>
  </section>;
}
