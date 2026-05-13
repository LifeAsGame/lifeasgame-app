export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Spring configs — 스프링 물리 기반으로 "실재감" 부여
const SNAP   = { type: "spring", stiffness: 500, damping: 30 } as const;
const FLOAT  = { type: "spring", stiffness: 360, damping: 28 } as const;
const GENTLE = { type: "spring", stiffness: 280, damping: 26 } as const;

export const MOTION = {
  // ── 패널 진입 (우→좌 슬라이드, 스프링으로 리바운드) ──────────────────
  panelReset: {
    initial:    { opacity: 0, x: 28, scale: 0.97 },
    animate:    { opacity: 1, x: 0,  scale: 1    },
    exit:       { opacity: 0, x: -14, scale: 0.97 },
    transition: FLOAT,
  },
  panelSwap: {
    initial:    { opacity: 0, x: 32, scale: 0.97 },
    animate:    { opacity: 1, x: 0,  scale: 1    },
    exit:       { opacity: 0, x: -14, scale: 0.97 },
    transition: FLOAT,
  },
  panelSlot: {
    initial:    { opacity: 0, x: 24, scale: 0.97 },
    animate:    { opacity: 1, x: 0,  scale: 1    },
    exit:       { opacity: 0, x: -10, scale: 0.97 },
    transition: FLOAT,
  },
  panelContentSwap: {
    initial:    { opacity: 0, x: 22, scale: 0.98 },
    animate:    { opacity: 1, x: 0,  scale: 1    },
    exit:       { opacity: 0, x: -10, scale: 0.97 },
    transition: FLOAT,
  },

  // ── 리스트 아이템 — 스태거와 함께 쓸 때 delay를 index*0.04 로 ────────
  listItem: {
    initial:    { opacity: 0, x: 14 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: 8  },
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },

  // ── 홀로그램 in — 모달, 폼, 스페셜 패널 ──────────────────────────────
  hologramIn: {
    initial:    { opacity: 0, y: 18, scale: 0.94 },
    animate:    { opacity: 1, y: 0,  scale: 1    },
    exit:       { opacity: 0, y: -10, scale: 0.95 },
    transition: GENTLE,
  },

  // ── 액션 버튼 팝 — 롱프레스 후 버튼 등장 ─────────────────────────────
  actionPop: {
    initial:    { scale: 0, opacity: 0, rotate: -18 },
    animate:    { scale: 1, opacity: 1, rotate: 0   },
    exit:       { scale: 0, opacity: 0, rotate: 18  },
    transition: SNAP,
  },

  // ── 오브 트랙 ────────────────────────────────────────────────────────
  orbTrack: {
    transition: { type: "tween", duration: 0.34, ease: EASE_OUT },
  },
} as const;
