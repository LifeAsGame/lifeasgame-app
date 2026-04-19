"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

import { MOCK_CHAT_HISTORY } from "@/features/social/chat.mock";
import { SAO, INPUT_STYLE, GOLD_BTN_STYLE, SAO_ICON } from "@/shared/design/tokens";
import type { FormFieldSpec, MainNavId, PanelStackItem } from "@/entities/nav";
import { MOTION } from "@/shared/lib/motion";
import { reorderToCenter } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import SaoAlert from "@/shared/ui/SaoAlert";
import EdgeFadeScrollArea from "@/shared/ui/EdgeFadeScrollArea";
import PanelCard from "@/shared/ui/PanelCard";

type RightPanelsProps = {
  selectedMain: MainNavId;
  panelStack: PanelStackItem[];
  panelStackKey: string;
  onPanelFocus?: (panelIndex: number, panelId: string) => void;
  getPanelZIndex?: (panelIndex: number, panelId: string) => number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  onPanelItemAction?: (panelIndex: number, itemId: string, actionType: string) => void;
  /** Double-click/tap on a list item → open edit form */
  onPanelItemDoubleClick?: (panelIndex: number, itemId: string) => void;
  onPanelFormSubmit?: (formKey: string, values: Record<string, string>) => void;
  onPanelFormFieldChange?: (formKey: string, fieldKey: string, value: string) => void;
  onPanelBack?: (panelIndex: number) => void;
  onPanelActionClick?: (panelIndex: number) => void;
};

// ─── Shared styles (light-panel context) ─────────────────────────────────────

