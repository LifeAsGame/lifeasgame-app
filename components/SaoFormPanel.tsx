"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { SAO, PANEL_STYLE, INPUT_STYLE, GOLD_BTN_STYLE, GRID_OVERLAY_STYLE } from "@/lib/design/tokens";

import SaoAlert from "./SaoAlert";

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
};

export type SaoFormPanelProps = {
  isOpen: boolean;
  title: string;
  fields: FieldConfig[];
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
  submitLabel?: string;
  confirmMessage?: string;
};

export default function SaoFormPanel({
  isOpen,
  title,
  fields,
  onSubmit,
  onClose,
  submitLabel = "Submit",
  confirmMessage,
}: SaoFormPanelProps) {
  const initialValues = () =>
    Object.fromEntries(fields.map((f) => [f.key, ""]));

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmMessage) {
      setShowConfirm(true);
    } else {
      onSubmit(values);
      setValues(initialValues());
      onClose();
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onSubmit(values);
    setValues(initialValues());
    onClose();
  };

  const getInputStyle = (key: string) => ({
    ...INPUT_STYLE,
    ...(focusedField === key
      ? { border: `1px solid ${SAO.color.border.gold}` }
      : {}),
  });

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    letterSpacing: "0.24em",
    color: SAO.color.text.label,
    marginBottom: "6px",
    textTransform: "uppercase" as const,
  };

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="sao-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-stretch justify-end"
            style={{
              zIndex: 999998,
              backdropFilter: "blur(3px)",
              background: "rgba(5,7,10,0.55)",
            }}
            onClick={onClose}
          >
            <motion.div
              key="sao-form-panel"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="relative flex flex-col overflow-hidden"
              style={{
                width: 360,
                ...PANEL_STYLE,
                borderRadius: 0,
                borderRight: "none",
                borderTop: "none",
                borderBottom: "none",
                borderLeft: `1px solid ${SAO.color.border.panel}`,
                boxShadow: `-8px 0 32px rgba(0,0,0,0.3), ${SAO.shadow.panelInset}`,
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
                  borderBottom: `1px solid rgba(20,23,28,0.3)`,
                }}
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 mb-2 transition-colors hover:opacity-70"
                  style={{ color: SAO.color.text.label, fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase" }}
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
                <p
                  className="font-semibold uppercase"
                  style={{ fontSize: "13px", letterSpacing: "0.18em", color: SAO.color.text.primary }}
                >
                  {title}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmitClick}
                className="relative flex flex-1 flex-col overflow-y-auto p-6"
              >
                <div className="space-y-5 flex-1">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      {field.type === "textarea" ? (
                        <textarea
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={3}
                          style={{
                            ...getInputStyle(field.key),
                            resize: "vertical",
                            minHeight: "72px",
                          }}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          required={field.required}
                          style={getInputStyle(field.key)}
                        >
                          <option value="">Select…</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          onFocus={() => setFocusedField(field.key)}
                          onBlur={() => setFocusedField(null)}
                          placeholder={field.placeholder}
                          required={field.required}
                          style={getInputStyle(field.key)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 transition-opacity active:scale-[0.98]"
                    style={{
                      ...GOLD_BTN_STYLE,
                      padding: "10px 0",
                      fontSize: "0.8rem",
                      width: "100%",
                    }}
                  >
                    {submitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-sm px-5 text-sm font-medium tracking-[0.12em] uppercase transition-colors hover:bg-zinc-500/10"
                    style={{
                      background: "rgba(160,170,185,0.2)",
                      border: `1px solid rgba(140,155,175,0.4)`,
                      color: SAO.color.text.secondary,
                      borderRadius: SAO.radius.input,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SaoAlert
        isOpen={showConfirm}
        title="Confirm"
        message={confirmMessage}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
