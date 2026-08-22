"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import type { EquipmentView, PlayerInfo, RoleDetail } from "@/shared/api/types";
import { MOCK_EQUIPPED_ITEMS } from "@/features/player/mock";
import { RoleBadges } from "./RoleContextPanel";

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em", color: "var(--lag-text-2)" }}>
          {label}
        </span>
        <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--lag-text-2)" }}>
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="w-full" style={{ height: "6px", background: "color-mix(in srgb, var(--lag-divider) 72%, transparent)", borderRadius: "1px" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "1px",
            transition: "width 0.5s ease",
            boxShadow: "0 0 8px color-mix(in srgb, var(--lag-focus) 36%, transparent)",
          }}
        />
      </div>
    </div>
  );
}

export function PlayerPanel({
  playerInfo,
  equipments,
  guildName,
  roles = [],
  selectedRoleId,
  onRoleSelect,
}: {
  playerInfo?: PlayerInfo;
  equipments?: EquipmentView[];
  guildName?: string;
  roles?: RoleDetail[];
  selectedRoleId?: number | null;
  onRoleSelect?: (roleId: number) => void;
}) {
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const name = playerInfo?.name ?? "Player";
  const gender = playerInfo?.gender === "MALE" ? "Male" : playerInfo?.gender === "FEMALE" ? "Female" : (playerInfo?.gender ?? "");
  const job = playerInfo?.job ?? "Adventurer";
  const level = playerInfo?.level ?? 1;
  const exp = playerInfo?.exp ?? 0;
  const hp = playerInfo?.currentHealth ?? 0;
  const hpMax = playerInfo?.healthCapacity ?? 1;
  const mp = playerInfo?.currentMana ?? 0;
  const mpMax = playerInfo?.manaCapacity ?? 1;

  const stats = [
    { label: "STR", value: playerInfo?.str ?? 0 },
    { label: "AGI", value: playerInfo?.agi ?? 0 },
    { label: "DEX", value: playerInfo?.dex ?? 0 },
    { label: "INT", value: playerInfo?.intel ?? 0 },
    { label: "VIT", value: playerInfo?.vit ?? 0 },
    { label: "LUC", value: playerInfo?.luc ?? 0 },
  ];
  const maxStatVal = Math.max(...stats.map((s) => s.value), 1);
  const extraStats = playerInfo?.extraStats ?? {};

  const equipByCat = (equipments ?? []).reduce<Record<string, EquipmentView[]>>((acc, slot) => {
    if (!acc[slot.slotCategory]) acc[slot.slotCategory] = [];
    acc[slot.slotCategory].push(slot);
    return acc;
  }, {});

  const statCellStyle = {
    background: "var(--lag-muted-surface)",
    border: "1px solid var(--lag-divider)",
    borderRadius: "var(--lag-radius-sm)",
  };

  return (
    <div className="relative">
      <div className="p-7">
        {/* Identity header */}
        <div className="text-center">
          <h2 className="font-semibold" style={{ fontSize: "2.25rem", letterSpacing: "0.08em", color: "var(--lag-text)" }}>
            {name}
          </h2>
          <p className="mt-0.5 uppercase" style={{ fontSize: "11px", letterSpacing: "0.22em", color: "var(--lag-text-2)" }}>
            {[gender, guildName].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 uppercase" style={{ fontSize: "11px", letterSpacing: "0.22em", color: "var(--lag-text-2)" }}>
            Lv.{level} {job}
          </p>
          <div
            className="mx-auto mt-4"
            style={{ width: "88%", height: "1px", background: "linear-gradient(90deg, transparent, var(--lag-divider), transparent)" }}
          />
        </div>

        {roles.length > 0 ? (
          <div className="mt-4 px-1">
            <p className="mb-2 text-center uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>Roles</p>
            <RoleBadges roles={roles} selectedRoleId={selectedRoleId} onSelect={onRoleSelect} />
          </div>
        ) : null}

        {/* EXP bar */}
        <div className="mt-4 px-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>EXP</span>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "var(--lag-text-2)", fontWeight: 600 }}>
              {exp.toLocaleString()} xp
            </span>
          </div>
          <div style={{ height: "6px", background: "color-mix(in srgb, var(--lag-divider) 72%, transparent)", borderRadius: "1px" }}>
            <div
              style={{
                width: `${Math.min(100, Math.round(((exp % 10000) / 10000) * 100))}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--lag-amber), var(--lag-warning))",
                borderRadius: "1px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* HP / MP bars */}
        <div className="mt-3 space-y-2.5 px-1">
          <StatBar label="HP" value={hp} max={hpMax} color="linear-gradient(90deg, var(--lag-warning), var(--lag-error))" />
          <StatBar label="MP" value={mp} max={mpMax} color="linear-gradient(90deg, var(--lag-cyan), var(--lag-focus))" />
        </div>

        {/* Stat grid 3×2 */}
        <div className="mt-6 grid grid-cols-3 gap-2 px-1">
          {stats.map((s) => {
            const isTop = s.value === maxStatVal;
            return (
              <div
                key={s.label}
                className="flex flex-col items-center px-1 py-2"
                style={{
                  ...statCellStyle,
                  border: `1px solid ${isTop ? "var(--lag-focus)" : "var(--lag-divider)"}`,
                }}
              >
                <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>
                  {s.label}
                </span>
                <span
                  className="mt-1 font-semibold"
                  style={{ fontSize: "18px", letterSpacing: "0.02em", color: isTop ? "var(--lag-focus)" : "var(--lag-text)" }}
                >
                  {s.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Extra stats */}
        {Object.keys(extraStats).length > 0 ? (
          <div className="mt-4 space-y-1 px-1">
            {Object.entries(extraStats).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-sm px-3 py-1.5" style={statCellStyle}>
                <span className="text-xs uppercase" style={{ letterSpacing: "0.12em", color: "var(--lag-text-2)" }}>{k}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--lag-text)" }}>{v}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Equipment section */}
        {Object.keys(equipByCat).length > 0 ? (
          <div className="mt-6 px-1">
            <p className="mb-2 uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>
              Equipment
            </p>
            <div className="space-y-3">
              {Object.entries(equipByCat).map(([cat, slots]) => (
                <div key={cat}>
                  <p className="mb-1 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em", color: "var(--lag-text-2)", opacity: 0.7 }}>
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {slots.map((slot) => {
                      const item = slot.itemInstanceId ? MOCK_EQUIPPED_ITEMS[slot.itemInstanceId] : null;
                      const isSelected = selectedSlotId === slot.slotId;
                      return (
                        <div key={slot.slotId}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setSelectedSlotId((prev) => prev === slot.slotId ? null : slot.slotId)}
                          >
                            <div
                              className="flex items-center gap-2 rounded-sm px-3 py-2 transition-colors"
                              style={{
                                background: isSelected ? "var(--lag-selected-surface)" : "var(--lag-control-bg)",
                                border: `1px solid ${isSelected ? "var(--lag-focus)" : "var(--lag-control-border)"}`,
                                borderRadius: "var(--lag-radius-sm)",
                              }}
                            >
                              <span
                                className="uppercase"
                                style={{ fontSize: "9px", letterSpacing: "0.14em", color: "var(--lag-text-2)", flexShrink: 0, width: 56 }}
                              >
                                {slot.slotName}
                              </span>
                              <span
                                className="min-w-0 flex-1 truncate text-sm"
                                style={{ color: item ? "var(--lag-text)" : "var(--lag-meta)", fontStyle: item ? "normal" : "italic" }}
                              >
                                {item ? item.name : "Empty"}
                              </span>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isSelected && item ? (
                              <motion.div
                                key={`slot-detail-${slot.slotId}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="mt-1 rounded-sm px-3 py-2 space-y-0.5"
                                  style={{
                                    background: "var(--lag-selected-surface)",
                                    border: "1px solid var(--lag-focus)",
                                    borderRadius: "var(--lag-radius-sm)",
                                  }}
                                >
                                  {[
                                    { k: "Code",     v: item.code },
                                    { k: "Name",     v: item.name },
                                    { k: "Category", v: item.category },
                                    { k: "Role",     v: item.role },
                                    { k: "Equipped", v: item.equippedAt },
                                  ].map(({ k, v }) => (
                                    <div key={k} className="flex items-center gap-2">
                                      <span className="uppercase" style={{ fontSize: "9px", letterSpacing: "0.14em", color: "var(--lag-text-2)", width: 54, flexShrink: 0 }}>{k}</span>
                                      <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--lag-text)" }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
