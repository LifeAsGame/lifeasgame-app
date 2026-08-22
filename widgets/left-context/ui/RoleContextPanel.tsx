"use client";

import Link from "next/link";

import type { RoleDetail } from "@/shared/api/types";

const cellStyle = {
  background: "var(--lag-control-bg)",
  border: "1px solid var(--lag-control-border)",
  borderRadius: "var(--lag-radius-sm)",
} as const;

export function RoleBadges({ roles, selectedRoleId, onSelect }: { roles: RoleDetail[]; selectedRoleId?: number | null; onSelect?: (roleId: number) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="Roles">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          aria-pressed={selectedRoleId === role.id}
          className="rounded-sm px-2.5 py-1.5 text-xs uppercase transition-opacity hover:opacity-80"
          style={{
            ...cellStyle,
            background: selectedRoleId === role.id ? "var(--lag-selected-surface)" : "var(--lag-control-bg)",
            borderColor: selectedRoleId === role.id ? "var(--lag-focus)" : "var(--lag-control-border)",
            color: selectedRoleId === role.id ? "var(--lag-text)" : "var(--lag-text-2)",
            letterSpacing: "0.08em",
          }}
          onClick={() => onSelect?.(role.id)}
        >
          {role.name}
        </button>
      ))}
    </div>
  );
}

export function RoleContextPanel({
  roles,
  selectedRoleId,
  isLoading,
  error,
  onRoleSelect,
  onRetry,
}: {
  roles: RoleDetail[];
  selectedRoleId: number | null;
  isLoading?: boolean;
  error?: string | null;
  onRoleSelect?: (roleId: number) => void;
  onRetry?: () => void;
}) {
  return (
    <section className="lag-role-selector" data-role-selector aria-labelledby="role-selector-title">
      <header>
        <p>Role context</p>
        <h2 id="role-selector-title">Role Nodes</h2>
        <span>Select one Role before choosing a deeper surface.</span>
      </header>

      <div className="lag-role-selector-state">
        {isLoading ? <p role="status">Loading Roles...</p> : null}
        {error ? (
          <div>
            <p role="alert">{error}</p>
            {onRetry ? <button type="button" className="lag-role-button" onClick={onRetry}>Retry</button> : null}
          </div>
        ) : null}
        {!isLoading && !error && roles.length === 0 ? <p>No Roles yet.</p> : null}
      </div>

      <div className="lag-role-node-list" aria-label="Role Nodes">
        {roles.map((role) => {
          const selected = selectedRoleId === role.id;
          return (
            <button key={role.id} type="button" className="lag-role-node" aria-pressed={selected} data-selected={selected} onClick={() => onRoleSelect?.(role.id)}>
              <span className="lag-role-node-mark" aria-hidden>{role.name.trim().charAt(0).toUpperCase() || role.roleType.charAt(0).toUpperCase()}</span>
              <span><strong>{role.name}</strong><small>{role.roleType} · {role.status}</small></span>
              <span aria-hidden>→</span>
            </button>
          );
        })}
      </div>

      <Link href="/roles/create" className="lag-role-create">Create Role</Link>
    </section>
  );
}