// ─── 다크 홀로그램 패널 프레임 ────────────────────────────────────────────────
// SAO 애니메이션 UI 기준: 깊은 네이비 + 시안 엣지 + 깊이에 따른 투명도 조절
function getFrameStyle(depth: number) {
  const bg =
    depth === 0
      ? "linear-gradient(155deg, rgba(5,10,28,0.93), rgba(4,8,22,0.91))"
      : depth === 1
      ? "linear-gradient(155deg, rgba(4,8,24,0.91), rgba(3,6,18,0.89))"
      : "linear-gradient(155deg, rgba(3,6,18,0.89), rgba(2,5,15,0.87))";

  const borderAlpha = depth === 0 ? 0.32 : depth === 1 ? 0.24 : 0.18;
  const glowAlpha   = depth === 0 ? 0.14 : depth === 1 ? 0.08 : 0.05;

  return {
    background: bg,
    border: `1px solid rgba(0,190,255,${borderAlpha})`,
    boxShadow: [
      `inset 0 0 0 1px rgba(0,190,255,0.06)`,
      `0 0 0 1px rgba(0,160,255,${glowAlpha})`,
      `0 14px 40px rgba(0,0,0,0.60)`,
      `0 0 30px rgba(0,130,255,${Math.max(glowAlpha - 0.04, 0.01)})`,
    ].join(", "),
    borderRadius: SAO.radius.panel,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

// 다크 패널 위 텍스트 — 밝은 블루-화이트 계열
const D = {
  text:    "rgba(200,228,255,0.90)",  // 메인 텍스트 (밝은 블루-화이트)
  textSub: "rgba(140,175,220,0.70)",  // 서브 텍스트
  label:   "rgba(90,128,178,0.60)",   // 마이크로 레이블
} as const;

// 정보 셀 — 다크 글래스
const cellStyle = {
  background: "rgba(0,25,65,0.60)",
  border: "1px solid rgba(0,150,220,0.22)",
  borderRadius: SAO.radius.panel,
} as const;

const actionBtnStyle = {
  ...GOLD_BTN_STYLE,
  padding: "8px 12px",
  fontSize: "0.7rem",
  width: "100%",
  display: "block",
} as const;

// ─── Nav icon map (used for PanelFrame header icon) ──────────────────────────

const NAV_ICONS: Partial<Record<MainNavId, string>> = {
  player:    SAO_ICON.player,
  skills:    SAO_ICON.skills,
  inventory: SAO_ICON.items,
  quests:    SAO_ICON.quest,
  social:    SAO_ICON.social,
  lifelog:   SAO_ICON.lifelog,
  market:    SAO_ICON.market,
  system:    SAO_ICON.config,
};

// ─── PanelFrame ───────────────────────────────────────────────────────────────

function PanelFrame({
  title,
  children,
  centerTargetKey,
  resetScrollKey,
  centerBehavior,
  backButton,
  iconSrc,
  depth = 0,
  fixedScrollHeight,
}: {
  title: string;
  children: React.ReactNode;
  centerTargetKey?: string | null;
  resetScrollKey?: string | number | null;
  centerBehavior?: ScrollBehavior | "spring";
  backButton?: React.ReactNode;
  iconSrc?: string;
  depth?: number;
  /** When set, the scroll area uses a fixed height (windowed view) instead of maxHeight */
  fixedScrollHeight?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[2px]"
      style={{
        ...getFrameStyle(depth),
        width: UI_CONSTS.rightPanels.panelWidth,
        minHeight: 160,
        transition: "background 0.35s ease",
      }}
    >
      {/* SAO 시그니처 — 패널 상단 시안 글로우 라인 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          zIndex: 20,
          background: "linear-gradient(90deg, transparent 5%, rgba(0,200,255,0.72) 35%, rgba(0,200,255,0.72) 65%, transparent 95%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        className="relative z-10"
        style={{
          borderBottom: "1px solid rgba(0,180,255,0.18)",
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
          background: "rgba(0,30,70,0.28)",
        }}
      >
        <div className="flex items-center gap-2">
          {backButton}
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              width={20}
              height={20}
              draggable={false}
              aria-hidden
              style={{
                opacity: 0.75,
                flexShrink: 0,
                filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(185deg)",
              }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className="uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.32em", color: "rgba(0,190,255,0.65)" }}
            >
              System
            </p>
            <h3
              className="break-words font-semibold uppercase"
              style={{ fontSize: "1.25rem", letterSpacing: "0.12em", color: D.text }}
            >
              {title}
            </h3>
          </div>
        </div>
      </div>
      <EdgeFadeScrollArea
        data-no-pan
        className="scrollbar-hide"
        centerTargetSelector='[data-scroll-center-target="true"]'
        centerTargetKey={centerTargetKey ?? null}
        resetScrollKey={resetScrollKey ?? null}
        centerBehavior={centerBehavior}
        fadeColor="rgba(4,9,24,0.97)"
        style={
          fixedScrollHeight
            ? {
                height: fixedScrollHeight,
                paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
                paddingBottom: UI_CONSTS.rightPanels.panelContentPaddingY,
              }
            : {
                maxHeight: "min(62vh, 560px)",
                paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
                paddingBottom:
                  UI_CONSTS.rightPanels.panelContentPaddingY +
                  UI_CONSTS.rightPanels.panelContentBottomSafePadding,
              }
        }
      >
        {children}
      </EdgeFadeScrollArea>

    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm transition-opacity hover:opacity-70"
      style={cellStyle}
      onClick={onClick}
    >
      <span style={{ fontSize: "14px", color: "rgba(0,190,255,0.80)" }}>←</span>
    </button>
  );
}

// ─── Form Panel ───────────────────────────────────────────────────────────────

function FormFieldInput({
  field,
  value,
  onChange,
  prefilled,
}: {
  field: FormFieldSpec;
  value: string;
  onChange: (val: string) => void;
  prefilled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const style = {
    ...INPUT_STYLE,
    ...(focused
      ? { border: `1px solid ${SAO.color.border.gold}` }
      : prefilled && value
      ? { border: `1px solid rgba(248,197,78,0.65)`, background: "rgba(248,197,78,0.08)" }
      : {}),
  };

  if (field.type === "select") {
    return (
      <select
        title={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={style}
      >
        <option value="">Select…</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...style, resize: "vertical", minHeight: "72px" }}
      />
    );
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={field.placeholder}
      style={style}
    />
  );
}

function FormPanel({
  panel,
  panelIndex,
  onSubmit,
  onBack,
  onFieldChange,
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "form" }>;
  panelIndex: number;
  onSubmit: (formKey: string, values: Record<string, string>) => void;
  onBack: (panelIndex: number) => void;
  onFieldChange?: (formKey: string, fieldKey: string, value: string) => void;
  depth?: number;
}) {
  const [values, setValues] = useState<Record<string, string>>(panel.prefillValues ?? {});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    onFieldChange?.(panel.formKey, key, val);
  };

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="space-y-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        {panel.fields.map((field) => (
          <div key={field.key}>
            <p
              className="mb-1 uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}
            >
              {field.label}
              {field.required ? <span style={{ marginLeft: "2px", color: SAO.color.action.danger }}>*</span> : null}
            </p>
            <FormFieldInput
              field={field}
              value={values[field.key] ?? ""}
              onChange={(val) => setValue(field.key, val)}
              prefilled={Boolean(panel.prefillValues?.[field.key])}
            />
          </div>
        ))}

        <button
          type="button"
          className="mt-2 transition-opacity hover:opacity-85 active:scale-[0.98]"
          style={actionBtnStyle}
          onClick={() => setConfirmOpen(true)}
        >
          {panel.submitLabel ?? "등록"}
        </button>
      </div>

      <SaoAlert
        isOpen={confirmOpen}
        title={panel.title}
        message="저장하시겠습니까?"
        onConfirm={() => {
          setConfirmOpen(false);
          onSubmit(panel.formKey, values);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </PanelFrame>
  );
}

// ─── Message Panel ────────────────────────────────────────────────────────────

type MockMessage = { id: string; sender: "me" | "them"; text: string; time: string };

function MessagePanel({
  panel,
  panelIndex,
  onBack,
  initialMessages,
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "message" }>;
  panelIndex: number;
  onBack: (panelIndex: number) => void;
  initialMessages: MockMessage[];
  depth?: number;
}) {
  const [messages, setMessages] = useState<MockMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "me",
        text: input.trim(),
        time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="flex flex-col gap-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        {/* Message list */}
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.sender === "me" ? "flex-row-reverse" : ""}`}
            >
              <div
                className="rounded-sm px-3 py-2"
                style={{
                  background: msg.sender === "me"
                    ? `rgba(248,197,78,0.18)`
                    : `rgba(255,255,255,0.08)`,
                  border: `1px solid ${msg.sender === "me" ? "rgba(248,197,78,0.45)" : "rgba(255,255,255,0.1)"}`,
                  maxWidth: "82%",
                }}
              >
                <p
                  className="break-words text-sm"
                  style={{ letterSpacing: "0.06em", color: D.text }}
                >
                  {msg.text}
                </p>
                <p className="mt-0.5" style={{ fontSize: "10px", color: D.textSub }}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          {messages.length === 0 ? (
            <p
              className="text-center text-xs"
              style={{ color: D.textSub }}
            >
              대화 내역이 없습니다.
            </p>
          ) : null}
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지 입력..."
            rows={2}
            style={{
              ...INPUT_STYLE,
              resize: "none",
              flex: 1,
            }}
          />
          <button
            type="button"
            className="rounded-sm transition-opacity hover:opacity-85"
            style={{ ...GOLD_BTN_STYLE, padding: "6px 12px", fontSize: "0.7rem" }}
            onClick={send}
          >
            전송
          </button>
        </div>
      </div>
    </PanelFrame>
  );
}

// ─── Gift Panel ───────────────────────────────────────────────────────────────

type GiftSlot = { itemId: string; itemName: string; quantity: number };
type GiftInventoryItem = { id: string; name: string; qty: number };

const MOCK_GIFT_INVENTORY: GiftInventoryItem[] = [
  { id: "gi-001", name: "HP Potion (M)", qty: 42 },
  { id: "gi-002", name: "MP Potion (S)", qty: 28 },
  { id: "gi-003", name: "Teleport Crystal", qty: 5 },
  { id: "gi-004", name: "Iron Ore", qty: 156 },
  { id: "gi-005", name: "Mithril Ingot", qty: 12 },
  { id: "gi-006", name: "Antidote (S)", qty: 15 },
];

function GiftPanel({
  panel,
  panelIndex,
  onBack,
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "gift" }>;
  panelIndex: number;
  onBack: (panelIndex: number) => void;
  depth?: number;
}) {
  const [slots, setSlots] = useState<GiftSlot[]>([]);
  const [memo, setMemo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const addToSlot = (item: GiftInventoryItem) => {
    if (slots.length >= 4) return;
    const existing = slots.find((s) => s.itemId === item.id);
    if (existing) {
      setSlots((prev) =>
        prev.map((s) =>
          s.itemId === item.id ? { ...s, quantity: Math.min(s.quantity + 1, item.qty) } : s
        )
      );
    } else {
      setSlots((prev) => [...prev, { itemId: item.id, itemName: item.name, quantity: 1 }]);
    }
  };

  const removeSlot = (itemId: string) =>
    setSlots((prev) => prev.filter((s) => s.itemId !== itemId));

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="space-y-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        {/* Trade layout with vertical divider */}
        <div className="relative flex gap-0">
          {/* Left: inventory */}
          <div className="flex-1 pr-3">
            <p
              className="mb-1.5 uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}
            >
              내 인벤토리
            </p>
            <div className="space-y-1">
              {MOCK_GIFT_INVENTORY.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-sm px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-75"
                  style={{
                    ...cellStyle,
                    letterSpacing: "0.06em",
                    color: D.text,
                  }}
                  onClick={() => addToSlot(item)}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="ml-1" style={{ color: D.textSub }}>×{item.qty}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vertical divider (double line for depth) */}
          <div className="flex-shrink-0 self-stretch" style={{ width: "2px", marginInline: "2px" }}>
            <div style={{ width: "1px", height: "100%", background: "rgba(255,255,255,0.08)", display: "inline-block" }} />
            <div style={{ width: "1px", height: "100%", background: "rgba(0,0,0,0.35)", display: "inline-block" }} />
          </div>

          {/* Right: gift slots */}
          <div className="flex-1 pl-3">
            <p
              className="mb-1.5 uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}
            >
              선물 슬롯 ({slots.length}/4)
            </p>
            <div className="space-y-1">
              {slots.map((slot) => (
                <div
                  key={slot.itemId}
                  className="flex items-center gap-1 rounded-sm px-2 py-1.5"
                  style={{
                    border: "1px solid rgba(90,95,108,0.5)",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: SAO.radius.panel,
                  }}
                >
                  <span
                    className="min-w-0 flex-1 truncate text-xs"
                    style={{ letterSpacing: "0.06em", color: D.text }}
                  >
                    {slot.itemName} ×{slot.quantity}
                  </span>
                  <button
                    type="button"
                    className="transition-colors hover:opacity-75"
                    style={{ fontSize: "10px", color: D.textSub }}
                    onClick={() => removeSlot(slot.itemId)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {/* Empty slots with Plus.svg */}
              {Array.from({ length: Math.max(0, 4 - slots.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex h-8 items-center justify-center rounded-sm"
                  style={{
                    border: "1px dashed rgba(90,95,108,0.45)",
                    borderRadius: SAO.radius.panel,
                    background: "transparent",
                  }}
                >
                  <img
                    src={SAO_ICON.plus}
                    alt="empty"
                    width={14}
                    height={14}
                    style={{ opacity: 0.3 }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Memo */}
        <div>
          <p
            className="mb-1 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}
          >
            메모 (선택)
          </p>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요..."
            style={INPUT_STYLE}
          />
        </div>

        <button
          type="button"
          className="transition-opacity hover:opacity-85 active:scale-[0.98] disabled:opacity-40"
          style={actionBtnStyle}
          disabled={slots.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          선물 보내기
        </button>
      </div>

      <SaoAlert
        isOpen={confirmOpen}
        title="선물 보내기"
        message={`${panel.friendName}님에게 ${slots.length}개의 아이템을 선물하시겠습니까?`}
        onConfirm={() => {
          setConfirmOpen(false);
          setSlots([]);
          setMemo("");
          onBack(panelIndex);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </PanelFrame>
  );
}

// ─── Row / card shared style helpers ─────────────────────────────────────────


function GoldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-10 items-center overflow-hidden rounded-sm px-3 py-2"
      style={cellStyle}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: "2px", background: SAO.color.action.gold }}
      />
      <span className="break-words pl-2 text-sm" style={{ letterSpacing: "0.06em", color: D.text }}>
        {children}
      </span>
    </div>
  );
}

function InfoCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm px-4 py-3" style={cellStyle}>
      {label ? (
        <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: D.label }}>
          {label}
        </p>
      ) : null}
      <div className="mt-1 break-words text-sm" style={{ letterSpacing: "0.08em", color: D.text }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main PanelContent ────────────────────────────────────────────────────────

function PanelContent({
  panel,
  panelIndex,
  depth,
  onPanelItemSelect,
  onPanelItemAction,
  onPanelItemDoubleClick,
  onPanelFormSubmit,
  onPanelFormFieldChange,
  onPanelBack,
  onPanelActionClick,
  chatMessages,
}: {
  panel: PanelStackItem;
  panelIndex: number;
  depth: number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  onPanelItemAction?: (panelIndex: number, itemId: string, actionType: string) => void;
  onPanelItemDoubleClick?: (panelIndex: number, itemId: string) => void;
  onPanelFormSubmit?: (formKey: string, values: Record<string, string>) => void;
  onPanelFormFieldChange?: (formKey: string, fieldKey: string, value: string) => void;
  onPanelBack?: (panelIndex: number) => void;
  onPanelActionClick?: (panelIndex: number) => void;
  chatMessages?: MockMessage[];
}) {
  if (panel.kind === "form") {
    return (
      <FormPanel
        key={panel.id}
        panel={panel}
        panelIndex={panelIndex}
        onSubmit={onPanelFormSubmit ?? (() => {})}
        onBack={onPanelBack ?? (() => {})}
        onFieldChange={onPanelFormFieldChange}
        depth={depth}
      />
    );
  }

  if (panel.kind === "message") {
    return (
      <MessagePanel
        panel={panel}
        panelIndex={panelIndex}
        onBack={onPanelBack ?? (() => {})}
        initialMessages={chatMessages ?? []}
        depth={depth}
      />
    );
  }

  if (panel.kind === "gift") {
    return (
      <GiftPanel
        panel={panel}
        panelIndex={panelIndex}
        onBack={onPanelBack ?? (() => {})}
        depth={depth}
      />
    );
  }

  if (panel.kind === "modal") {
    return (
      <SaoAlert
        isOpen
        title={panel.title}
        message={panel.description}
        confirmLabel={panel.confirmLabel}
        onConfirm={() => onPanelBack?.(panelIndex)}
        onCancel={() => onPanelBack?.(panelIndex)}
      />
    );
  }

  const isCategoryPanelRoute =
    "context" in panel &&
    (panel.context.route === "player-category" || panel.context.route === "lifelog-category");
  // All menu panels use reorderToCenter (DOM reorder) so selected item moves to center position.
  // Category panels ALSO get spring scroll-centering on top of the DOM reorder.
  const menuItemsForRender =
    panel.kind === "menu"
      ? reorderToCenter(panel.items, panel.selectedId ?? null, (item) => item.id)
      : null;
  const centerTargetKey =
    panel.kind === "menu" || panel.kind === "list" ? (panel.selectedId ?? null) : null;
  const centerBehavior: ScrollBehavior | "spring" =
    panel.kind === "list" || isCategoryPanelRoute ? "spring" : "smooth";
  const isCompactList =
    panel.kind === "list" && (panel.items.length >= 40 || panel.context.route === "market-wallet-summary");
  const navIconSrc =
    "context" in panel ? NAV_ICONS[(panel as { context: { main: MainNavId } }).context.main] : undefined;

  // Windowed height for category panels: show 3/5/7 items + 0.5 peek above + 0.5 peek below.
  // Formula: (visibleN + 1) * (rowHeight + rowGap) where menu rowGap=4.
  const CATEGORY_ROW_GAP = 4;
  const categoryScrollHeight = isCategoryPanelRoute && panel.kind === "menu"
    ? (() => {
        const n = panel.items.length;
        const visibleN = n <= 3 ? 3 : n <= 5 ? 5 : 7;
        return (visibleN + 1) * (UI_CONSTS.rightPanels.rowHeight + CATEGORY_ROW_GAP);
      })()
    : undefined;

  return (
    <PanelFrame
      title={panel.title}
      centerTargetKey={centerTargetKey}
      resetScrollKey={panel.id}
      centerBehavior={centerBehavior}
      iconSrc={navIconSrc}
      depth={depth}
      fixedScrollHeight={categoryScrollHeight}
    >
      {panel.kind === "menu" ? (
        <div
          style={{
            width: "100%",
            display: "grid",
            rowGap: 4,
          }}
        >
          {menuItemsForRender?.map((item, itemIndex) => {
            const isCategoryPanel =
              panel.context.route === "player-category" ||
              panel.context.route === "lifelog-category";
            return (
              <PanelCard
                key={item.id}
                label={item.label}
                slotLabel={item.slotLabel}
                selected={panel.selectedId === item.id}
                centerTarget={panel.selectedId === item.id}
                index={itemIndex}
                onClick={() => onPanelItemSelect(panelIndex, item.id)}
                onDoubleClick={
                  isCategoryPanel && onPanelItemDoubleClick
                    ? () => onPanelItemDoubleClick(panelIndex, item.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : null}

      {panel.kind === "list" ? (
        <div className="space-y-2">
          {panel.actionLabel ? (
            <div style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
              <button
                type="button"
                className="transition-opacity hover:opacity-85 active:scale-[0.98]"
                style={actionBtnStyle}
                onClick={() => onPanelActionClick?.(panelIndex)}
              >
                {panel.actionLabel}
              </button>
            </div>
          ) : null}
          <div
            style={{
              width: "100%",
              display: "grid",
              rowGap: 4,
            }}
          >
            {panel.items.map((item, itemIndex) => (
                <PanelCard
                  key={item.id}
                  label={item.label}
                  slotLabel={item.slotLabel}
                  subtitle={item.subtitle}
                  selected={panel.selectedId === item.id}
                  centerTarget={panel.selectedId === item.id}
                  compact={isCompactList}
                  index={itemIndex}
                  onClick={() => onPanelItemSelect(panelIndex, item.id)}
                  onDoubleClick={
                    onPanelItemDoubleClick && item.actions?.some((a) => a.type === "edit")
                      ? () => onPanelItemDoubleClick(panelIndex, item.id)
                      : undefined
                  }
                  actions={item.actions}
                  onAction={(type) => onPanelItemAction?.(panelIndex, item.id, type)}
                />
              ))}
          </div>
        </div>
      ) : null}

      {panel.kind === "placeholder" ? (
        <div className="space-y-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
          <InfoCard>{panel.description}</InfoCard>
          {panel.primaryActionLabel ? (
            <button
              type="button"
              className="transition-opacity hover:opacity-85"
              style={actionBtnStyle}
            >
              {panel.primaryActionLabel}
            </button>
          ) : null}
          <div className="space-y-1.5">
            {(panel.rows ?? []).map((row, index) => (
              <GoldRow key={`${panel.id}-row-${index}`}>{row}</GoldRow>
            ))}
          </div>
        </div>
      ) : null}
    </PanelFrame>
  );
}

export default function RightPanels({
  selectedMain,
  panelStack,
  panelStackKey,
  onPanelFocus,
  getPanelZIndex,
  onPanelItemSelect,
  onPanelItemAction,
  onPanelItemDoubleClick,
  onPanelFormSubmit,
  onPanelFormFieldChange,
  onPanelBack,
  onPanelActionClick,
}: RightPanelsProps) {
  const chatMessagesRef = useRef<Record<string, MockMessage[]>>(MOCK_CHAT_HISTORY);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {panelStack.length > 0 ? (
        <motion.div
          key={panelStackKey}
          initial={MOTION.hologramIn.initial}
          animate={MOTION.hologramIn.animate}
          exit={MOTION.hologramIn.exit}
          transition={MOTION.hologramIn.transition}
          className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center overflow-x-hidden"
          data-main={selectedMain}
          style={{
            minHeight: 420,
            width: "fit-content",
            paddingBottom: UI_CONSTS.rightPanels.stackBottomSafePadding,
            rowGap: UI_CONSTS.rightPanels.panelGap,
            columnGap: UI_CONSTS.rightPanels.panelGap,
            willChange: "transform, opacity",
          }}
        >
          <AnimatePresence initial={false}>
            {panelStack.map((panel, panelIndex) => {
              const depth = panelStack.length - 1 - panelIndex;
              return (
              <motion.div
                layout="position"
                key={`panel-slot-${panelIndex}`}
                onPointerDownCapture={() => onPanelFocus?.(panelIndex, panel.id)}
                initial={MOTION.panelSlot.initial}
                animate={MOTION.panelSlot.animate}
                exit={MOTION.panelSlot.exit}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 28,
                  delay: panelIndex * 0.055,
                }}
                style={{
                  willChange: "transform, opacity",
                  position: "relative",
                  zIndex: getPanelZIndex?.(panelIndex, panel.id) ?? panelIndex + 1,
                }}
              >
                <PanelContent
                  panel={panel}
                  panelIndex={panelIndex}
                  depth={depth}
                  onPanelItemSelect={onPanelItemSelect}
                  onPanelItemAction={onPanelItemAction}
                  onPanelItemDoubleClick={onPanelItemDoubleClick}
                  onPanelFormSubmit={onPanelFormSubmit}
                  onPanelFormFieldChange={onPanelFormFieldChange}
                  onPanelBack={onPanelBack}
                  onPanelActionClick={onPanelActionClick}
                  chatMessages={
                    panel.kind === "message"
                      ? chatMessagesRef.current[panel.friendId] ?? []
                      : undefined
                  }
                />
              </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
