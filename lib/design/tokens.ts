import type React from 'react'

// SAO (Sword Art Online) Design System Tokens
// All components should reference these tokens instead of hardcoding values.

export const SAO = {
  color: {
    bg: {
      page:     '#07090d',
      dark:     '#0a0c11',
      panel:    'rgba(231,236,243,0.94)',
      panelAlt: 'rgba(220,227,236,0.90)',
      inset:    'rgba(255,255,255,0.35)',
      overlay:  'rgba(0,0,0,0.55)',
    },
    border: {
      panel:   'rgba(20,23,28,0.78)',
      inner:   'rgba(203,211,221,0.3)',
      subtle:  'rgba(255,255,255,0.48)',
      gold:    'rgba(249,208,105,0.9)',
      goldDim: 'rgba(248,197,78,0.35)',
    },
    text: {
      primary:   '#3d3d3d',
      secondary: 'rgba(80,80,90,0.85)',
      label:     'rgba(100,108,120,1)',
      gold:      'rgba(248,220,152,0.95)',
      goldDim:   'rgba(220,183,100,0.72)',
      onDark:    'rgba(220,228,240,0.72)',
    },
    action: {
      gold:      '#f8c547',
      goldHover: '#fad261',
      blue:      '#3b82f6',
      blueRing:  'rgba(59,130,246,0.6)',
      red:       '#e03e63',
      redRing:   'rgba(224,62,99,0.6)',
      danger:    '#dc2626',
    },
    rarity: {
      Common:    '#9ca3af',
      Uncommon:  '#4ade80',
      Rare:      '#60a5fa',
      Epic:      '#c084fc',
      Legendary: '#fbbf24',
    },
    bar: {
      hp:    '#ef4444',
      mp:    '#3b82f6',
      exp:   '#f8c547',
      track: 'rgba(0,0,0,0.15)',
    },
  },

  shadow: {
    panel:     '0 12px 26px rgba(0,0,0,0.22)',
    panelInset:'inset 0 0 0 1px rgba(255,255,255,0.48)',
    gold:      '0 0 18px rgba(247,196,70,0.16)',
    orbActive: '0 0 0 1px rgba(248,197,78,0.35), 0 0 18px rgba(247,196,70,0.16)',
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
    overlay: `opacity-[0.08] [background-image:linear-gradient(rgba(0,0,0,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.8)_1px,transparent_1px)] [background-size:22px_22px]`,
  },
} as const

// ─── Reusable inline style objects ───────────────────────────────────────────

/** Light panel — LeftContext, SaoAlert, SaoFormPanel, Login */
export const PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(248,249,251,0.97), rgba(238,241,246,0.95))',
  border: `1px solid ${SAO.color.border.panel}`,
  boxShadow: `${SAO.shadow.panelInset}, ${SAO.shadow.panel}`,
  borderRadius: SAO.radius.panel,
}

/** Dark metallic panel — RightPanels navigation frames (SAO anime dark UI style) */
export const DARK_PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(40,42,48,0.97), rgba(31,33,40,0.97))',
  border: '1px solid rgba(88,93,104,0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055), 0 12px 36px rgba(0,0,0,0.62)',
  borderRadius: SAO.radius.panel,
}

export const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: `1px solid rgba(20,23,28,0.35)`,
  borderRadius: SAO.radius.input,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: SAO.color.text.primary,
  width: '100%',
  boxSizing: 'border-box' as const,
}

export const INPUT_FOCUS_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  border: `1px solid ${SAO.color.border.gold}`,
}

export const GOLD_BTN_STYLE: React.CSSProperties = {
  background: SAO.color.action.gold,
  color: '#1a1a1a',
  borderRadius: SAO.radius.input,
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
}

export const GRID_OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.08,
  backgroundImage:
    'linear-gradient(rgba(0,0,0,0.8) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(0,0,0,0.8) 1px,transparent 1px)',
  backgroundSize: '22px 22px',
  pointerEvents: 'none',
}

// ─── SAO icon paths ───────────────────────────────────────────────────────────
// Usage: <img src={SAO_ICON.player} />
// Files are in /public/icons/sao/

export const SAO_ICON = {
  // Orb navigation
  player:    '/icons/sao/Man.svg',
  playerOn:  '/icons/sao/Man_on.svg',
  skills:    '/icons/sao/Skills.svg',
  skillsOn:  '/icons/sao/Skills_on.svg',
  items:     '/icons/sao/Items.svg',
  itemsOn:   '/icons/sao/Items_on.svg',
  quest:     '/icons/sao/Quest & Message Box.svg',
  questOn:   '/icons/sao/Quest & Message Box_on.svg',
  social:    '/icons/sao/Men.svg',
  socialOn:  '/icons/sao/Men_on.svg',
  lifelog:   '/icons/sao/List.svg',
  lifelogOn: '/icons/sao/List_on.svg',
  market:    '/icons/sao/Details.svg',
  marketOn:  '/icons/sao/Details_on.svg',
  config:    '/icons/sao/Config.svg',
  configOn:  '/icons/sao/Config_on.svg',
  option:    '/icons/sao/Option.svg',
  optionOn:  '/icons/sao/Option_on.svg',
  logout:    '/icons/sao/Logout.svg',
  logoutOn:  '/icons/sao/Logout_on.svg',
  // Buttons
  yes:       '/icons/sao/Yes.svg',
  yesOn:     '/icons/sao/Yes_on.svg',
  no:        '/icons/sao/No.svg',
  noOn:      '/icons/sao/No_on.svg',
  plus:      '/icons/sao/Plus.svg',
  plusOn:    '/icons/sao/Plus_on.svg',
  minus:     '/icons/sao/Minus.svg',
  minusOn:   '/icons/sao/Minus_on.svg',
  details:   '/icons/sao/Details.svg',
  detailsOn: '/icons/sao/Details_on.svg',
  list:      '/icons/sao/List.svg',
  listOn:    '/icons/sao/List_on.svg',
  start:     '/icons/sao/Start.svg',
  startOn:   '/icons/sao/Start_on.svg',
  calling:   '/icons/sao/Calling.svg',
  callingOn: '/icons/sao/Calling_on.svg',
  cancel:    '/icons/sao/Cancel & Dissolve.svg',
  cancelOn:  '/icons/sao/Cancel & Dissolve_on.svg',
  // Social
  man:       '/icons/sao/Man.svg',
  manOn:     '/icons/sao/Man_on.svg',
  men:       '/icons/sao/Men.svg',
  menOn:     '/icons/sao/Men_on.svg',
  message:   '/icons/sao/Message.svg',
  messageOn: '/icons/sao/Message_on.svg',
  friend:    '/icons/sao/Friend.svg',
  friendOn:  '/icons/sao/Friend_on.svg',
  guild:     '/icons/sao/Guild.svg',
  guildOn:   '/icons/sao/Guild_on.svg',
  equipment: '/icons/sao/Equipment.svg',
  equipOn:   '/icons/sao/Equipment_on.svg',
  help:      '/icons/sao/Help & Unknown.svg',
  helpOn:    '/icons/sao/Help & Unknown_on.svg',
  invite:    '/icons/sao/Invite.svg',
  inviteOn:  '/icons/sao/Invite_on.svg',
} as const

