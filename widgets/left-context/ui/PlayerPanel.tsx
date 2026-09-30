"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import type { EquipmentView, PlayerInfo, RoleDetail } from "@/shared/api/types";
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
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
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
  loading,
  error,
  roles = [],
  selectedRoleId,
  onRoleSelect,
  onRetry,
}: {
  playerInfo?: PlayerInfo;
  equipments?: EquipmentView[];
  loading?: boolean;
  error?: string | null;
  roles?: RoleDetail[];
  selectedRoleId?: number | null;
  onRoleSelect?: (roleId: number) => void;
  onRetry?: () => void;
}) {
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  if (!playerInfo) {
    return (
      <div className="space-y-3 p-7">
        {loading ? <p role="status" style={{ color: "var(--lag-text-2)" }}>플레이어 요약을 불러오는 중…</p> : null}
        {error ? <p role="alert" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
        {!loading && !error ? <p style={{ color: "var(--lag-text-2)" }}>플레이어 요약을 확인할 수 없습니다.</p> : null}
        {error && onRetry ? <button type="button" className="lag-button-secondary" onClick={onRetry}>다시 조회</button> : null}
      </div>
    );
  }

  const name = playerInfo.name;
  const gender = playerInfo.gender === "MALE" ? "남성" : playerInfo.gender === "FEMALE" ? "여성" : playerInfo.gender;
  const job = playerInfo.job;
  const level = playerInfo.level;
  const exp = playerInfo.exp;
  const hp = playerInfo.currentHealth;
  const hpMax = playerInfo.healthCapacity;
  const mp = playerInfo.currentMana;
  const mpMax = playerInfo.manaCapacity;

  const stats = [
    { label: "STR", value: playerInfo.str },
    { label: "AGI", value: playerInfo.agi },
    { label: "DEX", value: playerInfo.dex },
    { label: "INT", value: playerInfo.intel },
    { label: "VIT", value: playerInfo.vit },
    { label: "LUC", value: playerInfo.luc },
  ];
  const maxStatVal = Math.max(...stats.map((s) => s.value), 1);
  const extraStats = playerInfo.extraStats;

  const equipByCode = (equipments ?? []).reduce<Record<string, EquipmentView[]>>((acc, slot) => {
    if (!acc[slot.slotCode]) acc[slot.slotCode] = [];
    acc[slot.slotCode].push(slot);
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
        {error ? (
          <div className="lag-info-card mb-4 flex items-center justify-between gap-3 px-3 py-2">
            <p role="alert" className="lag-state-error text-xs">{error}</p>
            {onRetry ? <button type="button" className="lag-button-secondary px-3 py-2 text-xs" onClick={onRetry}>다시 조회</button> : null}
          </div>
        ) : null}
        {/* Identity header */}
        <div className="text-left">
          <h2 className="font-semibold" style={{ fontSize: "1.5rem", color: "var(--lag-text)" }}>
            {name}
          </h2>
          <p className="mt-0.5" style={{ fontSize: "12px", color: "var(--lag-text-2)" }}>
            {gender}
          </p>
          <p className="mt-1" style={{ fontSize: "12px", color: "var(--lag-text-2)" }}>
            레벨 {level} · {job}
          </p>
          <div
            className="mx-auto mt-4"
            style={{ width: "88%", height: "1px", background: "linear-gradient(90deg, transparent, var(--lag-divider), transparent)" }}
          />
        </div>

        {roles.length > 0 ? (
          <div className="mt-4 px-1">
            <p className="mb-2 text-left" style={{ fontSize: 12, color: "var(--lag-text-2)" }}>역할</p>
            <RoleBadges roles={roles} selectedRoleId={selectedRoleId} onSelect={onRoleSelect} />
          </div>
        ) : null}

        {/* EXP bar */}
        <div className="mt-4 px-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>누적 경험치</span>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: "var(--lag-text-2)", fontWeight: 600 }}>
              {exp.toLocaleString()} xp
            </span>
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
        {Object.keys(equipByCode).length > 0 ? (
          <div className="mt-6 px-1">
            <p className="mb-2 uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>
              장비
            </p>
            <div className="space-y-3">
              {Object.entries(equipByCode).map(([slotCode, slots]) => (
                <div key={slotCode}>
                  <p className="mb-1 uppercase" style={{ fontSize: "9px", letterSpacing: "0.18em", color: "var(--lag-text-2)", opacity: 0.7 }}>
                    {slotCode}
                  </p>
                  <div className="space-y-1">
                    {slots.map((slot) => {
                      const equipped = slot.itemInstanceId !== null;
                      const isSelected = selectedSlotId === slot.slotId;
                      return (
                        <div key={slot.slotId}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setSelectedSlotId((prev) => prev === slot.slotId ? null : slot.slotId)}
                            aria-expanded={isSelected}
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
                                style={{ color: equipped ? "var(--lag-text)" : "var(--lag-meta)", fontStyle: equipped ? "normal" : "italic" }}
                              >
                                {equipped ? `장착됨 · 아이템 #${slot.itemInstanceId}` : "비어 있음"}
                              </span>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isSelected ? (
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
                                    { k: "코드",    v: slot.slotCode },
                                    ...(slot.slotCategory ? [{ k: "분류", v: slot.slotCategory }] : []),
                                    ...(slot.slotRole ? [{ k: "역할", v: slot.slotRole }] : []),
                                    { k: "아이템 번호", v: slot.itemInstanceId === null ? "비어 있음" : String(slot.itemInstanceId) },
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
