"use client";

import { AnimatePresence, motion } from "framer-motion";

import { MOTION } from "@/lib/motion";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";

type LeftContextProps = {
  active: boolean;
  isResetting?: boolean;
};

export default function LeftContext({ active, isResetting = false }: LeftContextProps) {
  const showPlayerContext = active && !isResetting;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {showPlayerContext ? (
        <motion.div
          key="left-context-player"
          initial={MOTION.panelReset.initial}
          animate={MOTION.panelReset.animate}
          exit={MOTION.panelReset.exit}
          transition={MOTION.panelReset.transition}
          className="relative h-full min-h-[420px] overflow-hidden rounded-sm border"
          style={{
            width: UI_CONSTS.leftContext.width,
            minHeight: UI_CONSTS.leftContext.minHeight,
            borderColor: "rgba(203, 211, 221, 0.3)",
            background:
              "linear-gradient(180deg, rgba(238,241,245,0.96), rgba(223,228,236,0.94))",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.55), 0 20px 40px rgba(0,0,0,0.28)",
            willChange: "transform, opacity",
          }}
        >
          <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:24px_24px]" />
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
                <p className="text-lg font-medium tracking-[0.08em] text-zinc-700">
                  Town of Beginnings
                </p>
              </div>
              <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
                <p className="text-xs tracking-[0.2em] text-zinc-600">STATUS</p>
                <p className="text-lg font-medium tracking-[0.08em] text-zinc-700">
                  Solo / Safe Zone
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
