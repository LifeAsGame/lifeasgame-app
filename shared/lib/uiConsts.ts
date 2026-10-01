export const UI_CONSTS = {
  layout: {
    // Reference image estimate (landscape): left card ~35%, center orb rail ~12%, right panels ~53%
    leftWidth: 520,
    centerWidth: 112,
    rightMinWidth: 560,
    columnGap: 28,
    canvasMinHeight: 860,
    pagePaddingX: 48,
    pagePaddingY: 34,
    visualCenterOffsetY: 28,
    canvasEndPaddingX: 80,
    canvasEndPaddingY: 32,
  },
  orbNav: {
    viewportHeight: 560,
    orbSize: 48,
    orbGap: 22,
    framePaddingY: 12,
    safePaddingY: 24,
    labelGap: 4,
    labelHeight: 18,
    labelPaddingY: 2,
    outerRingPadding: 4,
    inactiveGlow: 0.12,
    activeGlow: 0.35,
  },
  rightPanels: {
    // Fixed rail width keeps list edges visually aligned across panel levels.
    listRailWidth: 304,
    panelGap: 24,
    panelPadding: 12,
    panelHeaderPaddingX: 16,
    panelHeaderPaddingY: 12,
    panelContentPaddingX: 16,
    panelContentPaddingY: 14,
    panelContentBottomSafePadding: 28,
    stackBottomSafePadding: 28,
    cardPaddingX: 16,
    cardPaddingY: 12,
    rowHeight: 68,
    rowGap: 12,
    maxVisibleColumns: 3,
  },
  leftContext: {
    width: 500,
    minHeight: 580,
  },
} as const;

export type UiConsts = typeof UI_CONSTS;
