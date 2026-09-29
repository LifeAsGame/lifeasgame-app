"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import UtilityPortal from "./UtilityPortal";
import { MOTION } from "@/shared/lib/motion";

export type SaoAlertProps = { isOpen: boolean; title: string; message?: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; cancelLabel?: string; alertOnly?: boolean };

function OpenDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "확인", cancelLabel = "취소", alertOnly = false }: SaoAlertProps) {
  const dialog = useRef<HTMLDivElement>(null), cancel = useRef<HTMLButtonElement>(null), confirm = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!isOpen) return;
    const caller = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (alertOnly ? confirm : cancel).current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => (alertOnly ? confirm : cancel).current?.focus({ preventScroll: true }));
    return () => { cancelAnimationFrame(frame); if (caller?.isConnected) caller.focus({ preventScroll: true }); };
  }, [isOpen, alertOnly]);
  return <motion.div className="lag-dialog-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduced ? { duration: 0 } : MOTION.panelContentSwap.transition}>
    <motion.div ref={dialog} className="lag-sao-dialog" role={alertOnly ? "alertdialog" : "dialog"} aria-modal="true" aria-label={title} aria-description={message} tabIndex={-1}
      initial={reduced ? false : MOTION.hologramIn.initial} animate={MOTION.hologramIn.animate} exit={reduced ? { opacity: 0 } : MOTION.hologramIn.exit} transition={reduced ? { duration: 0 } : MOTION.hologramIn.transition}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); }
        if (event.key === "Enter" && event.target === dialog.current) event.preventDefault();
        if (event.key === "Tab") {
          const first = confirm.current, last = alertOnly ? first : cancel.current;
          if (event.shiftKey && (event.target === first || event.target === dialog.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (event.target === last || event.target === dialog.current)) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header><h3>{title}</h3></header><div className="lag-dialog-message">{message}</div>
      <footer><button ref={confirm} type="button" className="lag-dialog-confirm" onClick={onConfirm}><span aria-hidden>○</span>{confirmLabel}</button>
        {!alertOnly ? <button ref={cancel} type="button" className="lag-dialog-cancel" onClick={onCancel}><span aria-hidden>×</span>{cancelLabel}</button> : null}</footer>
    </motion.div>
  </motion.div>;
}

export default function SaoAlert(props: SaoAlertProps) {
  return <UtilityPortal>{props.isOpen ? <OpenDialog {...props} /> : null}</UtilityPortal>;
}
