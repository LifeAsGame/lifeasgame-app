import type React from 'react'
import { SAO } from './colors'

/** Dark warm RPG panel — used everywhere (LeftContext, SaoAlert, login, etc.) */
export const PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(18,15,10,0.98), rgba(14,12,8,0.97))',
  border: `1px solid ${SAO.color.border.panel}`,
  boxShadow: [
    SAO.shadow.panelInset,
    SAO.shadow.panel,
  ].join(', '),
  borderRadius: SAO.radius.panel,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}

/** Legacy dark metallic panel — kept for backward compat */
export const DARK_PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(3,7,22,0.97), rgba(2,5,18,0.97))',
  border: '1px solid rgba(0,190,255,0.35)',
  boxShadow: [
    'inset 0 1px 0 rgba(0,190,255,0.10)',
    '0 14px 44px rgba(0,0,0,0.75)',
  ].join(', '),
  borderRadius: SAO.radius.panel,
}

/** Input — warm dark style for all panels */
export const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(218,178,55,0.08)',
  border: `1px solid ${SAO.color.border.inner}`,
  borderRadius: SAO.radius.input,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: SAO.color.text.primary,
  width: '100%',
  boxSizing: 'border-box' as const,
}

/** v7 dual-theme semantic control — use on migrated authenticated surfaces. */
export const SEMANTIC_CONTROL_STYLE: React.CSSProperties = {
  background: 'var(--lag-control-bg)',
  border: '1px solid var(--lag-control-border)',
  borderRadius: 'var(--lag-radius-sm)',
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: 'var(--lag-control-text)',
  width: '100%',
  boxSizing: 'border-box',
}

export const INPUT_FOCUS_STYLE: React.CSSProperties = {
  background: 'rgba(218,178,55,0.12)',
  border: `1px solid ${SAO.color.border.gold}`,
  borderRadius: SAO.radius.input,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: SAO.color.text.primary,
  width: '100%',
  boxSizing: 'border-box' as const,
}

/** Dark input — same as INPUT_STYLE, kept for backward compat */
export const INPUT_STYLE_DARK: React.CSSProperties = {
  background: 'rgba(218,178,55,0.08)',
  border: `1px solid ${SAO.color.border.inner}`,
  borderRadius: SAO.radius.input,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.875rem',
  letterSpacing: '0.04em',
  color: SAO.color.text.primary,
  width: '100%',
  boxSizing: 'border-box' as const,
}

/** Gold CTA button */
export const GOLD_BTN_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fad261, #f8c547 55%, #d4a825)',
  color: '#12100a',
  borderRadius: SAO.radius.input,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 0 18px rgba(212,168,37,0.30), inset 0 0 0 1px rgba(255,240,160,0.22)',
}

/** Grid overlay — warm gold grid on dark panels */
export const GRID_OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.04,
  backgroundImage:
    'linear-gradient(rgba(218,178,55,0.5) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(218,178,55,0.5) 1px,transparent 1px)',
  backgroundSize: '22px 22px',
  pointerEvents: 'none',
}
