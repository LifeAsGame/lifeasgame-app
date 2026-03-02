"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { PlayerInfo } from "@/lib/api/types";
import { MOTION } from "@/lib/motion";
import type { SocialContextData } from "@/lib/nav";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";

type LeftContextMode = "hidden" | "player" | "social";

type LeftContextProps = {
  mode: LeftContextMode;
  playerInfo?: PlayerInfo;
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

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-300/50">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function PlayerPanel({ playerInfo }: { playerInfo?: PlayerInfo }) {
  const name = playerInfo?.name ?? "Player";
  const job = playerInfo?.job ?? "Adventurer";
  const level = playerInfo?.level ?? 1;
  const exp = playerInfo?.exp ?? 0;
  const hp = playerInfo?.currentHealth ?? 0;
  const hpMax = playerInfo?.healthCapacity ?? 1;
  const mp = playerInfo?.currentMana ?? 0;
  const mpMax = playerInfo?.manaCapacity ?? 1;
  const str = playerInfo?.str ?? 0;
  const agi = playerInfo?.agi ?? 0;
  const dex = playerInfo?.dex ?? 0;
  const intel = playerInfo?.intel ?? 0;
  const vit = playerInfo?.vit ?? 0;
  const luc = playerInfo?.luc ?? 0;

  const leftStats = [
    { label: "STR", value: str },
    { label: "AGI", value: agi },
    { label: "DEX", value: dex },
  ];
  const rightStats = [
    { label: "INT", value: intel },
    { label: "VIT", value: vit },
    { label: "LUC", value: luc },
  ];

  return (
    <div className="relative z-10 p-7">
      {/* Name + job */}
      <div className="text-center">
        <h2 className="text-4xl font-semibold tracking-[0.08em] text-zinc-700">{name}</h2>
        <p className="mt-1 text-xs tracking-[0.22em] text-zinc-500 uppercase">{job}</p>
        <div className="mx-auto mt-4 h-px w-[88%] bg-zinc-600/75" />
      </div>

      {/* Level + EXP bar */}
      <div className="mt-4 px-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">EXP</span>
          <span className="text-[11px] font-semibold tracking-[0.1em] text-zinc-600">
            Lv.{level}
          </span>
        </div>
        <StatBar
          value={exp % 10000}
          max={10000}
          color="linear-gradient(90deg, rgba(248,197,78,0.85), rgba(234,168,40,0.85))"
        />
      </div>

      {/* HP + MP bars */}
      <div className="mt-3 space-y-2 px-1">
        <div>
          <div className="mb-0.5 flex justify-between">
            <span className="text-[10px] tracking-[0.18em] text-zinc-500">HP</span>
            <span className="text-[10px] text-zinc-500">
              {hp.toLocaleString()} / {hpMax.toLocaleString()}
            </span>
          </div>
          <StatBar value={hp} max={hpMax} color="linear-gradient(90deg, #f87171, #ef4444)" />
        </div>
        <div>
          <div className="mb-0.5 flex justify-between">
            <span className="text-[10px] tracking-[0.18em] text-zinc-500">MP</span>
            <span className="text-[10px] text-zinc-500">
              {mp.toLocaleString()} / {mpMax.toLocaleString()}
            </span>
          </div>
          <StatBar value={mp} max={mpMax} color="linear-gradient(90deg, #60a5fa, #3b82f6)" />
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left stats */}
        <div className="space-y-4">
          {leftStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <IconSlot label={s.label.slice(0, 1)} size={28} subtle />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="h-px flex-1 bg-zinc-500/50" />
                <span className="text-right text-[10px] tracking-[0.1em] text-zinc-500">
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Center avatar */}
        <div className="relative mx-2 grid place-items-center">
          <div className="absolute inset-[-28px] rounded-full bg-zinc-700/10 blur-2xl" />
          <IconSlot label="PL" size={118} active subtle />
        </div>

        {/* Right stats */}
        <div className="space-y-4">
          {rightStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[10px] tracking-[0.1em] text-zinc-500">{s.value}</span>
                <div className="h-px flex-1 bg-zinc-500/50" />
              </div>
              <IconSlot label={s.label.slice(0, 1)} size={28} subtle />
            </div>
          ))}
        </div>
      </div>

      {/* Status rows */}
      <div className="mt-8 space-y-3">
        <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-4 py-3">
          <p className="text-xs tracking-[0.2em] text-zinc-600 uppercase">Title</p>
          <p className="mt-0.5 text-sm font-medium tracking-[0.08em] text-zinc-700">
            {playerInfo?.representativeTitleId ? "Black Swordsman" : "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-3 py-2.5">
            <p className="text-[10px] tracking-[0.2em] text-zinc-600 uppercase">HP%</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-700">
              {Math.round((hp / hpMax) * 100)}%
            </p>
          </div>
          <div className="rounded-sm border border-zinc-700/45 bg-white/35 px-3 py-2.5">
            <p className="text-[10px] tracking-[0.2em] text-zinc-600 uppercase">MP%</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-700">
              {Math.round((mp / mpMax) * 100)}%
            </p>
          </div>
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

export default function LeftContext({ mode, playerInfo, socialContext, zIndex, onFocus }: LeftContextProps) {
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
          {mode === "player" ? (
            <PlayerPanel playerInfo={playerInfo} />
          ) : (
            <SocialPanel socialContext={socialContext} />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
