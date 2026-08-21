"use client";

import { UI_CONSTS } from "@/shared/lib/uiConsts";
import EdgeFadeScrollArea from "@/shared/ui/EdgeFadeScrollArea";
import { getFrameStyle, D, cellStyle } from "./styles";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center transition-opacity hover:opacity-70"
      style={{ ...cellStyle, borderRadius: "50%", flexShrink: 0 }}
      onClick={onClick}
    >
      <span style={{ fontSize: "14px", color: D.textSub }}>←</span>
    </button>
  );
}

export function PanelFrame({
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
  fixedScrollHeight?: number;
}) {
  return (
    <div
      className="lag-panel-frame relative overflow-hidden"
      style={{
        ...getFrameStyle(depth),
        width: UI_CONSTS.rightPanels.panelWidth,
        minHeight: 160,
      }}
    >
      {/* Header */}
      <div
        className="lag-panel-header relative z-10"
        style={{
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
        }}
      >
        <div className="flex items-center gap-2">
          {backButton}
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              width={16}
              height={16}
              draggable={false}
              aria-hidden
              style={{
                opacity: 0.72,
                flexShrink: 0,
                filter: "none",
              }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
          {/* ◆ ─── TITLE ─── ◆ */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div style={{ flex: 1, height: "1px", background: "var(--lag-divider)" }} />
            <span aria-hidden style={{ color: "var(--lag-violet)", fontSize: "9px", flexShrink: 0 }}>◆</span>
            <h3
              className="flex-shrink-0 font-semibold uppercase"
              style={{ fontSize: "0.9rem", letterSpacing: "0.20em", color: D.text }}
            >
              {title}
            </h3>
            <span aria-hidden style={{ color: "var(--lag-violet)", fontSize: "9px", flexShrink: 0 }}>◆</span>
            <div style={{ flex: 1, height: "1px", background: "var(--lag-divider)" }} />
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
        fadeColor="var(--lag-panel)"
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
