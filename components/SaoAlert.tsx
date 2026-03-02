"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

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
            backdropFilter: "blur(4px)",
            background: "rgba(5,7,10,0.7)",
          }}
          onClick={onCancel}
        >
          <motion.div
            key="sao-alert-panel"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative overflow-hidden rounded-sm"
            style={{
              width: 340,
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.2)",
              background:
                "linear-gradient(180deg, rgba(232,236,243,0.99), rgba(215,221,232,0.98))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:20px_20px]" />

            {/* Header */}
            <div
              className="relative px-5 py-3.5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(205,212,224,0.99), rgba(192,200,214,0.98))",
                borderBottom: "1px solid rgba(160,172,190,0.45)",
              }}
            >
              <p className="text-center text-sm font-bold tracking-[0.18em] text-zinc-700 uppercase">
                {title}
              </p>
            </div>

            {/* Body */}
            {message ? (
              <div
                className="relative m-4 rounded-sm px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(160,172,190,0.35)",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.05)",
                }}
              >
                <p className="text-sm leading-relaxed tracking-[0.06em] text-zinc-700">
                  {message}
                </p>
              </div>
            ) : (
              <div className="h-4" />
            )}

            {/* Actions */}
            <div className="relative flex items-center justify-center gap-14 pb-6 pt-2">
              {/* Confirm — Blue O */}
              <button
                type="button"
                onClick={onConfirm}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(150deg, #60a5fa, #1d4ed8)",
                    boxShadow:
                      "0 4px 18px rgba(37,99,235,0.6), inset 0 1px 0 rgba(255,255,255,0.35)",
                  }}
                >
                  <span className="text-2xl font-bold leading-none text-white">O</span>
                </div>
                <span className="text-xs tracking-[0.14em] text-zinc-600">{confirmLabel}</span>
              </button>

              {/* Cancel — Pink X */}
              <button
                type="button"
                onClick={onCancel}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(150deg, #f9a8d4, #db2777)",
                    boxShadow:
                      "0 4px 18px rgba(219,39,119,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  <span className="text-2xl font-bold leading-none text-white">X</span>
                </div>
                <span className="text-xs tracking-[0.14em] text-zinc-600">{cancelLabel}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
