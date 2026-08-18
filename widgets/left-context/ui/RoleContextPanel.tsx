"use client";

import type { RoleDetail } from "@/shared/api/types";
import { SAO } from "@/shared/design/tokens";

const cellStyle = {
  background: SAO.color.bg.inset,
  border: `1px solid ${SAO.color.border.panel}`,
  borderRadius: SAO.radius.panel,
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
            borderColor: selectedRoleId === role.id ? SAO.color.border.gold : SAO.color.border.panel,
            color: selectedRoleId === role.id ? SAO.color.action.gold : SAO.color.text.secondary,
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
    <div className="relative z-10 overflow-y-auto p-7 scrollbar-hide" style={{ maxHeight: "100%" }}>
      <div className="text-center">
        <p className="uppercase" style={{ fontSize: 11, letterSpacing: "0.24em", color: SAO.color.text.label }}>ROLE CONTEXT</p>
        <h2 className="mt-2 text-2xl font-semibold" style={{ letterSpacing: "0.08em", color: SAO.color.text.primary }}>My Roles</h2>
      </div>

      <div className="mt-5">
        {isLoading ? <p className="text-center text-sm" style={{ color: SAO.color.text.secondary }}>Loading Roles...</p> : null}
        {error ? <p role="alert" className="text-center text-xs" style={{ color: SAO.color.action.red }}>{error}</p> : null}
        {!isLoading && !error && roles.length === 0 ? <p className="text-center text-sm" style={{ color: SAO.color.text.secondary }}>No Roles yet.</p> : null}
        <RoleBadges roles={roles} selectedRoleId={selectedRoleId} onSelect={onRoleSelect} />
      </div>
    </div>
  );
}
