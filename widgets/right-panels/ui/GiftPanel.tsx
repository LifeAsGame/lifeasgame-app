"use client";

import { useState } from "react";
import { SAO, SAO_ICON, INPUT_STYLE_DARK as INPUT_STYLE } from "@/shared/design/tokens";
import type { PanelStackItem } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import SaoAlert from "@/shared/ui/SaoAlert";
import { PanelFrame, BackButton } from "./PanelFrame";
import { D, cellStyle, actionBtnStyle } from "./styles";

type GiftSlot = { itemId: string; itemName: string; quantity: number };
type GiftInventoryItem = { id: string; name: string; qty: number };

const MOCK_GIFT_INVENTORY: GiftInventoryItem[] = [
  { id: "gi-001", name: "HP Potion (M)",    qty: 42 },
  { id: "gi-002", name: "MP Potion (S)",    qty: 28 },
  { id: "gi-003", name: "Teleport Crystal", qty: 5 },
  { id: "gi-004", name: "Iron Ore",         qty: 156 },
  { id: "gi-005", name: "Mithril Ingot",    qty: 12 },
  { id: "gi-006", name: "Antidote (S)",     qty: 15 },
];

export function GiftPanel({
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
        prev.map((s) => s.itemId === item.id ? { ...s, quantity: Math.min(s.quantity + 1, item.qty) } : s)
      );
    } else {
      setSlots((prev) => [...prev, { itemId: item.id, itemName: item.name, quantity: 1 }]);
    }
  };

  const removeSlot = (itemId: string) => setSlots((prev) => prev.filter((s) => s.itemId !== itemId));

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="space-y-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        <div className="relative flex gap-0">
          {/* Inventory */}
          <div className="flex-1 pr-3">
            <p className="mb-1.5 uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}>내 인벤토리</p>
            <div className="space-y-1">
              {MOCK_GIFT_INVENTORY.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-sm px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-75"
                  style={{ ...cellStyle, letterSpacing: "0.06em", color: D.text }}
                  onClick={() => addToSlot(item)}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="ml-1" style={{ color: D.textSub }}>×{item.qty}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 self-stretch" style={{ width: "2px", marginInline: "2px" }}>
            <div style={{ width: "1px", height: "100%", background: "rgba(255,255,255,0.08)", display: "inline-block" }} />
            <div style={{ width: "1px", height: "100%", background: "rgba(0,0,0,0.35)", display: "inline-block" }} />
          </div>

          {/* Gift slots */}
          <div className="flex-1 pl-3">
            <p className="mb-1.5 uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}>
              선물 슬롯 ({slots.length}/4)
            </p>
            <div className="space-y-1">
              {slots.map((slot) => (
                <div
                  key={slot.itemId}
                  className="flex items-center gap-1 rounded-sm px-2 py-1.5"
                  style={{ border: "1px solid rgba(90,95,108,0.5)", background: "rgba(255,255,255,0.07)", borderRadius: SAO.radius.panel }}
                >
                  <span className="min-w-0 flex-1 truncate text-xs" style={{ letterSpacing: "0.06em", color: D.text }}>
                    {slot.itemName} ×{slot.quantity}
                  </span>
                  <button type="button" className="transition-colors hover:opacity-75" style={{ fontSize: "10px", color: D.textSub }} onClick={() => removeSlot(slot.itemId)}>✕</button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - slots.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex h-8 items-center justify-center rounded-sm"
                  style={{ border: "1px dashed rgba(90,95,108,0.45)", borderRadius: SAO.radius.panel }}
                >
                  <img src={SAO_ICON.plus} alt="empty" width={14} height={14} style={{ opacity: 0.3 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 uppercase" style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}>메모 (선택)</p>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모를 입력하세요..." style={INPUT_STYLE} />
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
        onConfirm={() => { setConfirmOpen(false); setSlots([]); setMemo(""); onBack(panelIndex); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </PanelFrame>
  );
}
