"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { EquipmentView, PlayerInfo, RoleDetail } from "@/shared/api/types";
import { PANEL_STYLE, GRID_OVERLAY_STYLE } from "@/shared/design/tokens";
import { MOTION } from "@/shared/lib/motion";
import type { SocialContextData } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import { PlayerPanel } from "./ui/PlayerPanel";
import { SocialPanel } from "./ui/SocialPanel";
import { RoleContextPanel } from "./ui/RoleContextPanel";

type LeftContextMode = "hidden" | "player" | "role" | "social";

type LeftContextProps = {
  mode: LeftContextMode;
  playerInfo?: PlayerInfo;
  equipments?: EquipmentView[];
  guildName?: string;
  roles?: RoleDetail[];
  rolesLoading?: boolean;
  rolesError?: string | null;
  selectedRoleId?: number | null;
  socialContext: SocialContextData | null;
  onRoleSelect?: (roleId: number) => void;
  zIndex?: number;
  onFocus?: () => void;
};

export default function LeftContext({
  mode,
  playerInfo,
  equipments,
  guildName,
  roles = [],
  rolesLoading,
  rolesError,
  selectedRoleId,
  socialContext,
  onRoleSelect,
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
          className="relative h-full min-h-[420px] overflow-hidden border"
          onPointerDownCapture={onFocus}
          style={{
            ...PANEL_STYLE,
            width: UI_CONSTS.leftContext.width,
            minHeight: UI_CONSTS.leftContext.minHeight,
            willChange: "transform, opacity",
            zIndex,
            borderRadius: "6px",
          }}
        >
          <div style={GRID_OVERLAY_STYLE} />

          {/* Corner L-bracket ornaments */}
          {[
            { top: 4, left: 4, borderTop: "1.5px solid rgba(218,178,55,0.60)", borderLeft: "1.5px solid rgba(218,178,55,0.60)" },
            { top: 4, right: 4, borderTop: "1.5px solid rgba(218,178,55,0.60)", borderRight: "1.5px solid rgba(218,178,55,0.60)" },
            { bottom: 4, left: 4, borderBottom: "1.5px solid rgba(218,178,55,0.60)", borderLeft: "1.5px solid rgba(218,178,55,0.60)" },
            { bottom: 4, right: 4, borderBottom: "1.5px solid rgba(218,178,55,0.60)", borderRight: "1.5px solid rgba(218,178,55,0.60)" },
          ].map((c, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 14, height: 14, pointerEvents: "none", zIndex: 30, ...c }} />
          ))}

          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: "1px",
              zIndex: 20,
              background: "linear-gradient(90deg, transparent 5%, rgba(218,178,55,0.72) 35%, rgba(218,178,55,0.72) 65%, transparent 95%)",
              pointerEvents: "none",
            }}
          />
          {mode === "player" ? (
            <PlayerPanel playerInfo={playerInfo} equipments={equipments} guildName={guildName} roles={roles} selectedRoleId={selectedRoleId} onRoleSelect={onRoleSelect} />
          ) : mode === "role" ? (
            <RoleContextPanel
              roles={roles}
              selectedRoleId={selectedRoleId ?? null}
              isLoading={rolesLoading}
              error={rolesError}
              onRoleSelect={onRoleSelect}
            />
          ) : (
            <SocialPanel socialContext={socialContext} />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
