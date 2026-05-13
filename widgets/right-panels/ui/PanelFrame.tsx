"use client";

import { UI_CONSTS } from "@/shared/lib/uiConsts";
import EdgeFadeScrollArea from "@/shared/ui/EdgeFadeScrollArea";
import { getFrameStyle, D, cellStyle } from "./styles";

const CORNERS = [
  { top: 4, left: 4, borderTop: "1.5px solid rgba(218,178,55,0.65)", borderLeft: "1.5px solid rgba(218,178,55,0.65)" },
  { top: 4, right: 4, borderTop: "1.5px solid rgba(218,178,55,0.65)", borderRight: "1.5px solid rgba(218,178,55,0.65)" },
  { bottom: 4, left: 4, borderBottom: "1.5px solid rgba(218,178,55,0.65)", borderLeft: "1.5px solid rgba(218,178,55,0.65)" },
  { bottom: 4, right: 4, borderBottom: "1.5px solid rgba(218,178,55,0.65)", borderRight: "1.5px solid rgba(218,178,55,0.65)" },
] as const;

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
      className="relative overflow-hidden"
      style={{
        ...getFrameStyle(depth),
        width: UI_CONSTS.rightPanels.panelWidth,
        minHeight: 160,
        transition: "background 0.35s ease",
        borderRadius: "6px",
      }}
    >
      {/* Corner L-bracket ornaments */}
      {CORNERS.map((c, i) => (
        <div
          key={i}
          aria-hidden
          style={{ position: "absolute", width: 12, height: 12, pointerEvents: "none", zIndex: 30, ...c }}
        />
      ))}

      {/* Gold top accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          zIndex: 20,
          background: "linear-gradient(90deg, transparent 5%, rgba(218,178,55,0.72) 35%, rgba(218,178,55,0.72) 65%, transparent 95%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        className="relative z-10"
        style={{
          borderBottom: "1px solid rgba(200,165,50,0.20)",
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
          background: "rgba(0,0,0,0.30)",
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
                filter: "brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(600%) hue-rotate(5deg) brightness(108%)",
              }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
          {/* ◆ ─── TITLE ─── ◆ */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,165,50,0.45))" }} />
            <span aria-hidden style={{ color: "rgba(218,178,55,0.58)", fontSize: "9px", flexShrink: 0 }}>◆</span>
            <h3
              className="flex-shrink-0 font-semibold uppercase"
              style={{ fontSize: "0.9rem", letterSpacing: "0.20em", color: D.text }}
            >
              {title}
            </h3>
            <span aria-hidden style={{ color: "rgba(218,178,55,0.58)", fontSize: "9px", flexShrink: 0 }}>◆</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(200,165,50,0.45), transparent)" }} />
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
        fadeColor="rgba(14,12,9,0.97)"
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
