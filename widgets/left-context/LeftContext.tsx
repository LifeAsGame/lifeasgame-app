"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { EquipmentView, PlayerInfo } from "@/shared/api/types";
import { PANEL_STYLE, GRID_OVERLAY_STYLE } from "@/shared/design/tokens";
import { MOTION } from "@/shared/lib/motion";
import type { SocialContextData } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import { PlayerPanel } from "./ui/PlayerPanel";
import { SocialPanel } from "./ui/SocialPanel";
import { type FriendMemoData } from "./ui/FriendDetailPanel";

export type { FriendMemoData };

type LeftContextMode = "hidden" | "player" | "social";

type LeftContextProps = {
  mode: LeftContextMode;
  playerInfo?: PlayerInfo;
  equipments?: EquipmentView[];
  guildName?: string;
  socialContext: SocialContextData | null;
  selectedFriendId?: string | null;
  isFriendMode?: boolean;
  friendMemoByFollowId?: Record<string, FriendMemoData>;
  onFriendMemoUpdate?: (followId: string, memo: FriendMemoData) => void;
  onFriendAction?: (action: "message" | "gift" | "unfollow", followId: string) => void;
  zIndex?: number;
  onFocus?: () => void;
};

export default function LeftContext({
  mode,
  playerInfo,
  equipments,
  guildName,
  socialContext,
  selectedFriendId,
  isFriendMode,
  friendMemoByFollowId,
  onFriendMemoUpdate,
  onFriendAction,
  zIndex,
  onFocus,
}: LeftContextProps) {
  return (
    <AnimatePresence initial={false}>
      {mode !== "hidden" ? (
        <motion.div
          key={`left-context-${mode}`}
          initial={MOTION.panelReset.initial}
          animate={MOTION.panelReset.animate}
          exit={MOTION.panelReset.exit}
          transition={MOTION.panelReset.transition}
          className="relative h-full min-h-[420px] overflow-hidden rounded-sm border"
          onPointerDownCapture={onFocus}
          style={{
            ...PANEL_STYLE,
            width: UI_CONSTS.leftContext.width,
            minHeight: UI_CONSTS.leftContext.minHeight,
            willChange: "transform, opacity",
            zIndex,
          }}
        >
          <div style={GRID_OVERLAY_STYLE} />
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "1px",
              zIndex: 20,
              background: "linear-gradient(90deg, transparent 5%, rgba(248,197,78,0.55) 35%, rgba(248,197,78,0.55) 65%, transparent 95%)",
              pointerEvents: "none",
            }}
          />
          {mode === "player" ? (
            <PlayerPanel playerInfo={playerInfo} equipments={equipments} guildName={guildName} />
          ) : (
            <SocialPanel
              socialContext={socialContext}
              isFriendMode={isFriendMode}
              selectedFriendId={selectedFriendId}
              friendMemoByFollowId={friendMemoByFollowId}
              onFriendMemoUpdate={onFriendMemoUpdate}
              onFriendAction={onFriendAction}
            />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
