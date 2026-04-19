import type React from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  SAO (Sword Art Online) Design System — Dark Hologram Edition
//
//  실제 SAO 애니메이션 UI 색채 기준:
//  • 패널:   깊은 네이비 다크 (#040918) + 시안 네온 엣지 (#00c8ff)
//  • 텍스트: 밝은 블루-화이트 (rgba(200,228,255)) — 다크 패널 위
//  • 악센트: 골드 (#f8c547) 선택 상태, 시안 (#00c8ff) UI 엣지
//  • 바탕:   거의 블랙 (#06080e)
// ═══════════════════════════════════════════════════════════════════════════

export const SAO = {
  color: {
    bg: {
      page:     '#06080e',
      dark:     '#08090f',
      panel:    'rgba(4,9,24,0.92)',
      panelAlt: 'rgba(3,7,20,0.89)',
      inset:    'rgba(0,28,68,0.55)',    // 셀/카드 안쪽 다크 블루 글래스
      overlay:  'rgba(0,0,0,0.65)',
    },
    border: {
      panel:   'rgba(0,190,255,0.32)',   // SAO 시그니처 시안
      inner:   'rgba(0,150,220,0.22)',   // 내부 구분선
      subtle:  'rgba(0,120,200,0.14)',   // 매우 흐린 시안
      gold:    'rgba(249,208,105,0.90)', // 골드 선택 테두리
      goldDim: 'rgba(248,197,78,0.35)',  // 흐린 골드
    },
    text: {
      primary:   'rgba(200,228,255,0.92)', // 밝은 블루-화이트 (메인)
      secondary: 'rgba(140,175,220,0.70)', // 미디엄 블루
      label:     'rgba(90,128,178,0.62)',  // 딤 블루 (마이크로 레이블)
      gold:      'rgba(248,220,152,0.95)', // 골드 텍스트
      goldDim:   'rgba(220,183,100,0.72)',
      onDark:    'rgba(180,215,255,0.80)',
    },
    action: {
      gold:      '#f8c547',
      goldHover: '#fad261',
      blue:      '#3b82f6',
      blueRing:  'rgba(59,130,246,0.6)',
      red:       '#e03e63',
      redRing:   'rgba(224,62,99,0.6)',
      danger:    '#dc2626',
      cyan:      '#00c8ff',             // SAO 시안 (새로 추가)
      cyanDim:   'rgba(0,200,255,0.55)',
    },
    rarity: {
      Common:    '#9ca3af',
      Uncommon:  '#4ade80',
      Rare:      '#38bdf8',             // 더 밝은 하늘색
      Epic:      '#c084fc',
      Legendary: '#fbbf24',
    },
    bar: {
      hp:    '#f43f5e',                  // 더 밝은 레드
      mp:    '#38bdf8',                  // 하늘색
      exp:   '#f8c547',
      track: 'rgba(0,25,70,0.65)',       // 다크 패널용 트랙
    },
  },

  shadow: {
    panel:     '0 16px 44px rgba(0,0,0,0.62)',
    panelInset:'inset 0 0 0 1px rgba(0,190,255,0.08)',
    gold:      '0 0 22px rgba(247,196,70,0.22)',
    orbActive: '0 0 0 1px rgba(248,197,78,0.40), 0 0 24px rgba(247,196,70,0.22)',
    cyan:      '0 0 22px rgba(0,190,255,0.22)',   // 시안 글로우 (새로 추가)
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
    overlay: `opacity-[0.08] [background-image:linear-gradient(rgba(0,190,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,190,255,0.15)_1px,transparent_1px)] [background-size:22px_22px]`,
  },
} as const

// ─── Reusable inline style objects ───────────────────────────────────────────

/**
 * 다크 홀로그램 패널 — SAO 진짜 UI 스타일
 * 깊은 네이비 + 시안 네온 엣지 + glassmorphism
 */
export const PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(155deg, rgba(5,10,28,0.93), rgba(3,8,22,0.91))',
  border: '1px solid rgba(0,190,255,0.32)',
  boxShadow: [
    'inset 0 0 0 1px rgba(0,190,255,0.07)',
    '0 0 0 1px rgba(0,160,255,0.10)',
    '0 16px 44px rgba(0,0,0,0.60)',
    '0 0 36px rgba(0,130,255,0.10)',
  ].join(', '),
  borderRadius: SAO.radius.panel,
  backdropFilter: 'blur(18px) saturate(1.5)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
}

/** 다크 메탈릭 패널 — 리스트 아이템 컨텍스트 */
export const DARK_PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(3,7,22,0.97), rgba(2,5,18,0.97))',
  border: '1px solid rgba(0,190,255,0.35)',
  boxShadow: [
    'inset 0 1px 0 rgba(0,190,255,0.10)',
    '0 0 0 1px rgba(0,160,255,0.10)',
    '0 14px 44px rgba(0,0,0,0.75)',
    '0 0 32px rgba(0,130,255,0.12)',
  ].join(', '),
  borderRadius: SAO.radius.panel,
}

/** 인풋 — 다크 글래스 + 시안 포커스 */
export const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(0,20,55,0.72)',
  border: '1px solid rgba(0,150,220,0.30)',
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
  background: 'rgba(0,25,65,0.82)',
}

/** 골드 버튼 — 선택/확인 액션 */
export const GOLD_BTN_STYLE: React.CSSProperties = {
  background: SAO.color.action.gold,
  color: '#12100a',
  borderRadius: SAO.radius.input,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
}

/** 그리드 오버레이 — 다크 패널 위 시안 그리드 */
export const GRID_OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.10,
  backgroundImage:
    'linear-gradient(rgba(0,190,255,0.20) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(0,190,255,0.20) 1px,transparent 1px)',
  backgroundSize: '22px 22px',
  pointerEvents: 'none',
}

// ─── SAO icon paths ───────────────────────────────────────────────────────────
export const SAO_ICON = {
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
