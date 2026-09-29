"use client";

import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import SelectionConnections from "./SelectionConnections";
import type { MainNavId } from "@/entities/nav";

export default function ConsumerShell({ open, main, home, utilities, children, onOpen, onClose, onMenu }: {
  open: boolean; main: MainNavId | null; home: React.ReactNode; utilities: React.ReactNode; children: React.ReactNode;
  onOpen: () => void; onClose: () => void; onMenu: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const caller = useRef<HTMLElement | null>(null);
  const previousOpen = useRef(false);
  const reduced = useReducedMotion();
  const [geometry, setGeometry] = useState({ width: 1000, mobile: false, detail: false });

  useLayoutEffect(() => {
    const root = dialog.current;
    if (!root) return;
    const update = () => {
      const width = Math.min(1110, window.innerWidth - (window.innerWidth < 900 ? 32 : 72));
      const mobile = window.innerWidth < 900;
      const detail = Boolean(root.querySelector(':is([data-stage-key="journey-detail"], [data-stage-key="lifelog-journal-detail"], [data-stage-key="lifelog-quick-record"]):not([aria-hidden="true"])'));
      setGeometry((old) => old.width === width && old.mobile === mobile && old.detail === detail ? old : { width, mobile, detail });
    };
    const observer = new MutationObserver(update);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-hidden"] });
    update();
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    if (open && !previousOpen.current) {
      caller.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : trigger.current;
      dialog.current?.querySelector<HTMLButtonElement>(main ? `[data-menu-id="${main}"]` : "[data-menu-id]")?.focus({ preventScroll: true });
    } else if (!open && previousOpen.current) {
      (caller.current?.isConnected ? caller.current : trigger.current)?.focus({ preventScroll: true });
    }
    previousOpen.current = open;
  }, [open, main]);

  const showMenu = () => {
    const selected = dialog.current?.querySelector<HTMLButtonElement>('[data-menu-id][aria-pressed="true"]');
    onMenu();
    requestAnimationFrame(() => { if (previousOpen.current) selected?.focus({ preventScroll: true }); });
  };
  const leftWidth = Math.min(420, (geometry.width - 104) / 2);
  const detailLeft = Math.max(0, (geometry.width - (leftWidth * 2 + 104)) / 2);
  const railX = (main === "quests" || main === "lifelog") && geometry.detail && !geometry.mobile ? detailLeft + leftWidth + 20 : 0;
  return (
    <MotionConfig reducedMotion="user">
      <div className="sao-consumer" role={open ? "dialog" : undefined} aria-label={open ? "시스템 메뉴" : undefined} aria-modal={open ? true : undefined}
          onKeyDown={(event) => {
            if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="dialog"]') !== event.currentTarget) return;
            if (event.key === "Escape") {
              event.preventDefault();
              const backs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[aria-label^="Back to"]')].filter((button) => !button.closest('[inert], [aria-hidden="true"]') && button.getClientRects().length);
              if (backs.length) backs.at(-1)?.click(); else if (main) showMenu(); else onClose();
            }
            if (event.key === "Tab") {
              const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter((node) => !node.closest('[inert], [aria-hidden="true"]') && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
              const first = nodes[0], last = nodes.at(-1);
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }); }
            }
          }}>
        <div className="sao-home" inert={open} aria-hidden={open || undefined}>
          <header className="sao-mast"><span>LIFE <span>AS</span> GAME</span></header>
          {home}
        </div>
        <div className="sao-global-utilities">{utilities}</div>
        <button ref={trigger} type="button" className="sao-menu-toggle" onClick={onOpen} aria-expanded={open} aria-controls="consumer-system-menu">◎ <span>시스템 메뉴</span></button>
        <motion.div ref={dialog} id="consumer-system-menu" className="sao-menu-layer" role="region" aria-label="메뉴 패널"
          aria-hidden={!open || undefined} inert={!open} data-open={open} data-main={main ?? "menu"} data-detail={geometry.detail}
          initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.16 }}
          >
          <header className="sao-menu-chrome"><div><span>SYSTEM MENU</span><h1>{main ? "Life As Game" : "오늘의 여정을 선택하세요"}</h1></div><div><button type="button" onClick={showMenu}>전체 메뉴</button><button type="button" onClick={onClose}>닫기 <span aria-hidden>×</span></button></div></header>
          <motion.div className="sao-stage" initial={false} animate={{ "--sao-rail-x": `${railX}px` }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 361, damping: 38 }}
            style={{ "--sao-detail-left": `${detailLeft}px`, "--sao-left-width": `${leftWidth}px`, "--sao-right-width": `${Math.min(440, geometry.width - 104)}px` } as React.CSSProperties}>
            {children}
            <SelectionConnections active={open && Boolean(main)} />
          </motion.div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
