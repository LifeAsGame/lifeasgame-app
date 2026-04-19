import type React from 'react'
import { SAO } from './colors'

/** Light premium panel — LeftContext, SaoAlert, login */
export const PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(252,253,255,0.98), rgba(242,245,252,0.96))',
  border: '1px solid rgba(0,0,0,0.09)',
  boxShadow: [
    'inset 0 0 0 1px rgba(255,255,255,0.60)',
    '0 12px 40px rgba(0,0,0,0.22)',
    '0 2px 8px rgba(0,0,0,0.10)',
  ].join(', '),
  borderRadius: SAO.radius.panel,
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
}

/** Dark metallic panel — for dark-context usage */
export const DARK_PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(3,7,22,0.97), rgba(2,5,18,0.97))',
  border: '1px solid rgba(0,190,255,0.35)',
  boxShadow: [
    'inset 0 1px 0 rgba(0,190,255,0.10)',
    '0 14px 44px rgba(0,0,0,0.75)',
  ].join(', '),
  borderRadius: SAO.radius.panel,
}

/** Light input — for use inside light panels (LeftContext) */
export const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(0,0,0,0.14)',
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
  background: 'rgba(255,255,255,0.88)',
}

/** Dark input — for use inside dark panels (RightPanels forms) */
export const INPUT_STYLE_DARK: React.CSSProperties = {
  background: 'rgba(0,20,55,0.72)',
  border: '1px solid rgba(0,150,220,0.30)',
  borderRadius: SAO.radius.input,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: 'rgba(200,228,255,0.92)',
  width: '100%',
  boxSizing: 'border-box' as const,
}

/** Gold CTA button */
export const GOLD_BTN_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fad261, #f8c547 55%, #e8b030)',
  color: '#12100a',
  borderRadius: SAO.radius.input,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 0 16px rgba(248,197,78,0.22), inset 0 0 0 1px rgba(255,240,160,0.20)',
}

/** Grid overlay — very subtle on light panels */
export const GRID_OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.04,
  backgroundImage:
    'linear-gradient(rgba(0,0,0,0.6) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(0,0,0,0.6) 1px,transparent 1px)',
  backgroundSize: '22px 22px',
  pointerEvents: 'none',
}
