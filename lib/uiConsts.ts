export const UI_CONSTS = {
  layout: {
    // Reference image estimate (landscape): left card ~35%, center orb rail ~12%, right panels ~53%
    leftWidth: 520,
    centerWidth: 176,
    rightMinWidth: 560,
    columnGap: 28,
    canvasMinHeight: 860,
    pagePaddingX: 48,
    pagePaddingY: 34,
    canvasEndPaddingX: 80,
    canvasEndPaddingY: 32,
  },
  orbNav: {
    viewportHeight: 560,
    orbSize: 88,
    orbGap: 34,
    framePaddingY: 12,
    safePaddingY: 32,
    labelGap: 8,
    labelHeight: 18,
    labelPaddingY: 2,
    outerRingPadding: 4,
    inactiveGlow: 0.12,
    activeGlow: 0.35,
  },
  rightPanels: {
    panelWidth: 330,
    panelGap: 18,
    panelPadding: 12,
    panelHeaderPaddingX: 16,
    panelHeaderPaddingY: 12,
    panelContentPaddingX: 16,
    panelContentPaddingY: 14,
    panelContentBottomSafePadding: 28,
    stackBottomSafePadding: 28,
    cardPaddingX: 18,
    cardPaddingY: 14,
    rowHeight: 86,
    rowGap: 10,
    maxVisibleColumns: 3,
  },
  leftContext: {
    width: 500,
    minHeight: 580,
  },
} as const;

export type UiConsts = typeof UI_CONSTS;
