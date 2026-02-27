"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { MainNavId, PanelStackItem } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { reorderToCenter } from "@/lib/reorder";
import { UI_CONSTS } from "@/lib/uiConsts";

import EdgeFadeScrollArea from "./EdgeFadeScrollArea";
import PanelCard from "./PanelCard";

type RightPanelsProps = {
  selectedMain: MainNavId;
  panelStack: PanelStackItem[];
  panelStackKey: string;
  onPanelFocus?: (panelIndex: number, panelId: string) => void;
  getPanelZIndex?: (panelIndex: number, panelId: string) => number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
};

function panelFrameStyle() {
  return {
    width: UI_CONSTS.rightPanels.panelWidth,
    minHeight: 160,
    background:
      "linear-gradient(180deg, rgba(231, 236, 243, 0.94), rgba(220, 227, 236, 0.9))",
    border: "1px solid rgba(20, 23, 28, 0.78)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.48), 0 12px 26px rgba(0,0,0,0.22)",
  } as const;
}

function PanelFrame({
  title,
  children,
  centerTargetKey,
  resetScrollKey,
  centerBehavior,
}: {
  title: string;
  children: React.ReactNode;
  centerTargetKey?: string | null;
  resetScrollKey?: string | number | null;
  centerBehavior?: ScrollBehavior | "spring";
}) {
  return (
    <div className="relative overflow-hidden rounded-[2px]" style={panelFrameStyle()}>
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(0,0,0,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.8)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div
        className="relative z-10 border-b border-zinc-900/70"
        style={{
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
        }}
      >
        <p className="text-xs uppercase tracking-[0.32em] text-zinc-600">Panel</p>
        <h3 className="break-words text-xl font-semibold uppercase tracking-[0.12em] text-zinc-800">
          {title}
        </h3>
      </div>
      <EdgeFadeScrollArea
        data-no-pan
        className="scrollbar-hide"
        centerTargetSelector='[data-scroll-center-target="true"]'
        centerTargetKey={centerTargetKey ?? null}
        resetScrollKey={resetScrollKey ?? null}
        centerBehavior={centerBehavior}
        style={{
          maxHeight: "min(62vh, 560px)",
          paddingLeft: UI_CONSTS.rightPanels.panelContentPaddingX,
          paddingRight: UI_CONSTS.rightPanels.panelContentPaddingX,
          paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
          paddingBottom:
            UI_CONSTS.rightPanels.panelContentPaddingY +
            UI_CONSTS.rightPanels.panelContentBottomSafePadding,
        }}
      >
        {children}
      </EdgeFadeScrollArea>
    </div>
  );
}

function PanelContent({
  panel,
  panelIndex,
  onPanelItemSelect,
}: {
  panel: PanelStackItem;
  panelIndex: number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
}) {
  const menuItemsForRender =
    panel.kind === "menu" ? reorderToCenter(panel.items, panel.selectedId ?? null, (item) => item.id) : null;
  const centerTargetKey =
    panel.kind === "menu" || panel.kind === "list" ? (panel.selectedId ?? null) : null;
  const centerBehavior: ScrollBehavior | "spring" = panel.kind === "list" ? "spring" : "smooth";
  const isCompactList =
    panel.kind === "list" && (panel.items.length >= 40 || panel.context.route === "market-wallet-summary");

  return (
    <PanelFrame
      title={panel.title}
      centerTargetKey={centerTargetKey}
      resetScrollKey={panel.id}
      centerBehavior={centerBehavior}
    >
      {panel.kind === "menu" ? (
        <div
          className="mx-auto"
          style={{
            width: UI_CONSTS.rightPanels.listRailWidth,
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
            <button
              type="button"
              className="w-full rounded-sm border border-zinc-900/30 bg-white/38 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700"
            >
              {panel.actionLabel}
            </button>
          ) : null}
          <div
            className="mx-auto"
            style={{
              width: UI_CONSTS.rightPanels.listRailWidth,
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
              />
            ))}
          </div>
        </div>
      ) : null}

      {panel.kind === "placeholder" ? (
        <div className="space-y-3">
          <div className="rounded-sm border border-zinc-900/25 bg-white/35 px-4 py-3">
            <p className="break-words text-sm tracking-[0.08em] text-zinc-700">{panel.description}</p>
          </div>
          {panel.primaryActionLabel ? (
            <button
              type="button"
              className="w-full rounded-sm border border-amber-500/70 bg-amber-400/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-800"
            >
              {panel.primaryActionLabel}
            </button>
          ) : null}
          <div className="space-y-2">
            {(panel.rows ?? []).map((row, index) => (
              <div
                key={`${panel.id}-row-${index}`}
                className="flex min-h-10 items-center gap-3 rounded-sm border border-zinc-900/20 bg-white/30 px-3 py-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700/70" />
                <span className="break-words text-sm tracking-[0.06em] text-zinc-700">{row}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {panel.kind === "modal" ? (
        <div className="space-y-3">
          <div className="rounded-sm border border-zinc-900/25 bg-white/35 px-4 py-3">
            <p className="break-words text-sm tracking-[0.08em] text-zinc-700">{panel.description}</p>
          </div>
          <div className="space-y-2">
            {(panel.rows ?? []).map((row, index) => (
              <div
                key={`${panel.id}-modal-row-${index}`}
                className="flex min-h-10 items-center gap-3 rounded-sm border border-zinc-900/20 bg-white/30 px-3 py-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700/70" />
                <span className="break-words text-sm tracking-[0.06em] text-zinc-700">{row}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded-sm border border-amber-500/70 bg-amber-400/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-800"
          >
            {panel.confirmLabel}
          </button>
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
}: RightPanelsProps) {
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
            {panelStack.map((panel, panelIndex) => (
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
                  onPanelItemSelect={onPanelItemSelect}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
