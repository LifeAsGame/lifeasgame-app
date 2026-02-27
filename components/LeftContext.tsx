"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { SocialContextData } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";

type LeftContextMode = "hidden" | "player" | "social";

type LeftContextProps = {
  mode: LeftContextMode;
  socialContext: SocialContextData | null;
  zIndex?: number;
  onFocus?: () => void;
};

function frameStyle(zIndex?: number) {
  return {
    width: UI_CONSTS.leftContext.width,
    minHeight: UI_CONSTS.leftContext.minHeight,
    borderColor: "rgba(203, 211, 221, 0.3)",
    background: "linear-gradient(180deg, rgba(238,241,245,0.96), rgba(223,228,236,0.94))",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55), 0 20px 40px rgba(0,0,0,0.28)",
    willChange: "transform, opacity",
    zIndex,
  } as const;
}

function PlayerPanel() {
  return (
    <div className="relative z-10 p-7">
      <div className="text-center">
        <h2 className="text-4xl font-semibold tracking-[0.08em] text-zinc-700">Kirito</h2>
        <div className="mx-auto mt-5 h-px w-[88%] bg-zinc-600/75" />
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="space-y-4">
          {["HP", "LV", "STR", "AGI"].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <IconSlot label={row.slice(0, 1)} size={28} subtle />
              <div className="h-px flex-1 bg-zinc-500/70" />
            </div>
          ))}
        </div>

        <div className="relative mx-2 grid place-items-center">
          <div className="absolute inset-[-28px] rounded-full bg-zinc-700/10 blur-2xl" />
          <IconSlot label="PL" size={118} active subtle />
        </div>

        <div className="space-y-4">
          {["DEF", "CRI", "DEX", "LUK"].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-500/70" />
              <IconSlot label={row.slice(0, 1)} size={28} subtle />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
          <p className="text-xs tracking-[0.2em] text-zinc-600">LOCATION</p>
          <p className="text-lg font-medium tracking-[0.08em] text-zinc-700">Town of Beginnings</p>
        </div>
        <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
          <p className="text-xs tracking-[0.2em] text-zinc-600">STATUS</p>
          <p className="text-lg font-medium tracking-[0.08em] text-zinc-700">Solo / Safe Zone</p>
        </div>
      </div>
    </div>
  );
}

function SocialPanel({ socialContext }: { socialContext: SocialContextData | null }) {
  return (
    <div className="relative z-10 p-7">
      <div className="text-center">
        <p className="text-xs tracking-[0.24em] text-zinc-600">SOCIAL CONTEXT</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[0.08em] text-zinc-700">
          {socialContext?.categoryLabel ?? "Social"}
        </h2>
        <div className="mx-auto mt-5 h-px w-[88%] bg-zinc-600/75" />
      </div>

      {socialContext ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-zinc-600">TARGET</p>
            <p className="mt-1 break-words text-lg font-semibold tracking-[0.08em] text-zinc-700">
              {socialContext.title}
            </p>
            {socialContext.subtitle ? (
              <p className="mt-1 break-words text-sm tracking-[0.08em] text-zinc-700/85">
                {socialContext.subtitle}
              </p>
            ) : null}
          </div>
          <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-zinc-600">DETAIL</p>
            <p className="mt-1 break-words text-sm tracking-[0.07em] text-zinc-700">
              {socialContext.description}
            </p>
          </div>
          <div className="space-y-2">
            {socialContext.rows.map((row, index) => (
              <div
                key={`social-context-row-${index}`}
                className="flex min-h-10 items-center gap-3 rounded-sm border border-zinc-700/35 bg-white/32 px-3 py-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700/70" />
                <span className="break-words text-sm tracking-[0.06em] text-zinc-700">{row}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-zinc-600">INFO</p>
            <p className="mt-1 text-sm tracking-[0.07em] text-zinc-700">
              Select a party, guild, or friend from the social list to load context here.
            </p>
          </div>
          <div className="rounded-sm border border-zinc-700/35 bg-white/30 px-3 py-2 text-sm tracking-[0.06em] text-zinc-700">
            Right-side social detail panel is disabled by design.
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeftContext({ mode, socialContext, zIndex, onFocus }: LeftContextProps) {
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
          style={frameStyle(zIndex)}
        >
          <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:24px_24px]" />
          {mode === "player" ? <PlayerPanel /> : <SocialPanel socialContext={socialContext} />}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
