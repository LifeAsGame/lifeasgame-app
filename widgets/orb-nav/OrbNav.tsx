"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { MainNavId } from "@/entities/nav";

const ICONS: Record<MainNavId, string> = {
  player: "M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 11h6v3l6 3v5H3v-5l6-3Z",
  inventory: "M8 3h8l2 5h3l-1 14H4L3 8h3l2-5Zm2 2L9 8h6l-1-3h-4Z",
  quests: "M5 2h14v20l-7-4-7 4V2Zm6 4v3H8v2h3v3h2v-3h3V9h-3V6Z",
  role: "M8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 11h10v9H2v-6Zm11 2h6l2 3v5h-8Z",
  lifelog: "M4 2h13v3h3v17H4V2Zm4 5v2h6V7Zm0 5v2h8v-2Zm0 5v2h8v-2Z",
  market: "M3 6h13V3l6 5-6 5v-3H3V6Zm18 12H8v3l-6-5 6-5v3h13v4Z",
  system: "M9 2h6l1 4 4 1 2 5-3 3-1 5-5 2-3-3-5-1-2-5 3-3 1-5Zm3 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
};
const CAPTIONS: Record<MainNavId, string> = { player: "나의 성장", inventory: "가지고 있는 것", quests: "이어가는 여정", role: "삶의 여러 역할", lifelog: "일상의 기록", market: "자산과 교환", system: "나에게 맞추기" };

type OrbItem = { id: MainNavId; label: string; slotLabel: string };
type OrbNavProps = { items: OrbItem[]; selectedId: MainNavId | null; onSelect: (id: MainNavId) => void; zIndex?: number; onFocus?: () => void };

export default function OrbNav({ items, selectedId, onSelect, zIndex, onFocus }: OrbNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: "instant" }); }, [selectedId]);
  return (
    <nav className="lag-orb-nav" aria-label="System menu" data-compact={Boolean(selectedId)} onPointerDownCapture={onFocus} style={{ zIndex }}>
      <div ref={scrollRef} className="lag-orb-scroll" onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")].filter((button) => button.getClientRects().length);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        event.preventDefault();
        buttons[next]?.focus({ preventScroll: true });
        buttons[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }}>
        <div className="lag-orb-track">
          {items.map((item, index) => <OrbButton key={item.id} item={item} index={index} selectedId={selectedId} onSelect={onSelect} />)}
        </div>
      </div>
    </nav>
  );
}


function OrbButton({ item, index, selectedId, onSelect }: { item: OrbItem; index: number; selectedId: MainNavId | null; onSelect: OrbNavProps["onSelect"] }) {
  const button = useRef<HTMLButtonElement>(null);
  const initialized = useRef(false);
  const reduced = useReducedMotion();
  const layoutTop = useMotionValue(0);
  const position = useSpring(0, { stiffness: 484, damping: 44, mass: 1 });
  const y = useTransform(() => position.get() - layoutTop.get());

  useLayoutEffect(() => {
    const update = () => {
      const target = button.current?.offsetTop ?? 0;
      layoutTop.set(target);
      // Keep one spring per menu ID. Changing its destination retains position and velocity
      // while the underlying DOM is immediately reordered for keyboard navigation.
      if (!initialized.current || reduced || window.innerWidth < 900) position.jump(target);
      else position.set(target);
      initialized.current = true;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [index, selectedId, reduced, layoutTop, position]);

  return <motion.button ref={button} type="button" data-menu-id={item.id} style={{ y }}
    className="lag-orb-item" aria-label={item.label} aria-pressed={selectedId === item.id} aria-current={selectedId === item.id ? "page" : undefined}
    onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onSelect(item.id); }}>
    <span className="lag-orb-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d={ICONS[item.id]} /></svg></span>
    <span className="lag-orb-label">{item.label}<small>{CAPTIONS[item.id]}</small></span>
  </motion.button>;
}
