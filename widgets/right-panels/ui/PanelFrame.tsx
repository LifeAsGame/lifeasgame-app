"use client";

import { UI_CONSTS } from "@/shared/lib/uiConsts";
import EdgeFadeScrollArea from "@/shared/ui/EdgeFadeScrollArea";
import { getFrameStyle, D, cellStyle } from "./styles";

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm transition-opacity hover:opacity-70"
      style={cellStyle}
      onClick={onClick}
    >
      <span style={{ fontSize: "14px", color: "rgba(200,200,208,0.82)" }}>←</span>
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
      className="relative overflow-hidden rounded-[2px]"
      style={{
        ...getFrameStyle(depth),
        width: UI_CONSTS.rightPanels.panelWidth,
        minHeight: 160,
        transition: "background 0.35s ease",
      }}
    >
      {/* Gold top accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          zIndex: 20,
          background: "linear-gradient(90deg, transparent 5%, rgba(218,178,60,0.60) 35%, rgba(218,178,60,0.60) 65%, transparent 95%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        className="relative z-10"
        style={{
          borderBottom: "1px solid rgba(200,200,205,0.12)",
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
          background: "rgba(0,0,0,0.18)",
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
              style={{ opacity: 0.75, flexShrink: 0, filter: "brightness(0) invert(1) opacity(0.68)" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className="uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.32em", color: "rgba(175,175,182,0.72)" }}
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
        fadeColor="rgba(16,16,18,0.97)"
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
