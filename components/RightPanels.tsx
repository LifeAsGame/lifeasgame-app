"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

import { MOCK_CHAT_HISTORY } from "@/lib/api/mock/chat.mock";
import { SAO, INPUT_STYLE, GOLD_BTN_STYLE, SAO_ICON } from "@/lib/design/tokens";
import type { FormFieldSpec, MainNavId, PanelStackItem } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { reorderToCenter } from "@/lib/reorder";
import { UI_CONSTS } from "@/lib/uiConsts";

import SaoAlert from "./SaoAlert";
import EdgeFadeScrollArea from "./EdgeFadeScrollArea";
import PanelCard from "./PanelCard";

type RightPanelsProps = {
  selectedMain: MainNavId;
  panelStack: PanelStackItem[];
  panelStackKey: string;
  onPanelFocus?: (panelIndex: number, panelId: string) => void;
  getPanelZIndex?: (panelIndex: number, panelId: string) => number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  onPanelItemAction?: (panelIndex: number, itemId: string, actionType: string) => void;
  onPanelFormSubmit?: (formKey: string, values: Record<string, string>) => void;
  onPanelBack?: (panelIndex: number) => void;
  onPanelActionClick?: (panelIndex: number) => void;
};

// ─── Shared styles (light-panel context) ─────────────────────────────────────

// Light panel frame style (SAO reference: bright white panel, subtle border)
const FRAME_STYLE = {
  background: "linear-gradient(180deg, rgba(251,252,254,0.98), rgba(243,246,252,0.96))",
  border: "1px solid rgba(182,190,215,0.42)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92), 0 8px 28px rgba(0,0,0,0.20)",
  borderRadius: SAO.radius.panel,
} as const;

// Colors for text rendered inside the light panel
const D = {
  text:    "rgba(22,30,52,0.86)",    // main text on light bg
  textSub: "rgba(72,85,118,0.68)",   // secondary text
  label:   "rgba(112,125,158,0.60)", // micro-label (10px uppercase)
} as const;

const cellStyle = {
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(175,182,210,0.38)",
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
}: {
  title: string;
  children: React.ReactNode;
  centerTargetKey?: string | null;
  resetScrollKey?: string | number | null;
  centerBehavior?: ScrollBehavior | "spring";
  backButton?: React.ReactNode;
  iconSrc?: string;
  depth?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[2px]"
      style={{
        ...FRAME_STYLE,
        width: UI_CONSTS.rightPanels.panelWidth,
        minHeight: 160,
      }}
    >
      {/* Header */}
      <div
        className="relative z-10"
        style={{
          borderBottom: "1px solid rgba(182,190,215,0.38)",
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
          background: "rgba(0,0,0,0.025)",
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
              style={{ opacity: 0.50, flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className="uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.32em", color: D.label }}
            >
              Panel
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
        fadeColor="rgba(244,247,252,0.96)"
        style={{
          maxHeight: "min(62vh, 560px)",
          paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
          paddingBottom:
            UI_CONSTS.rightPanels.panelContentPaddingY +
            UI_CONSTS.rightPanels.panelContentBottomSafePadding,
        }}
      >
        {children}
      </EdgeFadeScrollArea>

      {/* Depth dimming overlay — inactive panels recede naturally */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: depth === 0 ? 0 : depth === 1 ? 0.22 : 0.38 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{ background: "rgba(200,210,232,1)", zIndex: 20 }}
      />
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
      <span style={{ fontSize: "12px", color: D.textSub }}>←</span>
    </button>
  );
}

// ─── Form Panel ───────────────────────────────────────────────────────────────

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormFieldSpec;
  value: string;
  onChange: (val: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const style = {
    ...INPUT_STYLE,
    ...(focused ? { border: `1px solid ${SAO.color.border.gold}` } : {}),
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
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "form" }>;
  panelIndex: number;
  onSubmit: (formKey: string, values: Record<string, string>) => void;
  onBack: (panelIndex: number) => void;
  depth?: number;
}) {
  const [values, setValues] = useState<Record<string, string>>(panel.prefillValues ?? {});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setValue = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

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
  onPanelFormSubmit,
  onPanelBack,
  onPanelActionClick,
  chatMessages,
}: {
  panel: PanelStackItem;
  panelIndex: number;
  depth: number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  onPanelItemAction?: (panelIndex: number, itemId: string, actionType: string) => void;
  onPanelFormSubmit?: (formKey: string, values: Record<string, string>) => void;
  onPanelBack?: (panelIndex: number) => void;
  onPanelActionClick?: (panelIndex: number) => void;
  chatMessages?: MockMessage[];
}) {
  if (panel.kind === "form") {
    return (
      <FormPanel
        panel={panel}
        panelIndex={panelIndex}
        onSubmit={onPanelFormSubmit ?? (() => {})}
        onBack={onPanelBack ?? (() => {})}
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

  const menuItemsForRender =
    panel.kind === "menu" ? reorderToCenter(panel.items, panel.selectedId ?? null, (item) => item.id) : null;
  const centerTargetKey =
    panel.kind === "menu" || panel.kind === "list" ? (panel.selectedId ?? null) : null;
  const centerBehavior: ScrollBehavior | "spring" = panel.kind === "list" ? "spring" : "smooth";
  const isCompactList =
    panel.kind === "list" && (panel.items.length >= 40 || panel.context.route === "market-wallet-summary");
  const navIconSrc =
    "context" in panel ? NAV_ICONS[(panel as { context: { main: MainNavId } }).context.main] : undefined;

  return (
    <PanelFrame
      title={panel.title}
      centerTargetKey={centerTargetKey}
      resetScrollKey={panel.id}
      centerBehavior={centerBehavior}
      iconSrc={navIconSrc}
      depth={depth}
    >
      {panel.kind === "menu" ? (
        <div
          style={{
            width: "100%",
            display: "grid",
            rowGap: UI_CONSTS.rightPanels.rowGap,
          }}
        >
          {menuItemsForRender?.map((item, itemIndex) => (
            <PanelCard
              key={item.id}
              label={item.label}
              slotLabel={item.slotLabel}
              selected={panel.selectedId === item.id}
              centerTarget={panel.selectedId === item.id}
              index={itemIndex}
              onClick={() => onPanelItemSelect(panelIndex, item.id)}
            />
          ))}
        </div>
      ) : null}

      {panel.kind === "list" ? (
        <div className="space-y-3">
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
              rowGap: UI_CONSTS.rightPanels.rowGap,
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
  onPanelFormSubmit,
  onPanelBack,
  onPanelActionClick,
}: RightPanelsProps) {
  const chatMessagesRef = useRef<Record<string, MockMessage[]>>(MOCK_CHAT_HISTORY);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {panelStack.length > 0 ? (
        <motion.div
          key={panelStackKey}
          initial={MOTION.panelReset.initial}
          animate={MOTION.panelReset.animate}
          exit={MOTION.panelReset.exit}
          transition={MOTION.panelReset.transition}
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
                  ...MOTION.panelSlot.transition,
                  delay: panelIndex * 0.035,
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
                  onPanelFormSubmit={onPanelFormSubmit}
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
