"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import type { PlayerInfo } from "@/lib/api/types";
import { SAO, PANEL_STYLE, GRID_OVERLAY_STYLE, INPUT_STYLE } from "@/lib/design/tokens";
import { FRIEND_MEMO_FORM_FIELDS } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import type { SocialContextData } from "@/lib/nav";
import { UI_CONSTS } from "@/lib/uiConsts";

import IconSlot from "./IconSlot";
import SaoAlert from "./SaoAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeftContextMode = "hidden" | "player" | "social";

export type FriendMemoData = {
  hobbies: string;
  favorites: string;
  birthday: string;
  closeness: string;
  firstMet: string;
  note: string;
};

type LeftContextProps = {
  mode: LeftContextMode;
  playerInfo?: PlayerInfo;
  socialContext: SocialContextData | null;
  selectedFriendId?: string | null;
  isFriendMode?: boolean;
  friendMemoByFollowId?: Record<string, FriendMemoData>;
  onFriendMemoUpdate?: (followId: string, memo: FriendMemoData) => void;
  onFriendAction?: (action: "message" | "gift" | "unfollow", followId: string) => void;
  zIndex?: number;
  onFocus?: () => void;
};

// ─── StatBar ─────────────────────────────────────────────────────────────────

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
        <span
          className="uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.18em", color: SAO.color.text.label }}
        >
          {label}
        </span>
        <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: SAO.color.text.label }}>
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div
        className="w-full"
        style={{ height: "6px", background: SAO.color.bar.track, borderRadius: "1px" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "1px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── PlayerPanel ─────────────────────────────────────────────────────────────

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

  const stats = [
    { label: "STR", value: str },
    { label: "AGI", value: agi },
    { label: "DEX", value: dex },
    { label: "INT", value: intel },
    { label: "VIT", value: vit },
    { label: "LUC", value: luc },
  ];
  const maxStatVal = Math.max(...stats.map((s) => s.value), 1);

  return (
    <div className="relative z-10 p-7">
      {/* Name & Job */}
      <div className="text-center">
        <h2
          className="font-semibold"
          style={{ fontSize: "2.25rem", letterSpacing: "0.08em", color: SAO.color.text.primary }}
        >
          {name}
        </h2>
        <p
          className="mt-1 uppercase"
          style={{ fontSize: "11px", letterSpacing: "0.22em", color: SAO.color.text.label }}
        >
          {job}
        </p>
        <div
          className="mx-auto mt-4"
          style={{
            width: "88%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)`,
          }}
        />
      </div>

      {/* EXP bar */}
      <div className="mt-4 px-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>
            EXP
          </span>
          <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: SAO.color.text.label, fontWeight: 600 }}>
            Lv.{level}
          </span>
        </div>
        <div style={{ height: "6px", background: SAO.color.bar.track, borderRadius: "1px", width: "100%" }}>
          <div
            style={{
              width: `${Math.min(100, Math.round(((exp % 10000) / 10000) * 100))}%`,
              height: "100%",
              background: `linear-gradient(90deg, rgba(248,197,78,0.85), rgba(234,168,40,0.85))`,
              borderRadius: "1px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* HP / MP bars */}
      <div className="mt-3 space-y-2.5 px-1">
        <StatBar label="HP" value={hp} max={hpMax} color={`linear-gradient(90deg, #f87171, ${SAO.color.bar.hp})`} />
        <StatBar label="MP" value={mp} max={mpMax} color={`linear-gradient(90deg, #60a5fa, ${SAO.color.bar.mp})`} />
      </div>

      {/* Stat grid 3×2 */}
      <div className="mt-8 grid grid-cols-3 gap-2 px-1">
        {stats.map((s) => {
          const isTop = s.value === maxStatVal;
          return (
            <div
              key={s.label}
              className="flex flex-col items-center py-2 px-1"
              style={{
                background: SAO.color.bg.inset,
                border: `1px solid ${isTop ? SAO.color.border.gold : "rgba(20,23,28,0.2)"}`,
                borderRadius: SAO.radius.panel,
              }}
            >
              <span
                className="uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}
              >
                {s.label}
              </span>
              <span
                className="mt-1 font-semibold"
                style={{
                  fontSize: "18px",
                  color: isTop ? SAO.color.action.gold : SAO.color.text.primary,
                  letterSpacing: "0.02em",
                }}
              >
                {s.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Extra info */}
      <div className="mt-6 space-y-2.5 px-1">
        <div
          className="rounded-sm px-4 py-3"
          style={{
            background: SAO.color.bg.inset,
            border: `1px solid rgba(20,23,28,0.2)`,
          }}
        >
          <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>
            Title
          </p>
          <p className="mt-0.5 text-sm font-medium" style={{ letterSpacing: "0.08em", color: SAO.color.text.primary }}>
            {playerInfo?.representativeTitleId ? "Black Swordsman" : "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "HP%", v: `${Math.round((hp / hpMax) * 100)}%` },
            { k: "MP%", v: `${Math.round((mp / mpMax) * 100)}%` },
          ].map(({ k, v }) => (
            <div
              key={k}
              className="rounded-sm px-3 py-2.5"
              style={{ background: SAO.color.bg.inset, border: `1px solid rgba(20,23,28,0.2)` }}
            >
              <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>{k}</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: SAO.color.text.primary }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FriendDetailPanel ────────────────────────────────────────────────────────

const CLOSENESS_LEVELS = ["지인", "친구", "절친", "소울메이트"] as const;

const EMPTY_MEMO: FriendMemoData = {
  hobbies: "",
  favorites: "",
  birthday: "",
  closeness: "친구",
  firstMet: "",
  note: "",
};

function ClosenessBar({ value }: { value: string }) {
  const idx = CLOSENESS_LEVELS.indexOf(value as typeof CLOSENESS_LEVELS[number]);
  const filled = idx >= 0 ? idx + 1 : 1;
  return (
    <div className="flex gap-1.5">
      {CLOSENESS_LEVELS.map((lvl, i) => (
        <div
          key={lvl}
          className="flex-1 rounded-sm"
          style={{
            height: "6px",
            background: i < filled ? SAO.color.action.gold : "rgba(20,23,28,0.15)",
            transition: "background 0.25s ease",
          }}
          title={lvl}
        />
      ))}
    </div>
  );
}

// ─── Tag chip helpers ─────────────────────────────────────────────────────────

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  background: "rgba(249,208,105,0.2)",
  border: "1px solid rgba(249,208,105,0.5)",
  borderRadius: "2px",
  padding: "2px 7px",
  fontSize: "11px",
  letterSpacing: "0.06em",
  color: SAO.color.text.primary,
} as const;

function TagChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const addTag = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || tags.includes(trimmed)) { setInputVal(""); return; }
    onChange([...tags, trimmed].join(", "));
    setInputVal("");
  };

  const removeTag = (tag: string) =>
    onChange(tags.filter((t) => t !== tag).join(", "));

  return (
    <div>
      {tags.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} style={chipStyle}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{ lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: SAO.color.text.label, fontSize: "12px", padding: "0 1px" }}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        placeholder={placeholder ?? "입력 후 Enter"}
        style={{ ...INPUT_STYLE, padding: "6px 10px" }}
      />
    </div>
  );
}

function TagChips({ value }: { value: string }) {
  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];
  if (tags.length === 0) return <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>—</span>;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {tags.map((tag) => <span key={tag} style={chipStyle}>{tag}</span>)}
    </div>
  );
}

function FriendDetailPanel({
  followId,
  socialContext,
  memo,
  onMemoUpdate,
  onAction,
}: {
  followId: string;
  socialContext: SocialContextData;
  memo: FriendMemoData | null;
  onMemoUpdate: (memo: FriendMemoData) => void;
  onAction: (action: "message" | "gift" | "unfollow") => void;
}) {
  const [tab, setTab] = useState<"info" | "memo">("info");
  const [editingMemo, setEditingMemo] = useState(false);
  const [draftMemo, setDraftMemo] = useState<FriendMemoData>(memo ?? EMPTY_MEMO);
  const [unfollowAlert, setUnfollowAlert] = useState(false);
  const [saveMemoAlert, setSaveMemoAlert] = useState(false);

  const [lastFollowId, setLastFollowId] = useState(followId);
  if (followId !== lastFollowId) {
    setLastFollowId(followId);
    setTab("info");
    setEditingMemo(false);
    setDraftMemo(memo ?? EMPTY_MEMO);
  }

  const cellStyle = {
    background: SAO.color.bg.inset,
    border: `1px solid rgba(20,23,28,0.2)`,
    borderRadius: SAO.radius.panel,
  };

  return (
    <div className="relative z-10 overflow-y-auto p-6" style={{ maxHeight: "min(80vh, 680px)" }}>
      {/* Avatar + name */}
      <div className="text-center">
        <div className="mx-auto mb-3 grid place-items-center">
          <IconSlot label={socialContext.title.slice(0, 2).toUpperCase()} size={72} active subtle />
        </div>
        <h2
          className="font-semibold"
          style={{ fontSize: "1.5rem", letterSpacing: "0.08em", color: SAO.color.text.primary }}
        >
          {socialContext.title}
        </h2>
        {socialContext.subtitle ? (
          <p className="mt-1" style={{ fontSize: "12px", letterSpacing: "0.18em", color: SAO.color.text.label }}>
            {socialContext.subtitle}
          </p>
        ) : null}
        <div
          className="mx-auto mt-3"
          style={{
            width: "88%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)`,
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-sm py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{
            border: `1px solid ${SAO.color.action.blue}60`,
            background: `${SAO.color.action.blue}18`,
            color: SAO.color.action.blue,
          }}
          onClick={() => onAction("message")}
        >
          메시지
        </button>
        <button
          type="button"
          className="flex-1 rounded-sm py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{
            border: `1px solid ${SAO.color.action.gold}90`,
            background: `${SAO.color.action.gold}20`,
            color: "#92600a",
          }}
          onClick={() => onAction("gift")}
        >
          선물
        </button>
        <button
          type="button"
          className="rounded-sm px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{
            border: `1px solid ${SAO.color.action.red}60`,
            background: `${SAO.color.action.red}12`,
            color: SAO.color.action.red,
          }}
          onClick={() => setUnfollowAlert(true)}
        >
          언팔
        </button>
      </div>

      {/* Tabs with animated underline */}
      <div
        className="relative mt-5 flex"
        style={{ borderBottom: `1px solid rgba(20,23,28,0.15)` }}
      >
        {(["info", "memo"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className="relative flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors"
            style={{ color: tab === id ? SAO.color.text.primary : SAO.color.text.label }}
            onClick={() => setTab(id)}
          >
            {id === "info" ? "기본 정보" : "나만의 기록"}
            {tab === id ? (
              <motion.div
                layoutId="friend-tab-underline"
                className="absolute bottom-[-1px] left-0 right-0"
                style={{ height: "2px", background: SAO.color.action.gold }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "info" ? (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className="mt-4 space-y-3"
          >
            <div className="rounded-sm px-4 py-3" style={cellStyle}>
              <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>
                Detail
              </p>
              <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.07em", color: SAO.color.text.primary }}>
                {socialContext.description}
              </p>
            </div>
            <div className="space-y-1.5">
              {socialContext.rows.map((row, i) => (
                <div
                  key={i}
                  className="flex min-h-9 items-center gap-3 rounded-sm px-3 py-2"
                  style={cellStyle}
                >
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: "6px", height: "6px", background: "rgba(20,23,28,0.5)" }}
                  />
                  <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>
                    {row}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="memo"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-4"
          >
            {editingMemo ? (
              <div className="space-y-3">
                {FRIEND_MEMO_FORM_FIELDS.map((f) => (
                  <div key={f.key}>
                    <p
                      className="mb-1 uppercase"
                      style={{ fontSize: "10px", letterSpacing: "0.16em", color: SAO.color.text.label }}
                    >
                      {f.label}
                    </p>
                    {f.type === "select" ? (
                      <>
                        <select
                          title={f.label}
                          value={draftMemo[f.key as keyof FriendMemoData]}
                          onChange={(e) =>
                            setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))
                          }
                          style={{ ...INPUT_STYLE, padding: "6px 10px" }}
                        >
                          {f.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {/* Closeness bar preview */}
                        <div className="mt-1.5">
                          <ClosenessBar value={draftMemo.closeness} />
                          <p className="mt-1 text-center" style={{ fontSize: "10px", color: SAO.color.text.label }}>
                            {draftMemo.closeness}
                          </p>
                        </div>
                      </>
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={draftMemo[f.key as keyof FriendMemoData]}
                        onChange={(e) =>
                          setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={f.placeholder}
                        rows={3}
                        style={{ ...INPUT_STYLE, resize: "vertical", minHeight: "72px" }}
                      />
                    ) : (f.key === "hobbies" || f.key === "favorites") ? (
                      <TagChipInput
                        value={draftMemo[f.key as keyof FriendMemoData]}
                        onChange={(val) => setDraftMemo((prev) => ({ ...prev, [f.key]: val }))}
                        placeholder={f.placeholder}
                      />
                    ) : (
                      <input
                        type={f.type}
                        value={draftMemo[f.key as keyof FriendMemoData]}
                        onChange={(e) =>
                          setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={f.placeholder}
                        style={{ ...INPUT_STYLE, padding: "6px 10px" }}
                      />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 rounded-sm py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                    style={{
                      border: `1px solid ${SAO.color.action.gold}70`,
                      background: `${SAO.color.action.gold}22`,
                      color: "#7a4f00",
                    }}
                    onClick={() => setSaveMemoAlert(true)}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className="rounded-sm px-4 py-2 text-xs tracking-[0.1em] transition-opacity hover:opacity-80"
                    style={cellStyle as React.CSSProperties}
                    onClick={() => {
                      setDraftMemo(memo ?? EMPTY_MEMO);
                      setEditingMemo(false);
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {[
                  { label: "취미", value: memo?.hobbies || "—" },
                  { label: "좋아하는 것", value: memo?.favorites || "—" },
                  { label: "생일", value: memo?.birthday || "—" },
                  { label: "친한 정도", value: memo?.closeness || "친구", isCloseness: true },
                  { label: "처음 만난 날", value: memo?.firstMet || "—" },
                  { label: "메모", value: memo?.note || "—" },
                ].map(({ label, value, isCloseness }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1.5 rounded-sm px-3 py-2"
                    style={cellStyle}
                  >
                    <span
                      className="uppercase"
                      style={{ fontSize: "10px", letterSpacing: "0.14em", color: SAO.color.text.label }}
                    >
                      {label}
                    </span>
                    {isCloseness ? (
                      <>
                        <ClosenessBar value={value} />
                        <span className="text-xs" style={{ color: SAO.color.text.primary, letterSpacing: "0.06em" }}>
                          {value}
                        </span>
                      </>
                    ) : (label === "취미" || label === "좋아하는 것") ? (
                      <TagChips value={value === "—" ? "" : value} />
                    ) : (
                      <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>
                        {value}
                      </span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 w-full rounded-sm py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
                  style={cellStyle as React.CSSProperties}
                  onClick={() => setEditingMemo(true)}
                >
                  기록 수정
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SaoAlert
        isOpen={unfollowAlert}
        title="언팔로우"
        message={`${socialContext.title}님을 언팔로우하시겠습니까?`}
        onConfirm={() => {
          setUnfollowAlert(false);
          onAction("unfollow");
        }}
        onCancel={() => setUnfollowAlert(false)}
      />
      <SaoAlert
        isOpen={saveMemoAlert}
        title="기록 저장"
        message="나만의 기록을 저장하시겠습니까?"
        onConfirm={() => {
          setSaveMemoAlert(false);
          onMemoUpdate(draftMemo);
          setEditingMemo(false);
        }}
        onCancel={() => setSaveMemoAlert(false)}
      />
    </div>
  );
}

// ─── SocialPanel ──────────────────────────────────────────────────────────────

function SocialPanel({
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
    border: `1px solid rgba(20,23,28,0.2)`,
    borderRadius: SAO.radius.panel,
  };

  return (
    <div className="relative z-10 p-7">
      <div className="text-center">
        <p
          className="uppercase"
          style={{ fontSize: "11px", letterSpacing: "0.24em", color: SAO.color.text.label }}
        >
          SOCIAL CONTEXT
        </p>
        <h2
          className="mt-2 font-semibold"
          style={{ fontSize: "1.875rem", letterSpacing: "0.08em", color: SAO.color.text.primary }}
        >
          {socialContext?.categoryLabel ?? "Social"}
        </h2>
        <div
          className="mx-auto mt-5"
          style={{
            width: "88%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)`,
          }}
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
                <span
                  className="rounded-full flex-shrink-0"
                  style={{ width: "6px", height: "6px", background: "rgba(20,23,28,0.4)" }}
                />
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

// ─── LeftContext ──────────────────────────────────────────────────────────────

export default function LeftContext({
  mode,
  playerInfo,
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
            background: "linear-gradient(180deg, rgba(251,252,254,0.98), rgba(242,245,250,0.97))",
            border: "1px solid rgba(20,23,28,0.65)",
            width: UI_CONSTS.leftContext.width,
            minHeight: UI_CONSTS.leftContext.minHeight,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.6), 0 20px 48px rgba(0,0,0,0.32)`,
            willChange: "transform, opacity",
            zIndex,
          }}
        >
          <div style={GRID_OVERLAY_STYLE} />
          {mode === "player" ? (
            <PlayerPanel playerInfo={playerInfo} />
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
