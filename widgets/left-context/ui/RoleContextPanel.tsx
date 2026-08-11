"use client";

import { SOCIAL_LISTS } from "@/features/social/model";
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
  selectedFriendId,
  onRoleSelect,
  onFriendSelect,
  onFriendAction,
}: {
  roles: RoleDetail[];
  selectedRoleId: number | null;
  isLoading?: boolean;
  error?: string | null;
  selectedFriendId?: string | null;
  onRoleSelect?: (roleId: number) => void;
  onFriendSelect?: (followId: string) => void;
  onFriendAction?: (action: "message" | "gift" | "unfollow", followId: string) => void;
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

      <div className="my-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)` }} />

      <section aria-labelledby="following-heading">
        <h3 id="following-heading" className="mb-3 text-center uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: SAO.color.text.label }}>Following</h3>
        <div className="space-y-2">
          {SOCIAL_LISTS.friend.map((friend) => (
            <div key={friend.id} className="flex items-center gap-2 rounded-sm px-3 py-2" style={{ ...cellStyle, borderColor: selectedFriendId === friend.id ? SAO.color.border.gold : SAO.color.border.panel }}>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onFriendSelect?.(friend.id)}>
                <span className="block truncate text-sm font-semibold" style={{ color: SAO.color.text.primary }}>{friend.label}</span>
                <span className="block truncate text-xs" style={{ color: SAO.color.text.label }}>{friend.subtitle}</span>
              </button>
              <button type="button" className="rounded-sm px-2 py-1 text-xs uppercase" style={{ border: `1px solid ${SAO.color.border.gold}`, color: SAO.color.action.gold }} onClick={() => onFriendAction?.("message", friend.id)}>
                Message
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
