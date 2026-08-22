"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { EquipmentView, PlayerInfo, RoleDetail } from "@/shared/api/types";
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
  const reducedMotion = useReducedMotion();
  return (
    <div className={`lag-left-anchor${mode === "hidden" ? " lag-left-anchor-empty" : ""}`}>
      <AnimatePresence initial={false}>
        {mode !== "hidden" ? (
        <motion.div
          key={`left-context-${mode}`}
          initial={reducedMotion ? false : MOTION.panelReset.initial}
          animate={MOTION.panelReset.animate}
          exit={reducedMotion ? { opacity: 0 } : MOTION.panelReset.exit}
          transition={reducedMotion ? { duration: 0 } : MOTION.panelReset.transition}
          className="lag-left-context lag-panel-stage relative overflow-hidden"
          data-stage-key={`left-context-${mode}`}
          onPointerDownCapture={onFocus}
          style={{
            width: UI_CONSTS.leftContext.width,
            willChange: "transform, opacity",
            zIndex,
          }}
        >
          <div className="lag-left-context-grid pointer-events-none absolute inset-0 opacity-40" />

          {/* Corner L-bracket ornaments */}
          {[
            { top: 4, left: 4, borderTop: "1.5px solid var(--lag-focus)", borderLeft: "1.5px solid var(--lag-focus)" },
            { top: 4, right: 4, borderTop: "1.5px solid var(--lag-focus)", borderRight: "1.5px solid var(--lag-focus)" },
            { bottom: 4, left: 4, borderBottom: "1.5px solid var(--lag-focus)", borderLeft: "1.5px solid var(--lag-focus)" },
            { bottom: 4, right: 4, borderBottom: "1.5px solid var(--lag-focus)", borderRight: "1.5px solid var(--lag-focus)" },
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
              background: "linear-gradient(90deg, transparent 5%, var(--lag-focus) 35%, var(--lag-focus) 65%, transparent 95%)",
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
    </div>
  );
}
