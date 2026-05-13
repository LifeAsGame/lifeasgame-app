"use client";

import { SAO } from "@/shared/design/tokens";
import type { SocialContextData } from "@/entities/nav";

import { FriendDetailPanel, type FriendMemoData } from "./FriendDetailPanel";

export function SocialPanel({
  socialContext,
  isFriendMode,
  selectedFriendId,
  friendMemoByFollowId,
  onFriendMemoUpdate,
  onFriendAction,
}: {
  socialContext: SocialContextData | null;
  isFriendMode?: boolean;
  selectedFriendId?: string | null;
  friendMemoByFollowId?: Record<string, FriendMemoData>;
  onFriendMemoUpdate?: (followId: string, memo: FriendMemoData) => void;
  onFriendAction?: (action: "message" | "gift" | "unfollow", followId: string) => void;
}) {
  if (isFriendMode && selectedFriendId && socialContext) {
    return (
      <FriendDetailPanel
        followId={selectedFriendId}
        socialContext={socialContext}
        memo={friendMemoByFollowId?.[selectedFriendId] ?? null}
        onMemoUpdate={(memo) => onFriendMemoUpdate?.(selectedFriendId, memo)}
        onAction={(action) => onFriendAction?.(action, selectedFriendId)}
      />
    );
  }

  const cellStyle = {
    background: SAO.color.bg.inset,
    border: `1px solid rgba(0,0,0,0.08)`,
    borderRadius: SAO.radius.panel,
  };

  return (
    <div className="relative z-10 p-7">
      <div className="text-center">
        <p className="uppercase" style={{ fontSize: "11px", letterSpacing: "0.24em", color: SAO.color.text.label }}>
          SOCIAL CONTEXT
        </p>
        <h2 className="mt-2 font-semibold" style={{ fontSize: "1.875rem", letterSpacing: "0.08em", color: SAO.color.text.primary }}>
          {socialContext?.categoryLabel ?? "Social"}
        </h2>
        <div
          className="mx-auto mt-5"
          style={{ width: "88%", height: "1px", background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)` }}
        />
      </div>

      {socialContext ? (
        <div className="mt-8 space-y-3">
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>TARGET</p>
            <p className="mt-1 break-words text-lg font-semibold" style={{ letterSpacing: "0.08em", color: SAO.color.text.primary }}>
              {socialContext.title}
            </p>
            {socialContext.subtitle ? (
              <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.08em", color: SAO.color.text.secondary }}>
                {socialContext.subtitle}
              </p>
            ) : null}
          </div>
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>DETAIL</p>
            <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.07em", color: SAO.color.text.primary }}>
              {socialContext.description}
            </p>
          </div>
          <div className="space-y-1.5">
            {socialContext.rows.map((row, index) => (
              <div
                key={`social-context-row-${index}`}
                className="flex min-h-10 items-center gap-3 rounded-sm px-3 py-2"
                style={cellStyle}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: "6px", height: "6px", background: SAO.color.action.gold }} />
                <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-2.5">
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>INFO</p>
            <p className="mt-1 text-sm" style={{ letterSpacing: "0.07em", color: SAO.color.text.primary }}>
              Select a party, guild, or friend from the social list to load context here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
