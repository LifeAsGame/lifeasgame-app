"use client";

/**
 * ParticleBackground
 *
 * SAO 가상현실 공간감을 주는 인터랙티브 파티클 배경.
 *
 * - 70여 개의 파란/골드 파티클이 공간을 부유
 * - 가까운 파티클 사이에 얇은 파란 선 연결 (신경망/데이터 그리드 느낌)
 * - 마우스 호버 시 파티클이 부드럽게 밀려남 (detectsOn: "window")
 * - pointer-events: none → 모든 UI 인터랙션 통과
 */

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const OPTIONS: ISourceOptions = {
  fpsLimit: 60,
  fullScreen: {
    enable: true,
    zIndex: 2,
  },
  particles: {
    number: {
      value: 72,
      density: {
        enable: true,
        width: 1920,
        height: 1080,
      },
    },
    color: {
      value: ["#8ab4ff", "#f8c547", "#5878d0", "#a0c0ff"],
    },
    shape: {
      type: "circle",
    },
    opacity: {
      value: { min: 0.08, max: 0.48 },
      animation: {
        enable: true,
        speed: 0.4,
        sync: false,
      },
    },
    size: {
      value: { min: 0.5, max: 2.2 },
      animation: {
        enable: true,
        speed: 0.7,
        sync: false,
      },
    },
    // 파티클 간 연결선 — 데이터 그리드/신경망 느낌
    links: {
      enable: true,
      distance: 115,
      color: "#4a7dd4",
      opacity: 0.16,
      width: 0.65,
    },
    move: {
      enable: true,
      speed: 0.32,
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
  },
  interactivity: {
    // window 기반 감지 → pointer-events: none 이어도 hover 작동
    detectsOn: "window",
    events: {
      onHover: {
        enable: true,
        mode: "repulse",
      },
      onClick: {
        enable: false,
      },
    },
    modes: {
      repulse: {
        distance: 90,
        duration: 0.55,
        speed: 0.45,
        factor: 1.6,
      },
    },
  },
  detectRetina: true,
  background: {
    color: "transparent",
  },
};

export default function ParticleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return <Particles id="sao-particles" options={OPTIONS} />;
}
