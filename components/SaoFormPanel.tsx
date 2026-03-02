"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

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

  const inputStyle = {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(140,155,175,0.5)",
    borderRadius: "2px",
    color: "#3f4550",
    fontSize: "13px",
    letterSpacing: "0.04em",
    padding: "8px 12px",
    width: "100%",
    outline: "none",
  } as const;

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    letterSpacing: "0.2em",
    color: "#5a6272",
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
                borderLeft: "1px solid rgba(203,211,221,0.4)",
                background:
                  "linear-gradient(180deg, rgba(238,241,245,0.99), rgba(223,228,236,0.98))",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Header */}
              <div
                className="relative flex items-center justify-between px-6 py-4"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(205,212,224,0.99), rgba(192,200,214,0.98))",
                  borderBottom: "1px solid rgba(160,172,190,0.4)",
                }}
              >
                <p className="text-sm font-bold tracking-[0.18em] text-zinc-700 uppercase">
                  {title}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-600/15 hover:text-zinc-700"
                >
                  <span className="text-base font-bold leading-none">×</span>
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmitClick}
                className="relative flex flex-1 flex-col gap-0 overflow-y-auto p-6"
              >
                <div className="space-y-5 flex-1">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      {field.type === "textarea" ? (
                        <textarea
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={3}
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          required={field.required}
                          style={inputStyle}
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
                          placeholder={field.placeholder}
                          required={field.required}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-sm py-2.5 text-sm font-bold tracking-[0.16em] uppercase transition-opacity"
                    style={{
                      background:
                        "linear-gradient(150deg, rgba(248,197,78,0.95), rgba(234,168,40,0.95))",
                      color: "#2a2008",
                      boxShadow: "0 3px 12px rgba(248,197,78,0.35)",
                    }}
                  >
                    {submitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-sm px-5 py-2.5 text-sm font-medium tracking-[0.12em] uppercase"
                    style={{
                      background: "rgba(160,170,185,0.2)",
                      border: "1px solid rgba(140,155,175,0.4)",
                      color: "#5a6272",
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
