"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MainNavId, PanelStackItem } from "@/entities/nav";
import { MOTION } from "@/shared/lib/motion";
import { reorderToCenter } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";

import SaoAlert from "@/shared/ui/SaoAlert";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";

import { NAV_ICONS, actionBtnStyle } from "./ui/styles";
import { GoldRow, InfoCard } from "./ui/Rows";
import { PanelFrame } from "./ui/PanelFrame";
import { FormPanel } from "./ui/FormPanel";
import { GiftPanel } from "./ui/GiftPanel";

type RightPanelsProps = {
  selectedMain: MainNavId;
  panelStack: PanelStackItem[];
  panelStackKey: string;
  onPanelFocus?: (panelIndex: number, panelId: string) => void;
  getPanelZIndex?: (panelIndex: number, panelId: string) => number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  onPanelItemAction?: (panelIndex: number, itemId: string, actionType: string) => void;
  onPanelItemDoubleClick?: (panelIndex: number, itemId: string) => void;
  onPanelFormSubmit?: (formKey: string, values: Record<string, string>) => void;
  onPanelFormFieldChange?: (formKey: string, fieldKey: string, value: string) => void;
  onPanelBack?: (panelIndex: number) => void;
  onPanelActionClick?: (panelIndex: number) => void;
};

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
      contentKey={panel.id}
    >
      {panel.kind === "menu" ? (
        <div style={{ width: "100%", display: "grid", rowGap: 4 }}>
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
          <div style={{ width: "100%", display: "grid", rowGap: 4 }}>
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
              onClick={() => onPanelActionClick?.(panelIndex)}
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
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {panelStack.length > 0 ? (
        <motion.div
          key={panelStackKey}
          initial={reducedMotion ? false : MOTION.hologramIn.initial}
          animate={MOTION.hologramIn.animate}
          exit={reducedMotion ? { opacity: 0 } : MOTION.hologramIn.exit}
          transition={reducedMotion ? { duration: 0 } : MOTION.hologramIn.transition}
          className="lag-panel-rail relative overflow-x-visible"
          data-main={selectedMain}
          style={{
            width: "fit-content",
            gap: UI_CONSTS.rightPanels.panelGap,
            willChange: "transform, opacity",
          }}
        >
          <AnimatePresence initial={false}>
            {panelStack.map((panel, panelIndex) => {
              const depth = panelStack.length - 1 - panelIndex;
              return (
                <PanelStage
                  key={`${selectedMain}-stage-${panelIndex}`}
                  stageKey={`${selectedMain}-stage-${panelIndex}`}
                  focusKey={panel.id}
                  index={panelIndex}
                  onPointerDownCapture={() => onPanelFocus?.(panelIndex, panel.id)}
                  zIndex={getPanelZIndex?.(panelIndex, panel.id) ?? panelIndex + 1}
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
                  />
                </PanelStage>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
