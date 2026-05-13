export const SAO = {
  color: {
    bg: {
      page:     '#080a07',
      dark:     '#0c0e09',
      panel:    'rgba(16,14,10,0.97)',
      panelAlt: 'rgba(20,18,13,0.95)',
      inset:    'rgba(218,178,55,0.07)',
      overlay:  'rgba(0,0,0,0.72)',
    },
    border: {
      panel:   'rgba(200,165,50,0.42)',
      inner:   'rgba(200,165,50,0.24)',
      subtle:  'rgba(200,165,50,0.12)',
      gold:    'rgba(218,178,55,0.88)',
      goldDim: 'rgba(200,165,50,0.38)',
    },
    text: {
      primary:   'rgba(235,218,175,0.96)',
      secondary: 'rgba(190,175,138,0.88)',
      label:     'rgba(150,138,100,0.82)',
      gold:      'rgba(230,190,70,0.98)',
      goldDim:   'rgba(210,172,55,0.75)',
      onDark:    'rgba(235,218,175,0.96)',
    },
    action: {
      gold:      '#d4a825',
      goldHover: '#e0b830',
      blue:      '#4a9eff',
      blueRing:  'rgba(74,158,255,0.55)',
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
      exp:   '#d4a825',
      track: 'rgba(255,255,255,0.10)',
    },
  },

  shadow: {
    panel:      '0 16px 48px rgba(0,0,0,0.70), 0 4px 12px rgba(0,0,0,0.40)',
    panelInset: 'inset 0 0 0 1px rgba(218,178,55,0.12)',
    gold:       '0 0 22px rgba(212,168,37,0.28)',
    orbActive:  '0 0 0 1px rgba(218,178,55,0.50), 0 0 22px rgba(212,168,37,0.22)',
    cyan:       '0 0 18px rgba(0,190,255,0.18)',
  },

  font: {
    label: 'text-[10px] uppercase tracking-[0.28em]',
    title: 'text-xl font-semibold uppercase tracking-[0.12em]',
    value: 'text-sm tracking-[0.06em]',
    name:  'text-3xl font-semibold tracking-[0.08em]',
  },

  radius: {
    panel:  '5px',
    button: '9999px',
    input:  '4px',
  },

  grid: {
    overlay: `opacity-[0.04] [background-image:linear-gradient(rgba(218,178,55,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(218,178,55,0.35)_1px,transparent_1px)] [background-size:22px_22px]`,
  },
} as const
