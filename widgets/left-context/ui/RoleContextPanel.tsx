"use client";

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
}: {
  roles: RoleDetail[];
  selectedRoleId: number | null;
  isLoading?: boolean;
  error?: string | null;
  onRoleSelect?: (roleId: number) => void;
}) {
  return (
    <div className="relative p-7">
      <div className="text-center">
        <p className="uppercase" style={{ fontSize: 11, letterSpacing: "0.24em", color: "var(--lag-text-2)" }}>ROLE CONTEXT</p>
        <h2 className="mt-2 text-2xl font-semibold" style={{ letterSpacing: "0.08em", color: "var(--lag-text)" }}>My Roles</h2>
      </div>

      <div className="mt-5">
        {isLoading ? <p className="text-center text-sm" style={{ color: "var(--lag-text-2)" }}>Loading Roles...</p> : null}
        {error ? <p role="alert" className="text-center text-xs" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
        {!isLoading && !error && roles.length === 0 ? <p className="text-center text-sm" style={{ color: "var(--lag-text-2)" }}>No Roles yet.</p> : null}
        <RoleBadges roles={roles} selectedRoleId={selectedRoleId} onSelect={onRoleSelect} />
      </div>
    </div>
  );
}
