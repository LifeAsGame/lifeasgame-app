"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { SAO, INPUT_STYLE } from "@/shared/design/tokens";
import { FRIEND_MEMO_FORM_FIELDS } from "@/features/player/model";
import type { SocialContextData } from "@/entities/nav";

import IconSlot from "@/shared/ui/IconSlot";
import SaoAlert from "@/shared/ui/SaoAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FriendMemoData = {
  hobbies: string;
  favorites: string;
  birthday: string;
  closeness: string;
  firstMet: string;
  note: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSENESS_LEVELS = ["지인", "친구", "절친", "소울메이트"] as const;

export const EMPTY_MEMO: FriendMemoData = {
  hobbies: "",
  favorites: "",
  birthday: "",
  closeness: "친구",
  firstMet: "",
  note: "",
};

// ─── Private helpers ──────────────────────────────────────────────────────────

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
            background: i < filled ? SAO.color.action.gold : "rgba(0,25,65,0.60)",
            transition: "background 0.25s ease",
          }}
          title={lvl}
        />
      ))}
    </div>
  );
}

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

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag).join(", "));

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
  if (tags.length === 0) {
    return <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>—</span>;
  }
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {tags.map((tag) => <span key={tag} style={chipStyle}>{tag}</span>)}
    </div>
  );
}

// ─── FriendDetailPanel ────────────────────────────────────────────────────────

export function FriendDetailPanel({
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
    border: `1px solid rgba(0,0,0,0.08)`,
    borderRadius: SAO.radius.panel,
  };

  return (
    <div className="relative z-10 overflow-y-auto p-6" style={{ maxHeight: "min(80vh, 680px)" }}>
      {/* Avatar + name */}
      <div className="text-center">
        <div className="mx-auto mb-3 grid place-items-center">
          <IconSlot label={socialContext.title.slice(0, 2).toUpperCase()} size={72} active subtle />
        </div>
        <h2 className="font-semibold" style={{ fontSize: "1.5rem", letterSpacing: "0.08em", color: SAO.color.text.primary }}>
          {socialContext.title}
        </h2>
        {socialContext.subtitle ? (
          <p className="mt-1" style={{ fontSize: "12px", letterSpacing: "0.18em", color: SAO.color.text.label }}>
            {socialContext.subtitle}
          </p>
        ) : null}
        <div
          className="mx-auto mt-3"
          style={{ width: "88%", height: "1px", background: `linear-gradient(90deg, transparent, ${SAO.color.border.panel}, transparent)` }}
        />
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-sm py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{ border: `1px solid ${SAO.color.action.blue}60`, background: `${SAO.color.action.blue}18`, color: SAO.color.action.blue }}
          onClick={() => onAction("message")}
        >
          메시지
        </button>
        <button
          type="button"
          className="flex-1 rounded-sm py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{ border: `1px solid ${SAO.color.action.gold}90`, background: `${SAO.color.action.gold}20`, color: SAO.color.text.gold }}
          onClick={() => onAction("gift")}
        >
          선물
        </button>
        <button
          type="button"
          className="rounded-sm px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
          style={{ border: `1px solid ${SAO.color.action.red}60`, background: `${SAO.color.action.red}12`, color: SAO.color.action.red }}
          onClick={() => setUnfollowAlert(true)}
        >
          언팔
        </button>
      </div>

      {/* Tabs */}
      <div className="relative mt-5 flex" style={{ borderBottom: `1px solid rgba(0,25,65,0.60)` }}>
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
              <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label }}>Detail</p>
              <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.07em", color: SAO.color.text.primary }}>
                {socialContext.description}
              </p>
            </div>
            <div className="space-y-1.5">
              {socialContext.rows.map((row, i) => (
                <div key={i} className="flex min-h-9 items-center gap-3 rounded-sm px-3 py-2" style={cellStyle}>
                  <span className="rounded-full flex-shrink-0" style={{ width: "6px", height: "6px", background: SAO.color.action.gold }} />
                  <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>{row}</span>
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
                    <p className="mb-1 uppercase" style={{ fontSize: "10px", letterSpacing: "0.16em", color: SAO.color.text.label }}>
                      {f.label}
                    </p>
                    {f.type === "select" ? (
                      <>
                        <select
                          title={f.label}
                          value={draftMemo[f.key as keyof FriendMemoData]}
                          onChange={(e) => setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ ...INPUT_STYLE, padding: "6px 10px" }}
                        >
                          {f.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
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
                        onChange={(e) => setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
                        onChange={(e) => setDraftMemo((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
                    style={{ border: `1px solid ${SAO.color.action.gold}70`, background: `${SAO.color.action.gold}22`, color: "#7a4f00" }}
                    onClick={() => setSaveMemoAlert(true)}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className="rounded-sm px-4 py-2 text-xs tracking-[0.1em] transition-opacity hover:opacity-80"
                    style={cellStyle as React.CSSProperties}
                    onClick={() => { setDraftMemo(memo ?? EMPTY_MEMO); setEditingMemo(false); }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {[
                  { label: "취미",       value: memo?.hobbies   || "—" },
                  { label: "좋아하는 것", value: memo?.favorites || "—" },
                  { label: "생일",       value: memo?.birthday  || "—" },
                  { label: "친한 정도",  value: memo?.closeness || "친구", isCloseness: true },
                  { label: "처음 만난 날", value: memo?.firstMet || "—" },
                  { label: "메모",       value: memo?.note      || "—" },
                ].map(({ label, value, isCloseness }) => (
                  <div key={label} className="flex flex-col gap-1.5 rounded-sm px-3 py-2" style={cellStyle}>
                    <span className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.14em", color: SAO.color.text.label }}>
                      {label}
                    </span>
                    {isCloseness ? (
                      <>
                        <ClosenessBar value={value} />
                        <span className="text-xs" style={{ color: SAO.color.text.primary, letterSpacing: "0.06em" }}>{value}</span>
                      </>
                    ) : (label === "취미" || label === "좋아하는 것") ? (
                      <TagChips value={value === "—" ? "" : value} />
                    ) : (
                      <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}>{value}</span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 w-full rounded-sm py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-75"
                  style={{ ...(cellStyle as React.CSSProperties), color: SAO.color.text.secondary }}
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
        onConfirm={() => { setUnfollowAlert(false); onAction("unfollow"); }}
        onCancel={() => setUnfollowAlert(false)}
      />
      <SaoAlert
        isOpen={saveMemoAlert}
        title="기록 저장"
        message="나만의 기록을 저장하시겠습니까?"
        onConfirm={() => { setSaveMemoAlert(false); onMemoUpdate(draftMemo); setEditingMemo(false); }}
        onCancel={() => setSaveMemoAlert(false)}
      />
    </div>
  );
}
