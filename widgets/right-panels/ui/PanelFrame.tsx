"use client";

import { UI_CONSTS } from "@/shared/lib/uiConsts";
import EdgeFadeScrollArea from "@/shared/ui/EdgeFadeScrollArea";
import { StageContentTransition } from "@/shared/ui/PanelStage";
import { getFrameBackground, getFrameStyle, D, cellStyle } from "./styles";

export function BackButton({ onClick, label = "이전 화면으로" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center transition-opacity hover:opacity-70"
      style={{ ...cellStyle, borderRadius: "50%", flexShrink: 0 }}
      onClick={onClick}
      aria-label={label}
      data-panel-back
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
  depth = 0,
  fixedScrollHeight,
  centerSelected = false,
  contentKey,
}: {
  title: string;
  children: React.ReactNode;
  centerTargetKey?: string | number | null;
  resetScrollKey?: string | number | null;
  centerBehavior?: ScrollBehavior | "spring";
  backButton?: React.ReactNode;
  depth?: number;
  fixedScrollHeight?: number;
  centerSelected?: boolean;
  contentKey?: React.Key;
}) {
  return (
    <div
      className="lag-panel-frame relative overflow-hidden"
      style={{
        ...getFrameStyle(depth),
        width: "var(--lag-list-width, 344px)",
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
          <h3 className="lag-panel-title min-w-0 flex-1" style={{ color: D.text }}>{title}</h3>
        </div>
      </div>

      <EdgeFadeScrollArea
        data-no-pan
        className="lag-panel-body scrollbar-hide"
        centerTargetSelector='[data-scroll-center-target="true"]'
        centerTargetKey={centerTargetKey ?? null}
        resetScrollKey={resetScrollKey ?? null}
        centerBehavior={centerBehavior}
        centerSelected={centerSelected}
        fadeColor={getFrameBackground(depth)}
        style={
          fixedScrollHeight
            ? {
                height: fixedScrollHeight,
                paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
                paddingBottom: UI_CONSTS.rightPanels.panelContentPaddingY,
              }
            : {
                height: centerSelected ? "min(62vh, 500px)" : undefined,
                maxHeight: "min(62vh, 560px)",
                paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
                paddingBottom:
                  UI_CONSTS.rightPanels.panelContentPaddingY +
                  UI_CONSTS.rightPanels.panelContentBottomSafePadding,
              }
        }
      >
        {contentKey === undefined ? children : <StageContentTransition identity={contentKey}>{children}</StageContentTransition>}
      </EdgeFadeScrollArea>
    </div>
  );
}
