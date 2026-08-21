"use client";

/**
 * AmbientOverlay — SAO 홀로그램 HUD 환경 레이어
 *
 * pointer-events: none → 모든 상호작용 통과
 *
 * 포함:
 *  1. 마우스 추적 파란 스팟라이트 (lerp RAF, re-render 없음)
 *  2. 4개 HUD 코너 브라켓
 *  3. 앰비언트 파티클 12개
 */

import { useEffect, useRef } from "react";

// ── 파티클 ─────────────────────────────────────────────────────────────────
type Particle = {
  left: string;
  bottom: string;
  size: number;
  delay: number;
  duration: number;
  color: string;
  drift: number;
};

const PARTICLES: Particle[] = [
  { left: "5%",  bottom: "10%", size: 1.5, delay: 0,   duration: 8.0, color: "rgba(140,180,255,0.65)",  drift:  11 },
  { left: "13%", bottom: "4%",  size: 1.0, delay: 2.4, duration: 9.5, color: "rgba(248,197,78,0.60)",   drift: -13 },
  { left: "21%", bottom: "20%", size: 1.5, delay: 0.9, duration: 8.5, color: "rgba(140,180,255,0.50)",  drift:   8 },
  { left: "30%", bottom: "3%",  size: 1.0, delay: 4.0, duration: 10,  color: "rgba(248,197,78,0.55)",   drift: -15 },
  { left: "39%", bottom: "16%", size: 2.0, delay: 1.5, duration: 7.8, color: "rgba(140,180,255,0.70)",  drift:  17 },
  { left: "50%", bottom: "7%",  size: 1.0, delay: 3.8, duration: 9.0, color: "rgba(248,197,78,0.55)",   drift:  -9 },
  { left: "60%", bottom: "23%", size: 1.5, delay: 0.5, duration: 9.8, color: "rgba(140,180,255,0.58)",  drift:  12 },
  { left: "69%", bottom: "3%",  size: 1.0, delay: 5.2, duration: 8.2, color: "rgba(248,197,78,0.52)",   drift: -17 },
  { left: "77%", bottom: "18%", size: 2.0, delay: 1.8, duration: 8.6, color: "rgba(140,180,255,0.62)",  drift:  15 },
  { left: "84%", bottom: "7%",  size: 1.0, delay: 3.1, duration: 10,  color: "rgba(248,197,78,0.58)",   drift: -11 },
  { left: "91%", bottom: "13%", size: 1.5, delay: 1.0, duration: 7.5, color: "rgba(140,180,255,0.55)",  drift:  10 },
  { left: "46%", bottom: "29%", size: 1.0, delay: 6.1, duration: 10,  color: "rgba(248,197,78,0.45)",   drift: -12 },
];

// ── 코너 브라켓 ─────────────────────────────────────────────────────────────
type BracketPos = { top?: number; bottom?: number; left?: number; right?: number };
const CORNERS: Array<{ pos: BracketPos; borders: React.CSSProperties; delay: string }> = [
  {
    pos: { top: 18, left: 18 },
    borders: { borderTop: "1px solid rgba(120,170,255,0.35)", borderLeft: "1px solid rgba(120,170,255,0.35)" },
    delay: "0s",
  },
  {
    pos: { top: 18, right: 18 },
    borders: { borderTop: "1px solid rgba(120,170,255,0.35)", borderRight: "1px solid rgba(120,170,255,0.35)" },
    delay: "0.7s",
  },
  {
    pos: { bottom: 18, left: 18 },
    borders: { borderBottom: "1px solid rgba(120,170,255,0.35)", borderLeft: "1px solid rgba(120,170,255,0.35)" },
    delay: "1.4s",
  },
  {
    pos: { bottom: 18, right: 18 },
    borders: { borderBottom: "1px solid rgba(120,170,255,0.35)", borderRight: "1px solid rgba(120,170,255,0.35)" },
    delay: "2.1s",
  },
];

export default function AmbientOverlay() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let targetX = 50, targetY = 50;
    let currentX = 50, currentY = 50;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth)  * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.055;
      currentY += (targetY - currentY) * 0.055;
      if (spotlightRef.current) {
        const dx = (currentX - 50) * 0.55;
        const dy = (currentY - 50) * 0.55;
        spotlightRef.current.style.transform = `translate(${dx}%, ${dy}%)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="lag-ambient-overlay pointer-events-none fixed inset-0"
      style={{ zIndex: 8000 }}
      aria-hidden
    >
      {/* ── 마우스 팔로우 파란 스팟라이트 ──────────────────────────── */}
      <div
        ref={spotlightRef}
        className="absolute"
        style={{
          width: "200vw",
          height: "200vh",
          top: "-50vh",
          left: "-50vw",
          background:
            "radial-gradient(circle at 50% 50%, rgba(82,127,214,0.11) 0%, rgba(82,127,214,0.05) 28%, transparent 52%)",
          willChange: "transform",
        }}
      />

      {/* ── HUD 코너 브라켓 ──────────────────────────────────────── */}
      {CORNERS.map((c, i) => (
        <div
          key={i}
          className="sao-bracket absolute"
          style={{
            ...c.pos,
            width: 28,
            height: 28,
            animationDelay: c.delay,
            ...c.borders,
          }}
        />
      ))}

      {/* ── 앰비언트 파티클 ─────────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={
            {
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              background: p.color,
              "--drift": `${p.drift}px`,
              animation: `sao-particle ${p.duration}s ${p.delay}s ease-in-out infinite`,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
