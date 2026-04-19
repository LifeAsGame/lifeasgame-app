export const SAO = {
  color: {
    bg: {
      page:     '#06080e',
      dark:     '#08090f',
      panel:    'rgba(248,249,252,0.97)',
      panelAlt: 'rgba(238,241,248,0.95)',
      inset:    'rgba(0,0,0,0.055)',
      overlay:  'rgba(0,0,0,0.60)',
    },
    border: {
      panel:   'rgba(0,0,0,0.11)',
      inner:   'rgba(0,0,0,0.07)',
      subtle:  'rgba(0,0,0,0.04)',
      gold:    'rgba(249,208,105,0.90)',
      goldDim: 'rgba(248,197,78,0.35)',
    },
    text: {
      primary:   '#2a3248',
      secondary: 'rgba(55,70,100,0.78)',
      label:     'rgba(88,105,138,0.82)',
      gold:      'rgba(180,130,20,0.95)',
      goldDim:   'rgba(160,110,18,0.72)',
      onDark:    'rgba(200,228,255,0.90)',
    },
    action: {
      gold:      '#f8c547',
      goldHover: '#fad261',
      blue:      '#3b82f6',
      blueRing:  'rgba(59,130,246,0.6)',
      red:       '#e03e63',
      redRing:   'rgba(224,62,99,0.6)',
      danger:    '#dc2626',
      cyan:      '#00c8ff',
      cyanDim:   'rgba(0,200,255,0.55)',
    },
    rarity: {
      Common:    '#9ca3af',
      Uncommon:  '#22c55e',
      Rare:      '#38bdf8',
      Epic:      '#a855f7',
      Legendary: '#f59e0b',
    },
    bar: {
      hp:    '#f43f5e',
      mp:    '#38bdf8',
      exp:   '#f8c547',
      track: 'rgba(0,0,0,0.12)',
    },
  },

  shadow: {
    panel:      '0 12px 40px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
    panelInset: 'inset 0 0 0 1px rgba(255,255,255,0.55)',
    gold:       '0 0 18px rgba(247,196,70,0.20)',
    orbActive:  '0 0 0 1px rgba(248,197,78,0.40), 0 0 20px rgba(247,196,70,0.18)',
    cyan:       '0 0 18px rgba(0,190,255,0.18)',
  },

  font: {
    label: 'text-[10px] uppercase tracking-[0.28em]',
    title: 'text-xl font-semibold uppercase tracking-[0.12em]',
    value: 'text-sm tracking-[0.06em]',
    name:  'text-3xl font-semibold tracking-[0.08em]',
  },

  radius: {
    panel:  '2px',
    button: '9999px',
    input:  '2px',
  },

  grid: {
    overlay: `opacity-[0.05] [background-image:linear-gradient(rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.6)_1px,transparent_1px)] [background-size:22px_22px]`,
  },
} as const
