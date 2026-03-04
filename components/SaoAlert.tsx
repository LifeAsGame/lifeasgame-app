"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { SAO, PANEL_STYLE, GRID_OVERLAY_STYLE, SAO_ICON } from "@/lib/design/tokens";

export type SaoAlertProps = {
  isOpen: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function SaoAlert({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Yes",
  cancelLabel = "No",
}: SaoAlertProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="sao-alert-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 9999999,
            backdropFilter: "blur(2px)",
            background: SAO.color.bg.overlay,
          }}
          onClick={onCancel}
        >
          <motion.div
            key="sao-alert-panel"
            initial={{ scale: 0.88, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 4 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative overflow-hidden"
            style={{
              ...PANEL_STYLE,
              width: 380,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), ${SAO.shadow.panelInset}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grid overlay */}
            <div style={GRID_OVERLAY_STYLE} />

            {/* Header */}
            <div
              className="relative px-6 py-4"
              style={{
                background: "linear-gradient(180deg, #e8eaed, #d8dce2)",
              }}
            >
              <p
                className="text-center text-sm font-semibold uppercase"
                style={{
                  letterSpacing: "0.16em",
                  color: SAO.color.text.primary,
                }}
              >
                {title}
              </p>
            </div>

            {/* Double divider line for depth */}
            <div
              style={{
                height: 0,
                borderTop: `1px solid rgba(20,23,28,0.3)`,
                borderBottom: `1px solid rgba(255,255,255,0.6)`,
              }}
            />

            {/* Body */}
            {message ? (
              <div className="relative px-6 py-5">
                <div
                  className="rounded-sm px-4 py-3"
                  style={{
                    background: "rgba(210,215,222,0.6)",
                    border: `1px solid rgba(20,23,28,0.15)`,
                    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      letterSpacing: "0.06em",
                      color: SAO.color.text.secondary,
                    }}
                  >
                    {message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-5" />
            )}

            {/* Actions */}
            <div className="relative flex items-end justify-around pb-6 pt-2">
              {/* Confirm — Blue O (Yes.svg) */}
              <button
                type="button"
                onClick={onConfirm}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden"
                  style={{
                    border: `2px solid ${SAO.color.action.blue}`,
                    boxShadow: `0 0 12px rgba(59,130,246,0.4)`,
                    background: "rgba(255,255,255,0.1)",
                  }}
                >
                  <img
                    src={SAO_ICON.yes}
                    alt="Yes"
                    width={40}
                    height={40}
                    style={{ display: "block" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<span style="font-size:1.5rem;font-weight:bold;color:#3b82f6">O</span>';
                    }}
                  />
                </div>
                <span
                  className="text-xs"
                  style={{ letterSpacing: "0.14em", color: SAO.color.text.secondary }}
                >
                  {confirmLabel}
                </span>
              </button>

              {/* Cancel — Pink X (No.svg) */}
              <button
                type="button"
                onClick={onCancel}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden"
                  style={{
                    border: `2px solid ${SAO.color.action.red}`,
                    boxShadow: `0 0 12px rgba(224,62,99,0.4)`,
                    background: "rgba(255,255,255,0.1)",
                  }}
                >
                  <img
                    src={SAO_ICON.no}
                    alt="No"
                    width={40}
                    height={40}
                    style={{ display: "block" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<span style="font-size:1.5rem;font-weight:bold;color:#e03e63">X</span>';
                    }}
                  />
                </div>
                <span
                  className="text-xs"
                  style={{ letterSpacing: "0.14em", color: SAO.color.text.secondary }}
                >
                  {cancelLabel}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
